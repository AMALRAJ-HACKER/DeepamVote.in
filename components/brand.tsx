export function Lamp({ className = "" }: {
    className?: string;
}) {
    return <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M25.4 2.5c2.7 9.8 9.9 12.2 8.4 19.2-.8 4-4.5 7.2-9.4 7.3-6.2.1-10.3-4.3-9-10 1.3-5.1 7.7-9.8 10-16.5Z" fill="#ff9b25"/>
    <path d="M25.8 14.3c1.1 4.7 4.5 6.2 3.3 10-1.5 4.8-8.5 4.3-8.9.1-.3-3.8 3.7-6.8 5.6-10.1Z" fill="#ffe396"/>
    <path d="M3 28.1c10.2 4.1 28.6 4.7 42-.4-2.1 8.2-10.3 13.1-21.4 13.1S5.7 35.3 3 28.1Z" fill="#e99632"/>
    <path d="M5.3 28c10.4 2.5 26.4 3.3 37.5-.4M17 43.4h14" stroke="#ffcf74" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>;
}
export function Brand() {
    return <a className="brand" href="/" aria-label="DeepamVote.in home"><Lamp className="brand-lamp"/><span><b>DeepamVote<span>.in</span></b><small>People’s Voice for Karthigai Deepam</small></span></a>;
}
