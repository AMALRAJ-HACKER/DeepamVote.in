export type CheckoutReply = {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
};
type Options = {
    key: string;
    order_id: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    theme: {
        color: string;
    };
    handler: (reply: CheckoutReply) => void;
    modal: {
        ondismiss: () => void;
    };
    retry: {
        enabled: boolean;
    };
};
type Checkout = {
    open: () => void;
    on: (event: "payment.failed", handler: () => void) => void;
};
declare global {
    interface Window {
        Razorpay?: new (options: Options) => Checkout;
    }
}
let loading: Promise<void> | undefined;
export async function loadCheckout() {
    if (window.Razorpay)
        return;
    if (!loading)
        loading = new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            const fail = () => { clearTimeout(timer); script.remove(); loading = undefined; reject(new Error("Secure checkout could not load. Please try again.")); };
            const timer = setTimeout(fail, 15000);
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => { clearTimeout(timer); if (window.Razorpay)
                resolve();
            else
                fail(); };
            script.onerror = fail;
            document.head.appendChild(script);
        });
    return loading;
}
export async function post<T>(path: string, body: object): Promise<T> {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
        const info = await response.json().catch(() => null);
        throw new Error(info?.error || "Service temporarily unavailable. Please try again.");
    }
    return response.json();
}
