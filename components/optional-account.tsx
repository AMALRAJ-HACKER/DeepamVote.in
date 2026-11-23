"use client";
import { useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Button } from "./ui/button";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export function OptionalAccount() {
    const [client, setClient] = useState<SupabaseClient | null>(null);
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [sent, setSent] = useState(false);
    const [signed, setSigned] = useState(false);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!url || !key)
            return;
        const auth = createClient(url, key);
        setClient(auth);
        const { data } = auth.auth.onAuthStateChange((_event, session) => setSigned(!!session));
        return () => data.subscription.unsubscribe();
    }, []);
    if (!client)
        return null;
    return <section className="frame account surface"><h2>Optional account</h2><p>You can participate as a guest. Sign-in does not affect how a vote counts.</p>
    <form onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            try {
                const result = signed ? await client.auth.signOut() : sent ? await client.auth.verifyOtp({ email, token: code, type: "email" }) : await client.auth.signInWithOtp({ email });
                if (result.error)
                    throw new Error();
                if (signed || sent) {
                    setSent(false);
                    setCode("");
                }
                else {
                    setSent(true);
                    setMessage("Check your email for your sign-in code.");
                }
            }
            catch {
                setMessage("Sign-in request could not be completed. Please try again.");
            }
            finally {
                setBusy(false);
            }
        }}>
      {!signed && <label>{sent ? "Email verification code" : "Email address"}<input required type={sent ? "text" : "email"} autoComplete={sent ? "one-time-code" : "email"} value={sent ? code : email} onChange={e => (sent ? setCode : setEmail)(e.target.value)}/></label>}
      <Button disabled={busy}>{busy ? "Please wait…" : signed ? "Sign out" : sent ? "Verify code" : "Email me a code"}</Button>{sent && !signed && <button type="button" className="text-link" onClick={() => setSent(false)}>Change email</button>}
    </form><p role="status">{message}</p></section>;
}
