"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";

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
  ease = "power3.out",
  onMobileMenuClick,
  ctaLabel = "BOOK NOW",
  ctaHref = "/houses",
}: PillNavProps) {
  const currentPathname = usePathname();
  const [currentHash, setCurrentHash] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const closeMobileMenu = useCallback(() => {
    setMobileOpen(false);
    onMobileMenuClick?.();
    previousFocusRef.current?.focus();

    const menu = mobileMenuRef.current;
    const lines = hamburgerRef.current?.querySelectorAll<HTMLElement>(".hamburger-line");
    if (!menu || !lines) return;
    if (reducedMotion) {
      gsap.set(menu, { visibility: "hidden", opacity: 0, y: 0 });
      gsap.set(lines[0], { rotation: 0, y: 0 });
      gsap.set(lines[1], { rotation: 0, y: 0 });
      return;
    }
    gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.3, ease });
    gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.3, ease });
    gsap.to(menu, { opacity: 0, y: 10, duration: 0.2, ease, onComplete: () => gsap.set(menu, { visibility: "hidden" }) });
  }, [ease, onMobileMenuClick, reducedMotion]);

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

        if (mobileOpen || currentScrollY <= 16) {
          setNavHidden(false);
        } else if (scrollingDown) {
          setNavHidden(true);
        } else if (scrollingUp) {
          setNavHidden(false);
        }

        lastScrollY = currentScrollY;
        frame = 0;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMenu();
        return;
      }
      if (event.key !== "Tab" || !mobileMenuRef.current) return;
      const focusable = Array.from(mobileMenuRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!mobileMenuRef.current?.contains(target) && !hamburgerRef.current?.contains(target)) closeMobileMenu();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      document.body.style.overflow = "";
    };
  }, [closeMobileMenu, mobileOpen]);

  const toggleMobileMenu = () => {
    const nextOpen = !mobileOpen;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setNavHidden(false);
    setMobileOpen(nextOpen);
    onMobileMenuClick?.();

    const menu = mobileMenuRef.current;
    const lines = hamburgerRef.current?.querySelectorAll<HTMLElement>(".hamburger-line");
    if (!menu || !lines) return;

    if (reducedMotion) {
      gsap.set(menu, { visibility: nextOpen ? "visible" : "hidden", opacity: nextOpen ? 1 : 0, y: 0 });
      gsap.set(lines[0], { rotation: nextOpen ? 45 : 0, y: nextOpen ? 3 : 0 });
      gsap.set(lines[1], { rotation: nextOpen ? -45 : 0, y: nextOpen ? -3 : 0 });
      return;
    }

    gsap.to(lines[0], { rotation: nextOpen ? 45 : 0, y: nextOpen ? 3 : 0, duration: 0.3, ease });
    gsap.to(lines[1], { rotation: nextOpen ? -45 : 0, y: nextOpen ? -3 : 0, duration: 0.3, ease });
    if (nextOpen) {
      gsap.set(menu, { visibility: "visible" });
      gsap.fromTo(menu, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease });
      window.requestAnimationFrame(() => mobileMenuRef.current?.querySelector<HTMLElement>("a, button")?.focus());
    } else {
      gsap.to(menu, { opacity: 0, y: 10, duration: 0.2, ease, onComplete: () => gsap.set(menu, { visibility: "hidden" }) });
    }
  };

  return (
    <header className={`pill-nav-header sticky top-0 z-[80] transform-gpu border-b border-[#D8CCC4] bg-white text-[#2D2622] shadow-[0_0.75rem_2rem_rgba(45,38,34,0.06)] ${reducedMotion ? "transition-none" : "transition-transform duration-300 ease-out"} ${navHidden ? "-translate-y-full" : "translate-y-0"} ${className}`}>
      <div className="mx-auto flex h-[5.75rem] w-full max-w-[100rem] items-center gap-4 px-4 sm:px-8 lg:h-32 lg:px-12">
        <button
          ref={hamburgerRef}
          type="button"
          onClick={mobileOpen ? closeMobileMenu : toggleMobileMenu}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls="pill-nav-mobile-menu"
          className="relative z-10 inline-flex h-12 w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-none border border-[#D8CCC4] bg-white text-[#2D2622] transition-colors hover:bg-[#EAE1DD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B99D88] md:hidden"
        >
          <span className="hamburger-line h-0.5 w-4 rounded-none bg-current" />
          <span className="hamburger-line h-0.5 w-4 rounded-none bg-current" />
        </button>

        <Link href="/" aria-label="Serenity Stays home" className="pill-nav-brand relative z-10 flex shrink-0 items-center" onClick={closeMobileMenu}>
          <Image src={logo} alt={logoAlt} width={148} height={112} priority className="h-14 w-auto object-contain lg:h-20" />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center md:flex" aria-label="Primary navigation">
          <div className="flex items-center gap-5 lg:gap-8">
            {items.map((item) => {
              const active = isActivePath(currentPathname ?? activeHref, item.href, currentHash);
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

        <Link href={ctaHref} onClick={closeMobileMenu} className="ml-auto hidden min-h-12 shrink-0 items-center justify-center rounded-none bg-[#2D2622] px-5 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-[background-color,transform] hover:-translate-y-px hover:bg-[#5A463A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B99D88] md:inline-flex lg:px-7">
          {ctaLabel}
        </Link>
      </div>

      <div ref={mobileMenuRef} id="pill-nav-mobile-menu" role="dialog" aria-modal="true" aria-label="Site navigation" aria-hidden={!mobileOpen} className="invisible absolute inset-x-4 top-[calc(100%+0.75rem)] z-[90] origin-top rounded-none border border-[#D8CCC4] bg-white p-4 opacity-0 shadow-[0_1rem_3rem_rgba(45,38,34,0.16)] md:hidden">
        <nav aria-label="Mobile navigation">
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={closeMobileMenu} className="block border-b border-[#D8CCC4] px-2 py-3.5 text-base font-semibold text-[#2D2622] transition-colors hover:text-[#5A463A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B99D88]">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={ctaHref} onClick={closeMobileMenu} className="block rounded-none bg-[#2D2622] px-5 py-3.5 text-center text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#3d3029] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EAE1DD]">
                {ctaLabel}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
