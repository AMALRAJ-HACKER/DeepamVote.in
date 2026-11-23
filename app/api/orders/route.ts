import { randomUUID } from "node:crypto";
import { z } from "zod";
import { database, handleError, input, paymentsReady, paymentMode, providerOrderId, rateLimit, razorpay, receiptToken, respond } from "@/lib/server/services";
const schema = z.object({ choice: z.enum(["YES", "NO"]), terms: z.literal(true) }).strict();
export async function POST(req: Request) {
    try {
        const { choice } = await input(req, schema);
        paymentsReady();
        await rateLimit(req, "orders", 6, 600);
        const id = randomUUID();
        const order = z.object({ id: providerOrderId, amount: z.literal(1000), currency: z.literal("INR"), status: z.literal("created"), receipt: z.literal(id) }).parse(await razorpay("orders", { amount: 1000, currency: "INR", receipt: id }));
        const { error } = await database().from("payment_orders").insert({ id, provider_order_id: order.id, choice, terms_version: "1.0", mode: paymentMode() });
        if (error)
            throw error;
        return respond({ id, token: receiptToken(id), providerOrder: order.id, key: process.env.RAZORPAY_KEY_ID }, 201);
    }
    catch (error) {
        return handleError(error);
    }
}
