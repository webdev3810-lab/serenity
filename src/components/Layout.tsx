"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronRight } from "lucide-react";
import { BookingProvider } from "@/src/context/BookingContext";
import { ContactSettingsProvider } from "@/src/context/ContactSettingsContext";
import type { ContactSettings } from "@/src/lib/siteSettings";
import { EditorialFooter } from "@/src/components/EditorialFooter";
import StaggeredMobileMenu from "@/src/components/StaggeredMobileMenu";

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
          <EditorialFooter draft={pathname === "/how-it-works-draft"} />
        </div>
      </BookingProvider>
    </ContactSettingsProvider>
  );
}

function Header({ pathname }: { pathname: string | null }) {
  const [hidden, setHidden] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aboutMenuOpen, setAboutMenuOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState("");
  const aboutMenuRef = useRef<HTMLDivElement>(null);
  const links = [
    { label: "Home", href: "/" },
    { label: "Our Homes", href: "/homes" },
    { label: "Insurance & Corporate", href: "/corporate-stays" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Other Businesses", href: "/other-businesses" },
  ];
  const aboutLinks = [
    { label: "How It Works", href: "/how-it-works" },
    { label: "Guest Info", href: "/guest-information" },
  ];
  const partnerBookingHref = "/corporate-stays#corporate-booking";

  useEffect(() => {
    const updateHash = () => setCurrentHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  useEffect(() => {
    if (!aboutMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!aboutMenuRef.current?.contains(event.target as Node)) setAboutMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [aboutMenuOpen]);

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

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktopQuery.matches) setMobileMenuOpen(false);
    };

    desktopQuery.addEventListener("change", closeOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeOnDesktop);
  }, []);

  const isCurrent = (href: string) => {
    const [targetPathValue, targetHash] = href.split("#");
    const targetPath = targetPathValue || "/";
    const currentPath = pathname || "/";
    if (targetHash) return currentPath === targetPath && currentHash === `#${targetHash}`;
    if (targetPath === "/") return currentPath === "/" && !currentHash;
    if (targetPath === "/homes" && currentPath.startsWith("/properties/")) return true;
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
            CORPORATE BOOKINGS
            <span />
          </span>
        </span>
      </Link>

      <nav id="serenity-primary-navigation" className="serenity-editorial-nav__links" aria-label="Primary navigation">
        {links.map(({ label, href }, index) => {
          const active = isCurrent(href);
          if (href === "/about") {
            const groupActive = active || aboutLinks.some((item) => isCurrent(item.href));
            return (
              <div
                key={href}
                ref={aboutMenuRef}
                className="serenity-editorial-nav__about"
                data-open={aboutMenuOpen ? "true" : undefined}
                onMouseEnter={() => setAboutMenuOpen(true)}
                onMouseLeave={() => setAboutMenuOpen(false)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setAboutMenuOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setAboutMenuOpen(false);
                    aboutMenuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
                  }
                }}
              >
                <Link href={href} aria-current={active ? "page" : undefined} onClick={() => setAboutMenuOpen(false)}>
                  <span className="serenity-editorial-nav__item-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <span>{label}</span>
                </Link>
                <button
                  type="button"
                  className="serenity-editorial-nav__about-toggle"
                  aria-label="Show About links"
                  aria-expanded={aboutMenuOpen}
                  aria-controls="serenity-about-menu"
                  data-active={groupActive ? "true" : undefined}
                  onClick={() => setAboutMenuOpen(true)}
                >
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
                <div id="serenity-about-menu" className="serenity-editorial-nav__about-menu" hidden={!aboutMenuOpen}>
                  {aboutLinks.map((item) => (
                    <Link key={item.href} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined} onClick={() => setAboutMenuOpen(false)}>
                      <span>{item.label}</span>
                      <ChevronRight size={15} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? (href.includes("#") ? "location" : "page") : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="serenity-editorial-nav__item-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span>{label}</span>
            </Link>
          );
        })}
        <Link
          href={partnerBookingHref}
          className="serenity-editorial-nav__partner-menu"
          aria-current={isCurrent(partnerBookingHref) ? "location" : undefined}
          onClick={() => setMobileMenuOpen(false)}
        >
          <span>Partner Booking</span>
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
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
        <StaggeredMobileMenu
          open={mobileMenuOpen}
          items={links.map(({ label, href }) => ({
            label,
            href,
            ariaLabel: `Go to ${label}`,
            active: isCurrent(href),
            children: href === "/about" ? aboutLinks.map((item) => ({ ...item, active: isCurrent(item.href) })) : undefined,
          }))}
          partnerBookingHref={partnerBookingHref}
          partnerBookingActive={isCurrent(partnerBookingHref)}
          onToggle={() => setMobileMenuOpen((open) => !open)}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>
    </header>
  );
}
