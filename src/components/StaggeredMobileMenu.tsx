"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

type StaggeredMenuItem = {
  label: string;
  href: string;
  ariaLabel: string;
  active?: boolean;
  children?: Array<{ label: string; href: string; active?: boolean }>;
};

type StaggeredMobileMenuProps = {
  open: boolean;
  items: StaggeredMenuItem[];
  partnerBookingHref: string;
  partnerBookingActive: boolean;
  onToggle: () => void;
  onClose: () => void;
};

const subscribeToMount = () => () => {};
const getClientMountState = () => true;
const getServerMountState = () => false;

export default function StaggeredMobileMenu({
  open,
  items,
  partnerBookingHref,
  partnerBookingActive,
  onToggle,
  onClose,
}: StaggeredMobileMenuProps) {
  const mounted = useSyncExternalStore(subscribeToMount, getClientMountState, getServerMountState);
  const panelRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const dismiss = useCallback(() => {
    onCloseRef.current();
    window.requestAnimationFrame(() => toggleRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open || !mounted) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(".serenity-staggered-menu__item")
        ?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), summary"),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [dismiss, mounted, open]);

  const panel = mounted
    ? createPortal(
        <div className="serenity-staggered-menu" data-open={open ? "true" : undefined}>
          <button
            className="serenity-staggered-menu__shade"
            type="button"
            aria-label="Close navigation"
            tabIndex={-1}
            onClick={dismiss}
          />
          <aside
            id="serenity-staggered-menu-panel"
            ref={panelRef}
            className="serenity-staggered-menu__panel"
            aria-hidden={!open}
            aria-modal={open ? true : undefined}
            aria-label="Serenity mobile navigation"
            inert={!open}
            role="dialog"
          >
            <div className="serenity-staggered-menu__panel-inner">
              <div className="serenity-staggered-menu__panel-heading">
                <div>
                  <span className="serenity-staggered-menu__eyebrow">SERENITY CORPORATE BOOKINGS</span>
                  <h2>Explore Serenity</h2>
                </div>
              </div>

              <nav aria-label="Mobile primary navigation">
                <ul className="serenity-staggered-menu__list" data-numbering="true">
                  {items.map((item, index) => (
                    <li className="serenity-staggered-menu__item-wrap" key={`${item.href}-${item.label}`}>
                      {item.children ? (
                        <details className="serenity-staggered-menu__subnav">
                          <summary className="serenity-staggered-menu__item">
                            <span className="serenity-staggered-menu__item-label">{item.label}</span>
                            <ChevronDown size={19} aria-hidden="true" />
                          </summary>
                          <div className="serenity-staggered-menu__subnav-links">
                            <Link href={item.href} aria-current={item.active ? "page" : undefined} onClick={onClose}>About Serenity</Link>
                            {item.children.map((child) => (
                              <Link key={child.href} href={child.href} aria-current={child.active ? "page" : undefined} onClick={onClose}>{child.label}</Link>
                            ))}
                          </div>
                        </details>
                      ) : (
                      <Link
                        className="serenity-staggered-menu__item"
                        href={item.href}
                        aria-label={item.ariaLabel}
                        aria-current={item.active ? (item.href.includes("#") ? "location" : "page") : undefined}
                        data-index={index + 1}
                        onClick={onClose}
                      >
                        <span className="serenity-staggered-menu__item-label">{item.label}</span>
                      </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

              <Link
                className="serenity-staggered-menu__partner"
                href={partnerBookingHref}
                aria-current={partnerBookingActive ? "location" : undefined}
                onClick={onClose}
              >
                <span>Partner Booking</span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>

              <p className="serenity-staggered-menu__footer">Thoughtful, fully furnished stays in Pakenham, Victoria.</p>
            </div>
          </aside>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={toggleRef}
        className="serenity-staggered-menu__toggle"
        type="button"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        aria-controls="serenity-staggered-menu-panel"
        onClick={onToggle}
      >
        <span className="serenity-staggered-menu__toggle-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
      {panel}
    </>
  );
}
