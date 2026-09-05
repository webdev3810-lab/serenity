"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Menu, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

export interface StaggeredMenuLink {
  label: string;
  link: string;
  ariaLabel?: string;
}

export interface StaggeredMenuColumn {
  title: string;
  links: StaggeredMenuLink[];
}

export interface StaggeredMenuItem extends StaggeredMenuLink {
  columns?: StaggeredMenuColumn[];
}

export interface StaggeredMenuProps {
  items: StaggeredMenuItem[];
  className?: string;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}

const transitionMs = 280;

export default function StaggeredMenu({
  items,
  className = "",
  onMenuOpen,
  onMenuClose,
}: StaggeredMenuProps) {
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMounted, setMobileMounted] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);

  const closeMobileMenu = useCallback(() => {
    setMobileOpen(false);
    setMobileSection(null);
    onMenuClose?.();
    window.setTimeout(() => setMobileMounted(false), transitionMs);
    previousFocusRef.current?.focus();
  }, [onMenuClose]);

  const openMobileMenu = () => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setMobileMounted(true);
    setMobileOpen(false);
    onMenuOpen?.();
    window.requestAnimationFrame(() => {
      setMobileOpen(true);
      window.requestAnimationFrame(() => {
        mobilePanelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
      });
    });
  };

  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMenu();
        return;
      }

      if (!mobileOpen || event.key !== "Tab" || !mobilePanelRef.current) return;
      const focusable = Array.from(
        mobilePanelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")
      ).filter((element) => !element.hasAttribute("aria-hidden"));
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
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeMobileMenu, mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const headerClasses = "sticky top-0 border-b border-[#D8CCC4] bg-white/[.98] text-stone-900 shadow-[0_0.75rem_2rem_rgba(45,38,34,0.06)]";
  const buttonClasses = "border-[#2D2622] bg-[#2D2622] text-white hover:bg-[#5A463A]";
  const menuButtonClasses = "text-stone-900 hover:bg-stone-100";

  return (
    <div className={`relative z-50 ${className}`}>
      <header className={`site-nav relative z-[80] transition-[background-color,border-color,color] duration-300 ease-out ${headerClasses}`}>
        <div className="site-nav-inner mx-auto flex h-[5.75rem] w-full max-w-[100rem] items-center gap-6 pr-5 pl-0 sm:pr-8 sm:pl-0 lg:h-32 lg:pr-12 lg:pl-0">
          <div className="relative z-10 flex shrink-0 items-center">
            <button
              type="button"
              className={`inline-flex h-14 w-14 items-center justify-center rounded-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B99D88] md:hidden ${menuButtonClasses}`}
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileOpen}
              aria-controls="site-navigation"
              onClick={mobileOpen ? closeMobileMenu : openMobileMenu}
            >
              {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>

          <Link href="/" aria-label="Serenity Stays home" className="site-nav-brand absolute left-1/2 flex -translate-x-1/2 items-center md:static md:mr-8 md:translate-x-0 lg:mr-12" onClick={closeMobileMenu}>
            <Image
              src="/LOGO.png"
              alt="Serenity Stays"
              width={148}
              height={112}
              priority
              className="h-20 w-auto object-contain lg:h-28"
            />
          </Link>

          <nav className="site-nav-links hidden flex-1 items-center justify-center gap-1 rounded-none border border-[#D8CCC4] bg-white/60 p-1.5 shadow-[0_0.5rem_1.25rem_rgba(45,38,34,0.045)] md:flex" aria-label="Main navigation">
            {items.map((item) => (
              <Link
                key={item.label}
                href={item.link}
                aria-label={item.ariaLabel ?? item.label}
                onClick={closeMobileMenu}
                className="inline-flex min-h-12 items-center whitespace-nowrap rounded-none px-4 text-[13px] font-bold uppercase tracking-[0.12em] transition-[background-color,color,transform] hover:bg-[#EAE1DD] hover:text-[#5A463A] hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B99D88] lg:px-5 lg:text-sm"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Link
              href="/houses"
              onClick={closeMobileMenu}
              className={`hidden min-h-12 items-center justify-center rounded-none border px-6 text-[11px] font-bold uppercase tracking-[0.2em] transition-[background-color,transform] hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B99D88] md:inline-flex lg:px-7 ${buttonClasses}`}
            >
              BOOK NOW
            </Link>
          </div>
        </div>
      </header>

      {mobileMounted && (
        <div
          id="site-navigation"
          ref={mobilePanelRef}
          className={`absolute inset-x-0 top-full z-[70] h-[calc(100dvh-5.75rem)] overflow-hidden bg-stone-950/25 transition-opacity duration-300 md:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
          data-open={mobileOpen}
          aria-hidden={!mobileOpen}
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeMobileMenu();
          }}
          {...(!mobileOpen ? { inert: true } : {})}
        >
          <div className={`absolute inset-y-0 left-0 flex w-[min(88vw,20rem)] min-w-[18rem] flex-col overflow-y-auto bg-white text-stone-900 shadow-[1.5rem_0_3rem_rgba(45,38,34,0.18)] transition-transform duration-300 ease-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
            <nav className="flex-1 px-6 pb-8 pt-5 sm:px-8 sm:pt-6" aria-label="Site navigation">
              <ul className="space-y-0" role="list">
                {items.map((item, itemIndex) => {
                  const hasMenu = Boolean(item.columns?.length);
                  const isSectionOpen = mobileSection === item.label;
                  const sectionId = `mobile-section-${item.label.toLowerCase().replaceAll(" ", "-")}`;
                  return (
                    <li key={item.label} className="border-b border-stone-900/15">
                      {hasMenu ? (
                        <>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between py-2.5 text-left font-serif text-[1.1rem] tracking-tight text-stone-900 transition-colors hover:text-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5A463A] sm:text-[1.2rem]"
                            aria-expanded={isSectionOpen}
                            aria-controls={sectionId}
                            onClick={() => setMobileSection(isSectionOpen ? null : item.label)}
                          >
                            <span>{item.label}</span>
                            <ChevronRight size={19} className={`transition-transform duration-200 ${isSectionOpen ? "rotate-90" : ""}`} aria-hidden="true" />
                          </button>
                          <div id={sectionId} className={`grid transition-[grid-template-rows,opacity] duration-300 ${isSectionOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                            <div className="min-h-0 overflow-hidden pl-3 pb-3">
                              {item.columns?.map((column) => (
                                <div key={column.title} className="mb-4 last:mb-0">
                                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-800">{column.title}</p>
                                  <ul className="space-y-1" role="list">
                                    {column.links.map((link) => (
                                      <li key={`${column.title}-${link.label}`}>
                                        <Link
                                          href={link.link}
                                          className="block py-2 text-base text-stone-700 transition-colors hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A463A]"
                                          onClick={closeMobileMenu}
                                        >
                                          {link.label}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <Link
                          href={item.link}
                          className="staggered-mobile-link block py-2.5 font-serif text-[1.1rem] tracking-tight text-stone-900 transition-colors hover:text-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5A463A] sm:text-[1.2rem]"
                          style={{ "--mobile-stagger-delay": `${itemIndex * 45}ms` } as CSSProperties}
                          onClick={closeMobileMenu}
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <p className="mx-6 mb-6 border-t border-white/10 pt-5 text-xs leading-relaxed text-stone-400 sm:mx-8">
              Private furnished houses in Pakenham, Victoria.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
