"use client";

import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

export interface StaggeredMenuItem {
  label: string;
  ariaLabel?: string;
  link: string;
  isActive?: boolean;
}

export interface StaggeredMenuSocialItem {
  label: string;
  link: string;
}

export interface StaggeredMenuProps {
  position?: "left" | "right";
  colors?: string[];
  items?: StaggeredMenuItem[];
  socialItems?: StaggeredMenuSocialItem[];
  displaySocials?: boolean;
  displayItemNumbering?: boolean;
  className?: string;
  logoUrl?: string;
  logoAlt?: string;
  ctaLabel?: string;
  ctaHref?: string;
  menuButtonColor?: string;
  openMenuButtonColor?: string;
  accentColor?: string;
  isFixed?: boolean;
  changeMenuColorOnOpen?: boolean;
  closeOnClickAway?: boolean;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}

export default function StaggeredMenu({
  position = "right",
  colors = ["#5A463A", "#B99D88", "#D8CCC4"],
  items = [],
  socialItems = [],
  displaySocials = true,
  displayItemNumbering = true,
  className = "",
  logoUrl = "/LOGO.png",
  logoAlt = "Serenity Stays",
  ctaLabel = "BOOK NOW",
  ctaHref = "/houses",
  menuButtonColor = "#2D2622",
  openMenuButtonColor = "#2D2622",
  accentColor = "#B7664E",
  isFixed = false,
  changeMenuColorOnOpen = true,
  closeOnClickAway = true,
  onMenuOpen,
  onMenuClose,
}: StaggeredMenuProps) {
  const [open, setOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const openRef = useRef(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const preLayersRef = useRef<HTMLDivElement | null>(null);
  const preLayerElsRef = useRef<HTMLElement[]>([]);
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const colorTweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      if (!panel) return;

      preLayerElsRef.current = preContainer
        ? Array.from(preContainer.querySelectorAll<HTMLElement>(".sm-prelayer"))
        : [];

      const offscreen = position === "left" ? -100 : 100;
      gsap.set([panel, ...preLayerElsRef.current], { xPercent: offscreen, opacity: 1 });
      if (toggleBtnRef.current) gsap.set(toggleBtnRef.current, { color: menuButtonColor });
    });

    return () => ctx.revert();
  }, [menuButtonColor, position]);

  const setPanelState = useCallback((isOpen: boolean) => {
    const panel = panelRef.current;
    if (!panel) return;

    const layers = preLayerElsRef.current;
    const itemEls = Array.from(panel.querySelectorAll<HTMLElement>(".sm-panel-item-label"));
    const numberEls = Array.from(panel.querySelectorAll<HTMLElement>(".sm-panel-list[data-numbering] .sm-panel-item"));
    const socialTitle = panel.querySelector<HTMLElement>(".sm-socials-title");
    const socialLinks = Array.from(panel.querySelectorAll<HTMLElement>(".sm-socials-link"));
    const offscreen = position === "left" ? -100 : 100;
    gsap.set([...layers, panel], { xPercent: isOpen ? 0 : offscreen, opacity: 1 });
    gsap.set(itemEls, { yPercent: 0, rotate: 0 });
    if (numberEls.length) gsap.set(numberEls, { ["--sm-num-opacity" as string]: isOpen ? 1 : 0 });
    if (socialTitle) gsap.set(socialTitle, { opacity: isOpen ? 1 : 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 0, opacity: isOpen ? 1 : 0 });
  }, [position]);

  const playOpen = useCallback(() => {
    setPanelState(true);
  }, [setPanelState]);

  const playClose = useCallback(() => {
    setPanelState(false);
  }, [setPanelState]);

  const animateColor = useCallback((opening: boolean) => {
    const button = toggleBtnRef.current;
    if (!button) return;
    colorTweenRef.current?.kill();
    const targetColor = opening ? openMenuButtonColor : menuButtonColor;
    if (changeMenuColorOnOpen && !reducedMotion) {
      colorTweenRef.current = gsap.to(button, { color: targetColor, delay: 0.18, duration: 0.3, ease: "power2.out" });
    } else {
      gsap.set(button, { color: targetColor });
    }
  }, [changeMenuColorOnOpen, menuButtonColor, openMenuButtonColor, reducedMotion]);

  const closeMenu = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    onMenuClose?.();
    playClose();
    animateColor(false);
    previousFocusRef.current?.focus();
  }, [animateColor, onMenuClose, playClose]);

  const toggleMenu = useCallback(() => {
    const nextOpen = !openRef.current;
    openRef.current = nextOpen;
    setOpen(nextOpen);

    if (nextOpen) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      onMenuOpen?.();
      playOpen();
    } else {
      onMenuClose?.();
      playClose();
    }

    animateColor(nextOpen);
  }, [animateColor, onMenuClose, onMenuOpen, playClose, playOpen]);

  useEffect(() => {
    if (!open) return;
    const focusFirstItem = window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("a, button")?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
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

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(focusFirstItem);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeMenu, open]);

  useEffect(() => {
    if (!closeOnClickAway || !open) return;
    const handleClickAway = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node) && !toggleBtnRef.current?.contains(event.target as Node)) closeMenu();
    };
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [closeMenu, closeOnClickAway, open]);

  useEffect(() => () => {
    colorTweenRef.current?.kill();
  }, []);

  const layerColors = colors.slice(0, 4).filter(Boolean);
  const cssVars = { "--sm-accent": accentColor } as CSSProperties;

  return (
    <div className={`sm-scope z-[80] ${open ? "pointer-events-auto" : "pointer-events-none"} ${isFixed ? "fixed inset-0 h-screen w-screen overflow-hidden" : "relative h-full w-full"} ${className}`}>
      <div className="staggered-menu-wrapper pointer-events-none relative z-40 h-full w-full" style={cssVars} data-position={position} data-open={open || undefined}>
        <div ref={preLayersRef} className="sm-prelayers pointer-events-none absolute bottom-0 right-0 top-0 z-[5]" aria-hidden="true">
          {(layerColors.length ? layerColors : ["#5A463A", "#B99D88"]).map((color, index) => (
            <div key={`${color}-${index}`} className="sm-prelayer absolute bottom-0 right-0 top-0 h-full w-full" style={{ background: color }} />
          ))}
        </div>

        <header className="staggered-menu-header pointer-events-none absolute left-0 top-0 z-20 flex h-[5.75rem] w-full items-center justify-between border-b border-[#D8CCC4] bg-white/[.98] px-4 shadow-[0_0.75rem_2rem_rgba(45,38,34,0.06)] sm:px-8" aria-label="Main navigation header">
          <Link href="/" className="sm-logo pointer-events-auto flex items-center" aria-label="Serenity Stays home" onClick={closeMenu}>
            <Image src={logoUrl} alt={logoAlt} width={148} height={112} priority className="block h-14 w-auto object-contain" />
          </Link>

          <button ref={toggleBtnRef} className="sm-toggle pointer-events-auto inline-flex h-12 w-12 items-center justify-center border border-[#D8CCC4] bg-white p-0 text-[#2D2622] transition-colors hover:bg-[#EAE1DD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B99D88]" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="staggered-menu-panel" onClick={toggleMenu} type="button">
            {open ? <X size={21} strokeWidth={1.8} aria-hidden="true" /> : <Menu size={21} strokeWidth={1.8} aria-hidden="true" />}
          </button>
        </header>

        <aside id="staggered-menu-panel" ref={panelRef} className={`staggered-menu-panel absolute bottom-0 right-0 top-0 z-10 flex flex-col overflow-y-auto bg-[#FCFBF9] px-5 pb-8 pt-[7.25rem] text-[#2D2622] sm:px-8 sm:pt-[8rem] ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
          <div className="sm-panel-inner flex flex-1 flex-col gap-6">
            <ul className="sm-panel-list m-0 flex list-none flex-col border-t border-[#EAE1DD] p-0" role="list" data-numbering={displayItemNumbering || undefined}>
              {items.length ? items.map((item, index) => (
                <li className="sm-panel-item-wrap group relative overflow-hidden border-b border-[#EAE1DD] leading-none" key={`${item.label}-${index}`}>
                  <Link href={item.link} aria-label={item.ariaLabel ?? item.label} aria-current={item.isActive ? "page" : undefined} className="sm-panel-item relative flex min-h-[4.35rem] w-full items-center justify-between gap-4 py-3 font-marcellus text-[clamp(2.25rem,10.5vw,3.8rem)] font-normal leading-[0.86] tracking-[-0.045em] text-[#2D2622] no-underline transition-colors duration-150 hover:text-[var(--sm-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sm-accent)]" onClick={closeMenu}>
                    <span className="sm-panel-item-label inline-block">{item.label}</span>
                    <ArrowUpRight size={20} strokeWidth={1.5} aria-hidden="true" className={`shrink-0 transition-[color,opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${item.isActive ? "text-[var(--sm-accent)] opacity-100" : "text-[#B99D88] opacity-50 group-hover:opacity-100"}`} />
                  </Link>
                </li>
              )) : (
                <li className="text-lg text-[#6F6258]">No navigation items</li>
              )}
            </ul>

            <Link href={ctaHref} onClick={closeMenu} className="sm-panel-cta inline-flex min-h-14 w-full items-center justify-between gap-5 bg-[#2D2622] px-5 text-xs font-bold uppercase tracking-[0.18em] text-white no-underline transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#5A463A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sm-accent)] sm:px-6">
              <span>{ctaLabel}</span>
              <ArrowUpRight size={19} strokeWidth={1.7} aria-hidden="true" />
            </Link>

            {displaySocials && socialItems.length > 0 && (
              <div className="sm-socials mt-auto flex flex-col gap-3 border-t border-[#D8CCC4] pt-6" aria-label="Social links">
                <h2 className="sm-socials-title m-0 text-xs font-bold uppercase tracking-[0.18em] text-[var(--sm-accent)]">Connect</h2>
                <ul className="sm-socials-list m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0" role="list">
                  {socialItems.map((social, index) => <li key={`${social.label}-${index}`}><a href={social.link} target="_blank" rel="noopener noreferrer" className="sm-socials-link text-base text-[#2D2622] no-underline hover:text-[var(--sm-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sm-accent)]">{social.label}</a></li>)}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>

      <style>{`
        .sm-scope .staggered-menu-header > * { pointer-events: auto; }
        .sm-scope .staggered-menu-panel { width: min(88vw, 28rem); }
        .sm-scope .sm-panel-list[data-numbering] { counter-reset: sm-item; }
        .sm-scope .sm-panel-list[data-numbering] .sm-panel-item::after { counter-increment: sm-item; content: counter(sm-item, decimal-leading-zero); position: absolute; right: 0; top: 0.15em; color: var(--sm-accent); font-size: 0.85rem; font-weight: 700; letter-spacing: 0.08em; opacity: var(--sm-num-opacity, 0); }
        .sm-scope [data-position='left'] .staggered-menu-panel { right: auto; left: 0; }
        .sm-scope [data-position='left'] .sm-prelayers { right: auto; left: 0; }
        @media (max-width: 640px) {
          .sm-scope .staggered-menu-panel { width: 100%; }
        }
      `}</style>
    </div>
  );
}
