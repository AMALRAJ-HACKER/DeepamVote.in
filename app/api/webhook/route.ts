import { z } from "zod";
import { capturedForOrder, validSignature } from "@/lib/verification";
import { database, handleError, HttpError, paymentMode, paymentSchema, paymentsReady, rawBody, razorpay, respond } from "@/lib/server/services";
const envelope = z.object({ event: z.string(), payload: z.unknown() });
const payload = z.object({ payment: z.object({ entity: paymentSchema }) });
export async function POST(req: Request) {
    try {
        paymentsReady();
        const raw = await rawBody(req, 65536);
        if (!validSignature(process.env.RAZORPAY_WEBHOOK_SECRET!, raw, req.headers.get("x-razorpay-signature")))
            throw new HttpError(401, "Invalid webhook signature.");
        const event = envelope.parse(JSON.parse(raw.toString("utf8")));
        if (event.event !== "payment.captured" && event.event !== "payment.failed")
            return respond({ received: true });
        const eventId = z.string().min(1).max(160).parse(req.headers.get("x-razorpay-event-id"));
        // Other products on the same merchant account can emit payments without an order.
        const entity = z.object({ payment: z.object({ entity: z.object({ order_id: z.string().nullable().optional() }) }) }).parse(event.payload).payment.entity;
        if (!entity.order_id)
            return respond({ received: true });
        const db = database();
        const existing = await db.from("payment_orders").select("id").eq("provider_order_id", entity.order_id).eq("mode", paymentMode()).maybeSingle();
        if (existing.error)
            throw existing.error;
        if (!existing.data)
            return respond({ received: true });
        const p = payload.parse(event.payload).payment.entity;
        if (event.event === "payment.captured") {
            const remote = paymentSchema.parse(await razorpay("payments/" + p.id));
            if (!capturedForOrder(p, p.order_id, p.id) || !capturedForOrder(remote, p.order_id, p.id))
                throw new HttpError(503, "Capture could not be confirmed.");
        }
        const result = await db.rpc("apply_payment_event", { p_event: eventId, p_kind: event.event, p_order: p.order_id, p_payment: p.id, p_status: p.status, p_amount: p.amount, p_currency: p.currency, p_mode: paymentMode() });
        if (result.error)
            throw result.error;
        return respond({ received: true });
    }
    catch (error) {
        return handleError(error);
    }
}
