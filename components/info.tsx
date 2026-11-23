import { BookOpen, Check, ChevronDown, HandHeart, ListChecks, Scale } from "lucide-react";
import { refundTerms } from "@/lib/shared";
export function InfoCards() {
    return <div className="info-grid"><article className="info-card surface"><div className="icon-box"><BookOpen /></div><h3>About This Vote</h3><p>Karthigai Deepam is a Tamil festival of lamps. This vote invites opinions on lighting the Deepam at Thiruparankundram, subject to law, safety requirements and the decisions of relevant authorities.</p><a className="text-link" href="/about">Explore the background</a></article>
    <article className="info-card surface"><div className="icon-box"><ListChecks /></div><h3>How It Works</h3><ol className="steps">{["Select YES or NO.", "Review the ₹10 participation fee.", "Complete secure payment.", "See your verified vote in the results."].map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}</ol></article>
    <article className="info-card surface"><div className="icon-box"><HandHeart /></div><h3>Fair &amp; Inclusive</h3><ul className="checks">{["Open to all beliefs and backgrounds", "Respect for every community", "No harassment or hate speech", "Transparent paid participation"].map(s => <li key={s}><Check size={14}/>{s}</li>)}</ul><p className="small">Results reflect paying participants only.</p></article></div>;
}
export function Transparency() {
    const items = [
        ["Participation fees and gross receipts", "Each confirmed YES or NO order carries the same ₹10 platform fee. The gross figure above is the number of confirmed orders multiplied by ₹10, before deductions or refunds."],
        ["Processing charges and operating costs", "Razorpay charges, hosting, maintenance and other operating expenses are separate from gross receipts. The displayed figure measures revenue before these costs. No share is earmarked for donations or advocacy."],
        ["Refunds and cancellations", refundTerms + " Keep your receipt reference for any enquiry."],
        ["Verification and repeat participation", "A signed Razorpay webhook and a server-side capture check confirm each order. A unique database constraint allows one vote per paid order. People may participate more than once through separate payments. Results are a count of paid responses."]
    ];
    return <section className="transparency"><div><div className="eyebrow plain"><Scale size={16}/> PARTICIPATION TERMS</div><h2>Platform transparency</h2><p>How fees, verification and repeat participation work.</p></div><div className="disclosures">{items.map(([title, body]) => <details key={title}><summary>{title}<ChevronDown size={17}/></summary><p>{body}</p></details>)}</div></section>;
}
