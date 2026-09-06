"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import StaggeredMenu, { type StaggeredMenuItem } from "@/src/components/StaggeredMenu";

export type PillNavItem = {
  label: string;
  href: string;
  ariaLabel?: string;
};

export interface PillNavProps {
  logo: string;
  logoAlt?: string;
  items: PillNavItem[];
  activeHref?: string;
  className?: string;
  ease?: string;
  onMobileMenuClick?: () => void;
  ctaLabel?: string;
  ctaHref?: string;
}

const isActivePath = (activeHref: string | undefined, href: string, activeHash = "") => {
  if (!activeHref) return false;
  const [targetPathValue, targetHashValue] = href.split("#");
  const currentPath = activeHref.replace(/\/+$/, "") || "/";
  const targetPath = targetPathValue.replace(/\/+$/, "") || "/";
  if (targetHashValue) return currentPath === targetPath && activeHash === `#${targetHashValue}`;
  return targetPath === "/" ? currentPath === "/" : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
};

export default function PillNav({
  logo,
  logoAlt = "Logo",
  items,
  activeHref,
  className = "",
  ctaLabel = "BOOK NOW",
  ctaHref = "/houses",
}: PillNavProps) {
  const pathname = usePathname();
  const [currentHash, setCurrentHash] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [navHidden, setNavHidden] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    const updateHash = () => setCurrentHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const currentScrollY = Math.max(0, window.scrollY);
        const scrollingDown = currentScrollY > lastScrollY + 6;
        const scrollingUp = currentScrollY < lastScrollY - 6;

        if (currentScrollY <= 16) setNavHidden(false);
        else if (scrollingDown) setNavHidden(true);
        else if (scrollingUp) setNavHidden(false);

        lastScrollY = currentScrollY;
        frame = 0;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const mobileItems: StaggeredMenuItem[] = items.map((item) => ({
    label: item.label,
    ariaLabel: item.ariaLabel ?? item.label,
    link: item.href,
    isActive: isActivePath(pathname ?? activeHref, item.href, currentHash),
  }));
  const isHomepage = className.includes("pill-nav-header-home");

  return (
    <>
      <header className={`pill-nav-header hidden sticky top-0 z-[80] transform-gpu border-b border-[#D8CCC4] bg-white text-[#2D2622] shadow-[0_0.75rem_2rem_rgba(45,38,34,0.06)] md:block ${reducedMotion ? "transition-none" : "transition-transform duration-300 ease-out"} ${navHidden ? "-translate-y-full" : "translate-y-0"} ${className}`}>
        <div className="mx-auto flex h-[5.75rem] w-full max-w-[100rem] items-center gap-4 px-4 sm:px-8 lg:h-32 lg:px-12">
          <Link href="/" aria-label="Serenity Stays home" className="pill-nav-brand relative z-10 flex shrink-0 items-center">
            <Image src={logo} alt={logoAlt} width={148} height={112} priority className="h-14 w-auto object-contain lg:h-20" />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center md:flex" aria-label="Primary navigation">
            <div className="flex items-center gap-5 lg:gap-8">
              {items.map((item) => {
                const active = isActivePath(pathname ?? activeHref, item.href, currentHash);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.ariaLabel ?? item.label}
                    aria-current={active ? "page" : undefined}
                    className={`relative inline-flex min-h-12 items-center px-0.5 pb-1 text-[12px] font-bold uppercase tracking-[0.15em] text-[#2D2622] no-underline transition-colors hover:text-[#5A463A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B99D88] lg:text-[13px] ${active ? "text-[#5A463A]" : ""}`}
                  >
                    {item.label}
                    <span aria-hidden="true" className={`absolute bottom-0 left-0 h-0.5 w-full bg-[#5A463A] transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
                  </Link>
                );
              })}
            </div>
          </nav>

          <Link href={ctaHref} className="ml-auto hidden min-h-12 shrink-0 items-center justify-center rounded-none bg-[#2D2622] px-5 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-[background-color,transform] hover:-translate-y-px hover:bg-[#5A463A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B99D88] md:inline-flex lg:px-7">
            {ctaLabel}
          </Link>
        </div>
      </header>

      <div className={`${isHomepage ? "h-0" : "h-[5.75rem]"} md:hidden`}>
        <StaggeredMenu
          position="right"
          items={mobileItems}
          displaySocials={false}
          displayItemNumbering={false}
          colors={["#5A463A", "#B99D88", "#D8CCC4"]}
          logoUrl={logo}
          logoAlt={logoAlt}
          ctaLabel={ctaLabel}
          ctaHref={ctaHref}
          menuButtonColor="#2D2622"
          openMenuButtonColor="#2D2622"
          changeMenuColorOnOpen={false}
          accentColor="#B7664E"
          isFixed
          className={reducedMotion ? "transition-none" : "transition-transform duration-300 ease-out"}
        />
      </div>
    </>
  );
}
