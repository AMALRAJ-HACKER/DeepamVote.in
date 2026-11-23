import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Results } from "@/lib/shared";
import { digest, validSignature } from "@/lib/verification";
export const paymentMode = () => process.env.PAYMENT_MODE === "live" ? "live" as const : "test" as const;
export function checkoutMode() {
    const mode = paymentMode();
    return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY &&
        process.env.RAZORPAY_KEY_ID?.startsWith("rzp_" + mode + "_") && process.env.RAZORPAY_KEY_SECRET &&
        process.env.RAZORPAY_WEBHOOK_SECRET && (process.env.RECEIPT_SECRET?.length ?? 0) >= 32 &&
        (mode === "test" || process.env.CONTACT_EMAIL) ? mode : "setup" as const;
}
export function database() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
        throw new HttpError(503, "Vote ledger awaiting configuration.");
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}
const counts = z.object({ yes: z.number().int().nonnegative(), no: z.number().int().nonnegative(), total: z.number().int().nonnegative(), gross: z.number().int().nonnegative(), updated: z.string().nullable() });
export async function readResults(): Promise<Results> {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
        return { mode: "setup", stats: null };
    try {
        const { data, error } = await database().rpc("participation_stats", { p_mode: paymentMode() }).abortSignal(AbortSignal.timeout(4500)).single();
        if (error)
            throw error;
        return { mode: paymentMode(), stats: counts.parse(data) };
    }
    catch {
        return { mode: "unavailable", stats: null };
    }
}
export class HttpError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
}
export const respond = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", ...(status === 429 ? { "Retry-After": "60" } : {}) } });
export function handleError(error: unknown) {
    if (error instanceof HttpError)
        return respond({ error: error.message }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError)
        return respond({ error: "Invalid request." }, 400);
    return respond({ error: "Service temporarily unavailable. Please try again." }, 503);
}
export async function rawBody(req: Request, limit: number): Promise<Buffer> {
    if (Number(req.headers.get("content-length")) > limit)
        throw new HttpError(413, "Request too large.");
    const reader = req.body?.getReader();
    if (!reader)
        throw new HttpError(400, "Missing request.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        size += value.byteLength;
        if (size > limit) {
            await reader.cancel();
            throw new HttpError(413, "Request too large.");
        }
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}
export async function input<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
    if (req.headers.get("origin") !== new URL(req.url).origin)
        throw new HttpError(403, "Origin could not be verified.");
    if (!req.headers.get("content-type")?.startsWith("application/json"))
        throw new HttpError(415, "JSON required.");
    return schema.parse(JSON.parse((await rawBody(req, 4096)).toString("utf8")));
}
export function paymentsReady() {
    if (checkoutMode() === "setup")
        throw new HttpError(503, "Checkout is awaiting configuration.");
}
export async function rateLimit(req: Request, scope: string, limit: number, seconds: number) {
    // Vercel supplies its own trusted IP header. Other hosts share a conservative bucket.
    const ip = process.env.VERCEL === "1" ? req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() : "local";
    const key = digest(process.env.RECEIPT_SECRET!, scope + "|" + (ip || "unknown"));
    const { data, error } = await database().rpc("take_request_slot", { p_key: key, p_limit: limit, p_seconds: seconds });
    if (error)
        throw error;
    if (!data)
        throw new HttpError(429, "Too many requests. Please try again later.");
}
export const receiptSchema = z.object({ id: z.string().uuid(), token: z.string().regex(/^[a-f0-9]{64}$/) });
export const receiptToken = (id: string) => digest(process.env.RECEIPT_SECRET!, "receipt|" + id);
export async function getOrder(receipt: z.infer<typeof receiptSchema>) {
    if (!validSignature(process.env.RECEIPT_SECRET!, "receipt|" + receipt.id, receipt.token))
        throw new HttpError(404, "Receipt unavailable.");
    const { data, error } = await database().from("payment_orders").select("id,provider_order_id,status,choice,confirmed_at").eq("id", receipt.id).eq("mode", paymentMode()).maybeSingle();
    if (error)
        throw error;
    if (!data)
        throw new HttpError(404, "Receipt unavailable.");
    return data;
}
export async function razorpay(path: string, body?: object) {
    const credentials = Buffer.from(process.env.RAZORPAY_KEY_ID + ":" + process.env.RAZORPAY_KEY_SECRET).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/" + path, { method: body ? "POST" : "GET", headers: { Authorization: "Basic " + credentials, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok)
        throw new HttpError(503, "Payment provider temporarily unavailable.");
    return response.json();
}
export const paymentId = z.string().regex(/^pay_[a-zA-Z0-9]{1,64}$/);
export const providerOrderId = z.string().regex(/^order_[a-zA-Z0-9]{1,64}$/);
export const paymentSchema = z.object({ id: paymentId, order_id: providerOrderId, amount: z.number().int(), currency: z.string(), status: z.string(), captured: z.boolean().optional() });
