import { BookOpen, Flame, Landmark, MapPin, ShieldCheck, UsersRound } from "lucide-react";
import { VotePanel } from "@/components/vote-panel";
import { PublicResults } from "@/components/results";
import { InfoCards, Transparency } from "@/components/info";
import { readResults, checkoutMode } from "@/lib/server/services";
export const dynamic = "force-dynamic";
const principles = [{ icon: Flame, a: "Religious", b: "Freedom" }, { icon: Landmark, a: "Cultural", b: "Tradition" }, { icon: UsersRound, a: "People’s", b: "Voice" }, { icon: ShieldCheck, a: "Transparent", b: "Participation" }];
export default async function Home() {
    const results = await readResults();
    return <main id="main"><section className="hero"><div className="hero-image"/><div className="frame hero-grid">
  <div className="hero-copy"><div className="eyebrow"><Flame size={15}/> Karthigai Deepam <i /> A People’s Voice</div>
    <h1>Should people be<br className="desktop-break"/> allowed to light the <em>Karthigai Deepam</em> <span>at Thiruparankundram?</span></h1>
    <p className="intro">Share your opinion on the traditional lighting of Karthigai Deepam at Thiruparankundram. Everyone is welcome to participate, regardless of religion, caste, or background.</p>
    <div className="principles">{principles.map(({ icon: Icon, a, b }) => <div key={a}><Icon size={22}/><span>{a} <br />{b}</span></div>)}</div>
  </div><VotePanel mode={checkoutMode()}/>
  <div className="art-label"><MapPin size={12}/> South Indian hill temple · Illustration</div>
  </div></section>
  <div className="frame below"><PublicResults initial={results}/><section className="information"><div className="section-intro"><div className="eyebrow plain"><BookOpen size={15}/> PARTICIPATION GUIDE</div><h2>About the initiative</h2></div><InfoCards /></section><Transparency /></div></main>;
}
