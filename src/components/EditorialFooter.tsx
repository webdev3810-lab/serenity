"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ClipboardList, Heart, House, Leaf, LifeBuoy, Sparkles, Users } from "lucide-react";
import { useContactSettings } from "@/src/context/ContactSettingsContext";
import { DEFAULT_CONTACT_SETTINGS } from "@/src/lib/siteSettings";

export function EditorialFooter({ draft = false }: { draft?: boolean }) {
  const contact = useContactSettings() ?? DEFAULT_CONTACT_SETTINGS;
  const phoneHref = `tel:${contact.phoneNumber.replace(/[^+\d]/g, "")}`;

  return (
    <footer className={`serenity-editorial-footer${draft ? " serenity-editorial-footer--draft" : ""}`}>
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
        <div className="serenity-editorial-footer__brand">
          <Link href="/" className="serenity-editorial-footer__brand-link" aria-label="Serenity Corporate Bookings home">
            <Image src="/LOGO.png" alt="" width={1248} height={642} sizes="72px" />
            <span><strong>SERENITY</strong><small>CORPORATE BOOKINGS</small></span>
          </Link>
          <p>Furnished homes for the moments that bring you to Pakenham.</p>
          <Link href="/homes" className="serenity-editorial-footer__brand-cta">Explore our homes <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <div>
          <h2>Stay</h2>
          <Link href="/homes">All homes</Link>
          <Link href="/properties/serenity-7">Serenity 7</Link>
          <Link href="/properties/serenity-9">Serenity 9</Link>
          <Link href="/properties/serenity-11">Serenity 11</Link>
        </div>
        <div>
          <h2>Discover</h2>
          <Link href="/about">About</Link>
          <Link href="/corporate-stays">Corporate bookings</Link>
          <Link href="/long-term-stays">Long-term stays</Link>
          <Link href="/other-businesses">Other businesses</Link>
        </div>
        <div>
          <h2>Visit</h2>
          {contact.contactPublished && <>
            {contact.publicAddress && <p>{contact.publicAddress}</p>}
            <a href={phoneHref}>{contact.phoneNumber}</a>
            <a href={`mailto:${contact.contactEmail}`}>{contact.contactEmail}</a>
          </>}
          <Link href="/contact">Get in touch</Link>
        </div>
        <div>
          <h2>Information</h2>
          <Link href="/guest-information">Guest information</Link>
          <Link href="/guest-information#self-check-in">Arrival &amp; check-in</Link>
          <Link href="/guest-information#house-rules">House rules</Link>
          <Link href="/guest-information#cancellations">Stay policies</Link>
          <Link href="/admin">Admin login</Link>
        </div>
      </div>
      <div className="serenity-editorial-footer__values" aria-label="Serenity stay values">
        <span><House size={18} aria-hidden="true" /> Professional stays</span>
        <span><Heart size={18} aria-hidden="true" /> Comfortable homes</span>
        <span><Sparkles size={18} aria-hidden="true" /> Trusted service</span>
        <span><Leaf size={18} aria-hidden="true" /> A brighter tomorrow</span>
      </div>
      <div className="serenity-editorial-footer__legal">
        <p>© {new Date().getFullYear()} {contact.businessName}</p>
        {contact.contactPublished && contact.publicAddress && <p>{contact.publicAddress}</p>}
      </div>
    </footer>
  );
}
