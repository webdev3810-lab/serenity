"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronRight } from "lucide-react";
import { BookingProvider } from "@/src/context/BookingContext";
import { ContactSettingsProvider } from "@/src/context/ContactSettingsContext";
import type { ContactSettings } from "@/src/lib/siteSettings";
import { EditorialFooter } from "@/src/components/EditorialFooter";
import StaggeredMobileMenu from "@/src/components/StaggeredMobileMenu";
import { BrandWordmark } from "@/src/components/BrandWordmark";

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
  const [infoMenuOpen, setInfoMenuOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState("");
  const infoMenuRef = useRef<HTMLDivElement>(null);
  const links = [
    { label: "Home", href: "/" },
    { label: "Our Homes", href: "/homes" },
    { label: "Insurance & Corporate", href: "/corporate-stays" },
    { label: "Info", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Other Businesses", href: "/other-businesses" },
  ];
  const infoLinks = [
    { label: "Guest", href: "/guest-information" },
    { label: "About", href: "/about" },
  ];
  const partnerBookingHref = "/corporate-stays#corporate-booking";

  useEffect(() => {
    const updateHash = () => {
      setCurrentHash(window.location.hash);
      if (window.location.pathname === "/corporate-stays" && window.location.hash === "#corporate-booking") setHidden(false);
    };
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  useEffect(() => {
    if (!infoMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!infoMenuRef.current?.contains(event.target as Node)) setInfoMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [infoMenuOpen]);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const partnerFormTop = window.location.pathname === "/corporate-stays" && window.location.hash === "#corporate-booking"
        ? document.getElementById("corporate-booking")?.getBoundingClientRect().top
        : undefined;
      if (partnerFormTop !== undefined && partnerFormTop >= -40 && partnerFormTop <= 160) {
        setHidden(false);
      } else if (currentScrollY <= 24) {
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
      <Link href="/" className="serenity-editorial-nav__mark" aria-label="Serenity Corporate Bookings home" onClick={() => setMobileMenuOpen(false)}>
        <BrandWordmark priority />
      </Link>

      <nav id="serenity-primary-navigation" className="serenity-editorial-nav__links" aria-label="Primary navigation">
        {links.map(({ label, href }, index) => {
          const active = isCurrent(href);
          if (href === "/about") {
            const groupActive = active || infoLinks.some((item) => isCurrent(item.href));
            return (
              <div
                key={href}
                ref={infoMenuRef}
                className="serenity-editorial-nav__about"
                data-open={infoMenuOpen ? "true" : undefined}
                onMouseEnter={() => setInfoMenuOpen(true)}
                onMouseLeave={() => setInfoMenuOpen(false)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setInfoMenuOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setInfoMenuOpen(false);
                    infoMenuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
                  }
                }}
              >
                <button type="button" className="serenity-editorial-nav__info-trigger" aria-expanded={infoMenuOpen} aria-controls="serenity-info-menu" data-active={groupActive ? "true" : undefined} onClick={() => setInfoMenuOpen(true)}>
                  <span className="serenity-editorial-nav__item-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <span>{label}</span>
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
                <div id="serenity-info-menu" className="serenity-editorial-nav__about-menu" hidden={!infoMenuOpen}>
                  {infoLinks.map((item) => (
                    <Link key={item.href} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined} onClick={() => setInfoMenuOpen(false)}>
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
            children: href === "/about" ? infoLinks.map((item) => ({ ...item, active: isCurrent(item.href) })) : undefined,
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
