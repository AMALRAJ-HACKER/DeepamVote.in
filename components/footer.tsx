import { Brand } from "./brand";
export function Contact() {
    const email = process.env.CONTACT_EMAIL;
    return email ? <a href={`mailto:${email}`}>{email}</a> : <span>Contact email pending publication.</span>;
}
export function Footer() {
    return <footer><div className="frame"><div className="foot-main"><Brand /><div className="foot-links"><a href="/about">About</a><a href="/about#privacy">Privacy</a><a href="/about#terms">Participation terms</a></div></div>
  <div className="foot-meta"><span>© {new Date().getFullYear()} DeepamVote.in · Independent public opinion platform</span><Contact /></div></div></footer>;
}
