import { z } from "zod";
import { capturedForOrder, validSignature } from "@/lib/verification";
import { getOrder, handleError, HttpError, input, paymentId, paymentSchema, paymentsReady, providerOrderId, rateLimit, razorpay, receiptSchema, respond } from "@/lib/server/services";
const schema = receiptSchema.extend({ razorpay_order_id: providerOrderId, razorpay_payment_id: paymentId, razorpay_signature: z.string().regex(/^[0-9a-f]{64}$/i) }).strict();
export async function POST(req: Request) {
    try {
        const reply = await input(req, schema);
        paymentsReady();
        await rateLimit(req, "verification", 30, 60);
        const order = await getOrder(reply);
        const providerId = order.provider_order_id;
        if (providerId !== reply.razorpay_order_id || !validSignature(process.env.RAZORPAY_KEY_SECRET!, providerId + "|" + reply.razorpay_payment_id, reply.razorpay_signature))
            throw new HttpError(400, "Payment verification failed.");
        const payment = paymentSchema.parse(await razorpay("payments/" + reply.razorpay_payment_id));
        if (!capturedForOrder(payment, providerId, reply.razorpay_payment_id))
            return respond({ status: "awaiting_capture" }, 202);
        return respond({ status: "awaiting_webhook" }, 202);
    }
    catch (error) {
        return handleError(error);
    }
}
