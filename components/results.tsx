"use client";
import { useCallback, useEffect, useState } from "react";
import { Activity, ChartNoAxesColumnIncreasing, CircleCheck, CircleX, Clock3, IndianRupee, UsersRound } from "lucide-react";
import { numberIN, type Results } from "@/lib/shared";
export function PublicResults({ initial }: {
    initial: Results;
}) {
    const [data, setData] = useState(initial);
    const refresh = useCallback(async (signal?: AbortSignal) => {
        try {
            const response = await fetch("/api/results", { cache: "no-store", signal });
            if (!response.ok)
                throw new Error();
            const value: Results = await response.json();
            if (!signal?.aborted)
                setData(value);
        }
        catch {
            if (!signal?.aborted)
                setData({ mode: "unavailable", stats: null });
        }
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        const update = () => { if (!document.hidden)
            void refresh(controller.signal); };
        const timer = setInterval(update, 30000);
        document.addEventListener("visibilitychange", update);
        window.addEventListener("vote-confirmed", update);
        return () => { clearInterval(timer); controller.abort(); document.removeEventListener("visibilitychange", update); window.removeEventListener("vote-confirmed", update); };
    }, [refresh]);
    const s = data.stats;
    const yes = s && s.total ? Math.round(1000 * s.yes / s.total) / 10 : 0;
    const no = s && s.total ? Math.round((100 - yes) * 10) / 10 : 0;
    const metrics = [
        { icon: UsersRound, label: "Total Paid Votes", value: s && numberIN(s.total), color: "gold" },
        { icon: CircleCheck, label: "YES Votes", value: s && numberIN(s.yes), color: "green" },
        { icon: CircleX, label: "NO Votes", value: s && numberIN(s.no), color: "red" },
        { icon: IndianRupee, label: "Gross Participation Fees", value: s && "₹" + numberIN(s.gross), color: "gold" }
    ];
    const stamp = s?.updated ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(s.updated)) + " IST" : null;
    return <section id="results" className="results surface" aria-labelledby="results-heading">
    <div className="results-heading"><div className="section-title"><div className="icon-box"><ChartNoAxesColumnIncreasing /></div><h2 id="results-heading">Public Results</h2></div>
      <span className="status"><Activity size={14}/>{data.mode === "setup" ? "Setup mode" : data.mode === "unavailable" ? "Results unavailable" : data.mode === "test" ? "DEMO DATA — NOT REAL VOTES" : "Verified totals"}</span></div>
    <div className="metric-grid">{metrics.map(({ icon: Icon, label, value, color }) => <div className="metric" key={label}><div className={'metric-label ' + color}><Icon size={16}/><span>{label}</span></div><strong>{value ?? "—"}</strong></div>)}</div>
    <div className="breakdown"><div className="percent-label"><span><i className="dot yes-dot"/>YES <b>{s ? yes + "%" : "—"}</b></span><span><b>{s ? no + "%" : "—"}</b> NO<i className="dot no-dot"/></span></div>
    <div className="bar" aria-label="Distribution of confirmed votes"><span style={{ width: yes + "%" }}/><span style={{ width: no + "%" }}/></div></div>
    <div className="results-foot"><span><Clock3 size={13}/>Last updated · {stamp ?? (s ? "Awaiting first vote" : "Unavailable")}</span>
    <span>{data.mode === "setup" ? "Vote ledger awaiting connection" : data.mode === "unavailable" ? "Connection interrupted · retrying" : "Refreshes every 30 seconds"}</span></div>
  </section>;
}
