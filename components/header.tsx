"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChartNoAxesColumnIncreasing, Menu, X } from "lucide-react";
import { Brand } from "./brand";
export function Header() {
    const path = usePathname();
    const [open, setOpen] = useState(false);
    return <header className="header"><div className="frame nav-row">
    <Brand /><nav aria-label="Main" id="main-nav" className={open ? "nav open" : "nav"}>
      {["Home", "About"].map((name, i) => <a key={name} href={i ? "/about" : "/"} aria-current={path === (i ? "/about" : "/") ? "page" : undefined} onClick={() => setOpen(false)}>{name}</a>)}
    </nav>
    <div className="nav-actions"><a className="results-link" href="/#results"><ChartNoAxesColumnIncreasing size={16}/> View results</a><button className="hamburger" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div>
  </div></header>;
}
