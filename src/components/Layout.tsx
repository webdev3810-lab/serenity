"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { BookingProvider } from "@/src/context/BookingContext";
import { ContactSettingsProvider, useContactSettings } from "@/src/context/ContactSettingsContext";
import type { ContactSettings, PromoSettings } from "@/src/lib/siteSettings";
import PillNav, { type PillNavItem } from "@/src/components/PillNav";

const nav: PillNavItem[] = [
  { label: "Houses", href: "/houses" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Corporate Stays", href: "/corporate-stays" },
];

export function AppShell({ children, contactSettings, promoSettings }: { children: React.ReactNode; contactSettings: ContactSettings; promoSettings: PromoSettings }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return (
      <BookingProvider>
        <main className="min-h-screen bg-background">{children}</main>
      </BookingProvider>
    );
  }

  return (
    <ContactSettingsProvider settings={contactSettings}>
      <BookingProvider>
        <PromoBanner settings={promoSettings} />
        <Header pathname={pathname} />
        <main className="min-h-screen bg-background">{children}</main>
        <Footer pathname={pathname} />
      </BookingProvider>
    </ContactSettingsProvider>
  );
}

function PromoBanner({ settings }: { settings: PromoSettings }) {
  const [copied, setCopied] = useState(false);
  
  if (!settings.code) return null;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(settings.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="promotion-banner relative z-50 border-b border-[#4B4540] bg-[#1C1917] px-4 py-3 text-center text-[11px] font-semibold tracking-[0.08em] text-[#F7F4F1] sm:px-6 sm:text-xs" role="status">
      <span className="mr-2 inline-block font-black uppercase text-white">{settings.badge}</span>
      <span className="hidden sm:inline">{settings.message}</span>
      <span className="sm:hidden">{settings.mobileMessage}</span>
      <button 
        type="button"
        onClick={copyCode}
        title="Copy voucher code"
        className="ml-2 inline-flex min-w-[7.25rem] items-center justify-center gap-1.5 border border-[#A99B8E] bg-transparent px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.12em] text-white transition-colors hover:border-white hover:bg-white hover:text-[#1C1917] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <span>{copied ? "COPIED" : settings.code}</span>
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      {settings.remainingRedemptions !== null && settings.remainingRedemptions !== undefined && settings.remainingRedemptions <= 10 && <span className="ml-2 hidden text-[#D8CCC4] lg:inline">{settings.remainingRedemptions} left</span>}
    </div>
  );
}

function Header({ pathname }: { pathname: string | null }) {
  return <PillNav logo="/LOGO.png" logoAlt="Serenity Stays" items={nav} activeHref={pathname ?? undefined} className={pathname === "/" ? "pill-nav-header-home" : ""} />;
}

function Footer({ pathname }: { pathname: string | null }) {
  const settings = useContactSettings();
  const contact = settings;
  const isHousesPage = pathname === "/houses";
  const currentYear = new Date().getFullYear();
  const phoneHref = contact?.phoneNumber ? `tel:${contact.phoneNumber.replace(/[^+\d]/g, "")}` : "#";
  const emailHref = contact?.contactEmail ? `mailto:${contact.contactEmail}` : "#";
  const whatsappDigits = contact?.whatsappNumber.replace(/\D/g, "") ?? "";
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits.startsWith("0") ? `61${whatsappDigits.slice(1)}` : whatsappDigits}` : "#";
  const socialLinks = [
    ["Facebook", contact?.facebookUrl],
    ["Instagram", contact?.instagramUrl],
    ["LinkedIn", contact?.linkedinUrl],
  ].filter(([, href]) => href);

  return (
    <footer className="site-footer site-footer-editorial">
      <div className="site-footer-shell site-footer-intro">
        <div className="site-footer-intro-grid">
          <div>
            <p className="site-footer-kicker">Serenity Stays · Pakenham, Victoria</p>
            <h2>
              Stay close.<br />
              <em>Settle in.</em>
            </h2>
          </div>
          <div className="site-footer-intro-copy">
            <p>{contact?.footerText}</p>
            <div className="site-footer-actions">
              <Link href={isHousesPage ? "/corporate-stays" : "/houses"} className="site-footer-action site-footer-action-primary">
                {isHousesPage ? "Corporate stays" : "View the houses"} <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/contact" className="site-footer-action site-footer-action-secondary">
                Ask a question <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="site-footer-contact" aria-label="Contact details">
        <div className="site-footer-shell site-footer-contact-grid">
          {contact?.publicAddress && (
            <div>
              <span>Visit</span>
              {contact.directionsUrl ? <a href={contact.directionsUrl} target="_blank" rel="noopener noreferrer">{contact.publicAddress}</a> : <p>{contact.publicAddress}</p>}
            </div>
          )}
          {contact?.phoneNumber && (
            <div>
              <span>Call</span>
              <a href={phoneHref}>{contact.phoneNumber}</a>
            </div>
          )}
          {contact?.contactEmail && (
            <div>
              <span>Email</span>
              <a href={emailHref}>{contact.contactEmail}</a>
            </div>
          )}
          {contact?.businessHours && (
            <div>
              <span>Hours</span>
              <p>{contact.businessHours}</p>
            </div>
          )}
        </div>
      </div>

      <div className="site-footer-shell site-footer-directory">
        <div className="site-footer-directory-lead">
          <p className="site-footer-directory-mark">Three private homes.</p>
          <p>Furnished stays for families, project teams and longer visits—side by side in Pakenham.</p>
          <div className="site-footer-socials">
            {socialLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label}</a>)}
            {contact?.whatsappNumber && <a href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          </div>
        </div>

        <nav className="site-footer-nav" aria-label="Footer navigation">
          <div>
            <h3>Houses</h3>
            <ul>
              <li><Link href="/houses">All houses</Link></li>
              <li><Link href="/properties/serenity-7">Serenity 7</Link></li>
              <li><Link href="/properties/serenity-9">Serenity 9</Link></li>
              <li><Link href="/properties/serenity-11">Serenity 11</Link></li>
            </ul>
          </div>
          <div>
            <h3>Explore</h3>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/#faqs">FAQs</Link></li>
            </ul>
          </div>
          <div>
            <h3>Stays</h3>
            <ul>
              <li><Link href="/corporate-stays">Corporate stays</Link></li>
              <li><Link href="/long-term-stays">Long-term stays</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/admin/login">Admin portal</Link></li>
            </ul>
          </div>
          <div>
            <h3>Information</h3>
            <ul>
              <li><Link href="/terms">Terms &amp; conditions</Link></li>
              <li><Link href="/privacy">Privacy policy</Link></li>
              <li><Link href="/cancellation-policy">Cancellation policy</Link></li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="site-footer-wordmark" aria-hidden="true">
        <span>SERENITY</span>
      </div>

      <div className="site-footer-legal">
        <div className="site-footer-shell">
          <p>© {currentYear} {contact?.businessName}. All rights reserved.</p>
          <p>Australian stays · AUD pricing · Secure direct booking</p>
        </div>
      </div>
    </footer>
  );
}
