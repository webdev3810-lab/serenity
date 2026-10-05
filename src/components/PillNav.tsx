"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandWordmark } from "@/src/components/BrandWordmark";
import StaggeredMenu, { type StaggeredMenuItem } from "@/src/components/StaggeredMenu";

export type PillNavItem = {
  label: string;
  href: string;
  ariaLabel?: string;
};

export interface PillNavProps {
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
  if (targetPath === "/houses" && currentPath.startsWith("/properties/")) return true;
  return targetPath === "/" ? currentPath === "/" : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
};

export default function PillNav({
  items,
  activeHref,
  className = "",
  ctaLabel = "Book now",
  ctaHref = "/houses",
}: PillNavProps) {
  const pathname = usePathname();
  const [currentHash, setCurrentHash] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
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
    let frame = 0;
    let lastScrollY = window.scrollY;

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY;

        setIsScrolled(currentScrollY > 12);
        if (currentScrollY <= 16) {
          setNavHidden(false);
        } else if (scrollDelta > 4) {
          setNavHidden(true);
        } else if (scrollDelta < -4) {
          setNavHidden(false);
        }

        lastScrollY = currentScrollY;
        frame = 0;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
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
      <header className={`pill-nav-header hidden sticky top-0 z-[80] transform-gpu border-b border-[#D7E2DA] bg-white text-[#063F30] md:block ${reducedMotion ? "transition-none" : "transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out"} ${navHidden ? "-translate-y-full" : "translate-y-0"} ${isScrolled ? "is-scrolled" : ""} ${className}`}>
        <div className="mx-auto flex h-16 w-full max-w-[100rem] items-center gap-2 px-3 sm:px-5 lg:px-6">
          <Link href="/" aria-label="Serenity on the Rocks home" className="pill-nav-brand relative z-10 flex shrink-0 items-center">
            <BrandWordmark />
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
                    className={`pill-nav-link relative inline-flex min-h-10 items-center justify-center rounded-full px-2 py-2 text-[12px] font-medium normal-case tracking-[0.035em] text-[#063F30] no-underline transition-[background-color,color,box-shadow,transform] hover:-translate-y-px hover:text-[#07583F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#07583F] lg:px-2.5 lg:text-[13px] ${active ? "is-active text-[#07583F]" : ""}`}
                  >
                    {item.label}
                    <span aria-hidden="true" className={`pill-nav-link__indicator absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#FFD21A] transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
                  </Link>
                );
              })}
            </div>
          </nav>

          <Link href={ctaHref} className="pill-nav-cta ml-auto hidden min-h-10 shrink-0 items-center justify-center rounded-full border border-[#FFD21A] bg-[#FFD21A] px-3.5 text-[12px] font-medium normal-case tracking-[0.04em] text-[#063F30] transition-[background-color,box-shadow,transform] hover:-translate-y-px hover:bg-[#FFE36C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#07583F] md:inline-flex lg:px-4">
            {ctaLabel}
          </Link>
        </div>
      </header>

      <div className={`${isHomepage ? "h-0" : "h-16"} md:hidden`}>
        <StaggeredMenu
          position="right"
          items={mobileItems}
          displaySocials={false}
          displayItemNumbering={false}
          colors={["#063F30", "#07583F", "#FFD21A"]}
          ctaLabel={ctaLabel}
          ctaHref={ctaHref}
          menuButtonColor="#063F30"
          openMenuButtonColor="#063F30"
          changeMenuColorOnOpen={false}
          accentColor="#FFD21A"
          isFixed
          className={`${reducedMotion ? "transition-none" : "transition-transform duration-300 ease-out"} ${navHidden ? "nav-scroll-hidden" : "nav-scroll-visible"}`}
        />
      </div>
    </>
  );
}
