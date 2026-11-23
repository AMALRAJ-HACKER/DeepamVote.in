import { getOrder, handleError, input, paymentsReady, rateLimit, receiptSchema, respond } from "@/lib/server/services";
export async function POST(req: Request) {
    try {
        const receipt = await input(req, receiptSchema.strict());
        paymentsReady();
        await rateLimit(req, "receipt", 120, 60);
        const order = await getOrder(receipt);
        return respond(order.status === "confirmed" ? { status: "confirmed", choice: order.choice, confirmedAt: order.confirmed_at } : { status: order.status });
    }
    catch (error) {
        return handleError(error);
    }
}
