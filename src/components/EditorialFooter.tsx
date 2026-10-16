import Link from "next/link";
import { ArrowUpRight, ClipboardList, Heart, House, Leaf, LifeBuoy, Sparkles, Users } from "lucide-react";

export function EditorialFooter({ draft = false }: { draft?: boolean }) {
  return (
    <footer className={`serenity-editorial-footer${draft ? " serenity-editorial-footer--draft" : ""}`}>
      <div className="serenity-editorial-footer__values" aria-label="Serenity stay values">
        <span><House size={18} aria-hidden="true" /> Professional stays</span>
        <span><Heart size={18} aria-hidden="true" /> Comfortable homes</span>
        <span><Sparkles size={18} aria-hidden="true" /> Trusted service</span>
        <span><Leaf size={18} aria-hidden="true" /> A brighter tomorrow</span>
      </div>
      <section className="serenity-editorial-footer__support" aria-labelledby="site-footer-support-title">
        <div className="serenity-editorial-footer__support-icon"><Users size={38} strokeWidth={1.25} aria-hidden="true" /></div>
        <div className="serenity-editorial-footer__support-heading"><p>Thank you for choosing Serenity</p><h2 id="site-footer-support-title">We’re here to help throughout your stay.</h2></div>
        <p className="serenity-editorial-footer__support-copy">Questions before arrival or while you’re here? Our team is ready to help you feel at home.</p>
        <div className="serenity-editorial-footer__support-actions">
          <Link href="/contact"><LifeBuoy size={18} aria-hidden="true" /> Contact support <ArrowUpRight size={17} aria-hidden="true" /></Link>
          <Link href="/corporate-stays#corporate-booking"><ClipboardList size={18} aria-hidden="true" /> Partner booking enquiries <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>
      <div className="serenity-editorial-footer__grid">
        <div>
          <h2>Stay</h2>
          <Link href="/houses">All houses</Link>
          <Link href="/properties/serenity-7">Serenity 7</Link>
          <Link href="/properties/serenity-9">Serenity 9</Link>
          <Link href="/properties/serenity-11">Serenity 11</Link>
        </div>
        <div>
          <h2>Discover</h2>
          <Link href="/about">About</Link>
          <Link href="/corporate-stays">Corporate stays</Link>
          <Link href="/long-term-stays">Long-term stays</Link>
          <Link href="/other-businesses">Other businesses</Link>
        </div>
        <div>
          <h2>Visit</h2>
          <p>Pakenham, Victoria 3810<br />Australia</p>
          <Link href="/contact">Get in touch</Link>
        </div>
        <div>
          <h2>Information</h2>
          <Link href="/guest-information">Guest information</Link>
          <Link href="/guest-information#self-check-in">Arrival &amp; check-in</Link>
          <Link href="/guest-information#house-rules">House rules</Link>
          <Link href="/guest-information#cancellations">Stay policies</Link>
        </div>
      </div>
      <div className="serenity-editorial-footer__legal">
        <p>© {new Date().getFullYear()} Serenity on the Rocks</p>
        <p>Pakenham · Victoria · Australia</p>
      </div>
    </footer>
  );
}
