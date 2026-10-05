"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const onScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 24) {
        setHidden(false);
      } else if (currentScrollY > lastScrollY + 8) {
        setHidden(true);
      } else if (currentScrollY < lastScrollY - 8) {
        setHidden(false);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isCurrent = (href: string) => pathname === href;

  return (
    <header className={`serenity-editorial-nav serenity-editorial-nav--site${hidden ? " is-hidden" : ""}`} aria-label="Main navigation">
      <nav className="serenity-editorial-nav__left" aria-label="Primary navigation">
        <Link href="/houses" aria-current={isCurrent("/houses") ? "page" : undefined}>Houses</Link>
        <Link href="/about" aria-current={isCurrent("/about") ? "page" : undefined}>About</Link>
        <Link href="/corporate-stays" aria-current={isCurrent("/corporate-stays") ? "page" : undefined}>Corporate stays</Link>
      </nav>

      <Link href="/" className="serenity-editorial-nav__mark" aria-label="Serenity on the Rocks home">
        S
      </Link>

      <nav className="serenity-editorial-nav__right" aria-label="Booking navigation">
        <Link href="/contact" aria-current={isCurrent("/contact") ? "page" : undefined}>Contact</Link>
        <Link href="/houses">Book a stay</Link>
      </nav>
    </header>
  );
}
