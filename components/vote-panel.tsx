"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { span as MotionSpan } from "framer-motion/client";
import { CircleCheck, CreditCard, Info, LoaderCircle, LockKeyhole, ScrollText, ShieldCheck, ThumbsDown, ThumbsUp, Vote, Wallet, X } from "lucide-react";
import { choices, refundTerms, type Choice } from "@/lib/shared";
import { loadCheckout, post, type CheckoutReply } from "@/lib/checkout";
import { Button } from "./ui/button";
type Receipt = {
    id: string;
    token: string;
};
type Mode = "setup" | "test" | "live";
type Confirmed = {
    status: "confirmed";
    choice: Choice;
    confirmedAt: string;
};
type Order = Receipt & {
    providerOrder: string;
    key: string;
};
const storeKey = "deepam-receipt-v1";
function remember(receipt: Receipt) {
    try {
        sessionStorage.setItem(storeKey, JSON.stringify(receipt));
    } catch {
        // Memory still holds the reference if session storage is unavailable.
    }
}

export function VotePanel({ mode }: {
    mode: Mode;
}) {
    const [choice, setChoice] = useState<Choice | null>(null);
    const [agreed, setAgreed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [checking, setChecking] = useState(false);
    const [message, setMessage] = useState("");
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
    const [watch, setWatch] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const dialog = useRef<HTMLDialogElement>(null);
    const choicesField = useRef<HTMLFieldSetElement>(null);
    const lock = useRef(false);
    const motionOff = useReducedMotion();
    useEffect(() => {
        // A visitor may have selected an option before the client bundle finished loading.
        const selected = choicesField.current?.querySelector<HTMLInputElement>("input:checked")?.value;
        if (selected === "YES" || selected === "NO") setChoice(selected);
        try {
            const item = JSON.parse(sessionStorage.getItem(storeKey) || "null");
            if (item?.id && item?.token) {
                setReceipt(item);
                setWatch(true);
            }
        }
        catch { /* No stored reference. */ }
    }, []);
    const check = useCallback(async (r: Receipt) => {
        setChecking(true);
        try {
            const data = await post<Confirmed | {
                status: "pending" | "failed";
            }>("/api/receipt", r);
            if (data.status === "confirmed") {
                setConfirmed(data);
                setWatch(false);
                setMessage("");
                window.dispatchEvent(new Event("vote-confirmed"));
            }
            else if (data.status === "failed") {
                setWatch(false);
                setMessage("Payment failed. Your vote has not been counted.");
            }
            else
                setMessage("Awaiting payment confirmation. Keep this reference and check again before making another payment.");
        }
        catch {
            setMessage("Receipt status is temporarily unavailable. Keep your reference and check again.");
        }
        finally {
            setChecking(false);
        }
    }, []);
    useEffect(() => {
        if (!watch || !receipt)
            return;
        let active = true;
        let timer: ReturnType<typeof setTimeout>;
        const poll = async (iteration: number) => {
            await check(receipt);
            if (!active) return;
            if (iteration >= 11) {
                setWatch(false);
                return;
            }
            timer = setTimeout(() => void poll(iteration + 1), 5000);
        };
        void poll(0);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [watch, receipt, check]);

    function review() {
        if (!choice) return;
        setAgreed(false);
        setMessage("");
        const confirmation = dialog.current;
        if (!confirmation) return;
        if (typeof confirmation.showModal === "function") confirmation.showModal();
        else confirmation.setAttribute("open", "");
        setReviewOpen(true);
    }

    function close() {
        const confirmation = dialog.current;
        if (typeof confirmation?.close === "function") confirmation.close();
        else confirmation?.removeAttribute("open");
        setReviewOpen(false);
    }

    function clear() {
        try {
            sessionStorage.removeItem(storeKey);
        } catch {
            // Storage may be unavailable in a private browsing context.
        }
        setWatch(false);
        setReceipt(null);
        setChoice(null);
        setConfirmed(null);
        setMessage("");
    }

    async function pay() {
        if (!choice || !agreed || lock.current || mode === "setup")
            return;
        lock.current = true;
        setBusy(true);
        setMessage("");
        try {
            await loadCheckout();
            const order = await post<Order>("/api/orders", { choice, terms: true });
            const reference = { id: order.id, token: order.token };
            setReceipt(reference);
            remember(reference);
            const done = () => { lock.current = false; setBusy(false); };
            const verify = async (reply: CheckoutReply) => {
                try {
                    await post("/api/verify", { ...reference, ...reply });
                }
                catch {
                    setMessage("Checking the payment with the provider.");
                }
                done();
                setWatch(true);
            };
            const checkout = new window.Razorpay!({
                key: order.key,
                order_id: order.providerOrder,
                amount: 1000,
                currency: "INR",
                name: "DeepamVote.in",
                description: "One participation fee",
                theme: { color: "#c98920" },
                retry: { enabled: false },
                handler: reply => void verify(reply),
                modal: {
                    ondismiss() {
                        done();
                        setMessage("Checkout closed. Check your receipt if a payment was attempted.");
                    }
                }
            });
            checkout.on("payment.failed", () => {
                done();
                setMessage("Payment attempt failed. Check your receipt before starting again.");
            });
            close();
            checkout.open();
        }
        catch (error) {
            setBusy(false);
            lock.current = false;
            setMessage(error instanceof Error ? error.message : "Unable to open checkout.");
        }
    }
    return <section id="vote" className="vote-panel" aria-labelledby="vote-title">
    <div className="panel-heading"><div className="ballot-icon"><Vote size={29} strokeWidth={1.6}/></div><h2 id="vote-title">{confirmed ? "Vote Confirmed" : "Cast Your Vote"}</h2></div>
    {confirmed && receipt ? <div className="receipt"><CircleCheck className="green" size={36}/><h3>{mode === "test" ? "Test receipt" : "Payment receipt"}</h3><p>Your {confirmed.choice} response has been recorded. Fee confirmed · ₹10.</p><p>{new Date(confirmed.confirmedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p><code>{receipt.id}</code><a className="text-link" href="#results">View public results</a><Button onClick={clear}>Start a new participation</Button></div> :
            receipt && !reviewOpen ? <div className="receipt"><ScrollText size={30}/><h3>Payment receipt</h3><p role="status">{message || "Checking your order…"}</p><code>{receipt.id}</code><Button disabled={checking || busy} onClick={() => void check(receipt)}>{checking ? <LoaderCircle className="spin"/> : <ShieldCheck />}Check payment status</Button><button className="text-link" disabled={checking || busy} onClick={clear}>Start a separate order</button></div> :
                <><p className="panel-desc">Choose your opinion and contribute ₹10 to submit your response.</p>
    <fieldset ref={choicesField} className="choices">
      <legend className="sr-only">Choose your opinion</legend>
      {(["YES", "NO"] as const).map(value => {
        const Icon = value === "YES" ? ThumbsUp : ThumbsDown;
        const selected = choice === value;
        const id = `opinion-${value.toLowerCase()}`;
        return (
          <label key={value} htmlFor={id} className={`option ${value.toLowerCase()}${selected ? " chosen" : ""}`}>
            <MotionSpan className="choice-icon" initial={false}
              animate={{ scale: selected && !motionOff ? 1.06 : 1 }} transition={{ duration: 0.15 }}>
              <Icon size={21}/>
            </MotionSpan>
            <span className="option-copy"><strong>{value}</strong><small>{choices[value]}</small></span>
            <input id={id} type="radio" name="opinion" value={value}
              onChange={() => setChoice(value)}/>
          </label>
        );
      })}
    </fieldset><div className="fee"><span><Wallet size={16}/>Participation Fee</span><strong>₹10 <small>/ vote</small></strong></div>
    <Button className="pay-button" disabled={!choice || busy} onClick={review}><LockKeyhole size={16}/>Continue to Pay ₹10</Button>
    <div className="secure-note"><ShieldCheck size={13}/> {mode === "setup" ? "Setup mode · Payment collection is unavailable" : "Secure checkout via Razorpay"}</div></>}
    <dialog aria-labelledby="review-title" ref={dialog} className="review-dialog" onCancel={e => { if (busy)
        e.preventDefault(); }} onClose={() => setReviewOpen(false)}>
      <div className="dialog-top"><div className="icon-box"><CreditCard /></div><button aria-label="Close confirmation" disabled={busy} onClick={close}><X size={20}/></button></div>
      <h2 id="review-title">Review your vote</h2><p className="review-line">Your opinion <strong className={choice === "YES" ? "green" : "red"}>{choice}</strong></p><p className="review-line">Participation fee <strong>₹10</strong></p>
      <ul className="terms-list"><li>The ₹10 fee is platform revenue, not a charitable donation.</li><li>This independent opinion website is not an official government referendum.</li><li>Paid responses are self-selected. The results are not a statistically representative survey.</li><li>Participation does not guarantee influence over any official decision. Separate paid orders may come from the same person.</li><li>{refundTerms}</li></ul>
      <label className="consent"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}/>I understand and agree to the participation terms.</label>
      {mode !== "live" && <p className="mode-note"><Info size={16}/>{mode === "setup" ? "Checkout is awaiting configuration. Payments are currently unavailable." : "Razorpay test mode. No real money will be collected."}</p>}
      <p role="status" className="error-text">{message}</p><Button disabled={!agreed || busy || mode === "setup"} onClick={() => void pay()}>{busy ? <LoaderCircle className="spin"/> : <LockKeyhole size={16}/>} {busy ? "Opening secure checkout…" : "Pay ₹10 with Razorpay"}</Button>
    </dialog>
  </section>;
}
