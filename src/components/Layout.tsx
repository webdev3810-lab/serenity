"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BookingProvider } from "@/src/context/BookingContext";
import { ContactSettingsProvider } from "@/src/context/ContactSettingsContext";
import type { ContactSettings } from "@/src/lib/siteSettings";
import { EditorialFooter } from "@/src/components/EditorialFooter";

export function AppShell({ children, contactSettings }: { children: React.ReactNode; contactSettings: ContactSettings }) {
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
        <div className="public-site">
          <Header pathname={pathname} />
          <main className="min-h-screen bg-background">{children}</main>
          <EditorialFooter />
        </div>
      </BookingProvider>
    </ContactSettingsProvider>
  );
}

function Header({ pathname }: { pathname: string | null }) {
  const [hidden, setHidden] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState("");
  const links = [
    { label: "Home", href: "/" },
    { label: "Our Homes", href: "/houses" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Corporate", href: "/corporate-stays" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];
  const partnerBookingHref = "/corporate-stays#corporate-booking";

  useEffect(() => {
    const updateHash = () => setCurrentHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const onScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 24) {
        setHidden(false);
      } else if (currentScrollY > lastScrollY + 8) {
        setHidden(true);
        setMobileMenuOpen(false);
      } else if (currentScrollY < lastScrollY - 8) {
        setHidden(false);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isCurrent = (href: string) => {
    const [targetPathValue, targetHash] = href.split("#");
    const targetPath = targetPathValue || "/";
    const currentPath = pathname || "/";
    if (targetHash) return currentPath === targetPath && currentHash === `#${targetHash}`;
    if (targetPath === "/") return currentPath === "/" && !currentHash;
    if (targetPath === "/houses" && currentPath.startsWith("/properties/")) return true;
    return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
  };

  return (
    <header className={`serenity-editorial-nav serenity-editorial-nav--site${hidden ? " is-hidden" : ""}`}>
      <Link href="/" className="serenity-editorial-nav__mark" aria-label="Serenity on the Rocks home" onClick={() => setMobileMenuOpen(false)}>
        <Image src="/LOGO.png" alt="" width={1248} height={642} sizes="(max-width: 640px) 56px, 76px" loading="eager" />
        <span className="serenity-editorial-nav__wordmark" aria-hidden="true">
          <span className="serenity-editorial-nav__wordmark-name">SERENITY</span>
          <span className="serenity-editorial-nav__wordmark-descriptor">
            <span />
            CORPORATE STAYS
            <span />
          </span>
        </span>
      </Link>

      <nav id="serenity-primary-navigation" className="serenity-editorial-nav__links" aria-label="Primary navigation" data-open={mobileMenuOpen || undefined}>
        {links.map(({ label, href }) => {
          const active = isCurrent(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? (href.includes("#") ? "location" : "page") : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="serenity-editorial-nav__actions">
        <Link
          href={partnerBookingHref}
          className="serenity-editorial-nav__partner"
          aria-current={isCurrent(partnerBookingHref) ? "location" : undefined}
          onClick={() => setMobileMenuOpen(false)}
        >
          Partner Booking
        </Link>
        <button
          type="button"
          className="serenity-editorial-nav__toggle"
          aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileMenuOpen}
          aria-controls="serenity-primary-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}
