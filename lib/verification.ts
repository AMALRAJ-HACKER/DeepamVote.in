import { createHmac, timingSafeEqual } from "node:crypto";
export function digest(key: string, value: string | Buffer): string {
    return createHmac("sha256", key).update(value).digest("hex");
}
export function validSignature(key: string, value: string | Buffer, supplied: string | null): boolean {
    if (!supplied || !/^[0-9a-f]{64}$/i.test(supplied))
        return false;
    return timingSafeEqual(Buffer.from(digest(key, value), "hex"), Buffer.from(supplied, "hex"));
}
type Payment = {
    id: string;
    order_id: string;
    amount: number;
    currency: string;
    status: string;
    captured?: boolean;
};
export function capturedForOrder(payment: Payment, orderId: string, paymentId: string) {
    return payment.id === paymentId && payment.order_id === orderId && payment.amount === 1000 && payment.currency === "INR" && payment.status === "captured" && payment.captured === true;
}
