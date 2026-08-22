"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Check, Copy, Mail, Phone, ShieldCheck } from "lucide-react";
import { BookingProvider } from "@/src/context/BookingContext";
import { ContactSettingsProvider, useContactSettings } from "@/src/context/ContactSettingsContext";
import type { ContactSettings, PromoSettings } from "@/src/lib/siteSettings";
import PillNav, { type PillNavItem } from "@/src/components/PillNav";

const nav: PillNavItem[] = [
  { label: "Houses", href: "/houses" },
  { label: "About", href: "/about" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
  { label: "Location", href: "/location" },
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
        <Footer />
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
  return <PillNav logo="/LOGO.png" logoAlt="Serenity Stays" items={nav} activeHref={pathname ?? undefined} />;
}

function Footer() {
  const settings = useContactSettings();
  const contact = settings;
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
    <footer className="site-footer border-t border-stone-200 bg-[#F7F4F1] text-stone-800 overflow-hidden">
      {/* Top CTA & Link Grid */}
      <div className="mx-auto w-full max-w-[96rem] px-4 pt-16 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Top CTA Area */}
          <div className="lg:col-span-4 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="eyebrow text-[#B88A5A]">Get in Touch</span>
              <h2 className="text-3xl font-extrabold text-stone-900 tracking-normal sm:text-4xl">
                Let our team help you.
              </h2>
              <p className="text-xs sm:text-sm text-stone-600">{contact?.footerText}</p>
              <div className="pt-2">
                <Link
                  href="/contact"
                  className="btn-dark-primary inline-flex items-center gap-3 rounded-none px-6 py-3 text-sm font-semibold"
                  aria-label="Contact Serenity team"
                >
                  <span>Contact us today</span>
                  <span className="btn-arrow-circle h-7 w-7">
                    <ArrowUpRight size={16} />
                  </span>
                </Link>
              </div>
            </div>

            {/* Direct Contact Details */}
            <div className="pt-6 border-t border-stone-300 space-y-2 text-xs text-stone-600">
              {contact?.publicAddress && <p className="font-semibold text-stone-900">{contact.publicAddress}</p>}
              {contact?.businessHours && <p>{contact.businessHours}</p>}
              <p className="flex items-center gap-2">
                <Phone size={14} className="text-[#B88A5A]" />
                <a href={phoneHref} className="hover:text-[#5A463A] transition-colors">{contact?.phoneNumber}</a>
              </p>
              <p className="flex items-center gap-2">
                <Mail size={14} className="text-[#B88A5A]" />
                <a href={emailHref} className="break-words hover:text-[#5A463A] transition-colors">{contact?.contactEmail}</a>
              </p>
              {contact?.whatsappNumber && <p className="flex items-center gap-2"><a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:text-[#5A463A] transition-colors">WhatsApp: {contact.whatsappNumber}</a></p>}
              {contact?.directionsUrl && <p><a href={contact.directionsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#5A463A] transition-colors">Get directions</a></p>}
              {socialLinks.length > 0 && <div className="flex flex-wrap gap-3 pt-2">{socialLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-[#5A463A]">{label}</a>)}</div>}
            </div>
          </div>

          {/* Right Link Columns */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {/* Column 1: Houses */}
            <div className="space-y-4 text-sm">
              <h3 className="text-base font-bold text-stone-900">Houses</h3>
              <ul className="space-y-2.5 text-stone-600 text-xs sm:text-sm">
                <li>
                  <Link href="/houses" className="hover:text-[#5A463A] transition-colors">
                    Browse Houses
                  </Link>
                </li>
                <li>
                  <Link href="/properties/serenity-7" className="hover:text-[#5A463A] transition-colors">
                    Serenity 7
                  </Link>
                </li>
                <li>
                  <Link href="/properties/serenity-9" className="hover:text-[#5A463A] transition-colors">
                    Serenity 9
                  </Link>
                </li>
                <li>
                  <Link href="/properties/serenity-11" className="hover:text-[#5A463A] transition-colors">
                    Serenity 11
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: About */}
            <div className="space-y-4 text-sm">
              <h3 className="text-base font-bold text-stone-900">About</h3>
              <ul className="space-y-2.5 text-stone-600 text-xs sm:text-sm">
                <li>
                  <Link href="/about" className="hover:text-[#5A463A] transition-colors">
                    About Serenity
                  </Link>
                </li>
                <li>
                  <Link href="/#faqs" className="hover:text-[#5A463A] transition-colors">
                    FAQs
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-[#5A463A] transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/admin/login" className="text-stone-500 hover:text-stone-900 transition-colors">
                    Admin Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Corporate */}
            <div className="space-y-4 text-sm">
              <h3 className="text-base font-bold text-stone-900">Corporate</h3>
              <ul className="space-y-2.5 text-stone-600 text-xs sm:text-sm">
                <li>
                  <Link href="/corporate-stays" className="hover:text-[#5A463A] transition-colors">
                    Corporate Stays
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-[#5A463A] transition-colors">
                    Corporate Enquiry
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Quick Links */}
            <div className="space-y-4 text-sm">
              <h3 className="text-base font-bold text-stone-900">Quick Links</h3>
              <ul className="space-y-2.5 text-stone-600 text-xs sm:text-sm">
                <li>
                  <Link href="/terms" className="hover:text-[#5A463A] transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-[#5A463A] transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/cancellation-policy" className="hover:text-[#5A463A] transition-colors">
                    Cancellation Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Huge Oversized SERENITY Wordmark */}
      <div className="w-full overflow-hidden select-none border-t border-stone-300 pt-6 pb-2 text-center leading-none">
        <span className="display-font block w-full text-center text-[13vw] sm:text-[14.5vw] font-black leading-none tracking-normal text-[#D2C0B4] uppercase opacity-95">
          SERENITY
        </span>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-stone-200 bg-white px-4 py-5 text-center text-xs text-stone-600">
        <div className="mx-auto max-w-[96rem] flex flex-col sm:flex-row items-center justify-between gap-3 px-4">
          <p>{contact?.businessName} Australia, 2026. All rights reserved. Prices shown in AUD.</p>
          <p className="flex items-center gap-1.5 text-stone-600">
            <ShieldCheck size={14} className="text-[#5A463A]" /> Direct booking with Stripe secure payment processing
          </p>
        </div>
      </div>
    </footer>
  );
}
