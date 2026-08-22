"use client";

import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import type { CSSProperties, ElementType } from "react";
import { gsap } from "gsap";

const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value;

type Reveal = "rise" | "wipe" | "fade" | "none";
type Trigger = "view" | "mount" | "hover";

export interface MaskedHeadingProps {
  text?: string;
  tag?: ElementType;
  mediaType?: "image" | "video";
  src?: string;
  poster?: string;
  fillScale?: number;
  parallax?: number;
  drift?: number;
  brightness?: number;
  saturation?: number;
  grayscale?: boolean;
  reveal?: Reveal;
  duration?: number;
  stagger?: number;
  trigger?: Trigger;
  align?: "left" | "center" | "right";
  weight?: number;
  tracking?: number;
  lineHeight?: number;
  textScale?: number;
  className?: string;
  style?: CSSProperties;
}

export default function MaskedHeading({
  text = "Designed in the details",
  tag = "h2",
  mediaType = "image",
  src = "",
  poster = "",
  fillScale = 1.25,
  parallax = 26,
  drift = 18,
  brightness = 1,
  saturation = 1,
  grayscale = false,
  reveal = "rise",
  duration = 1.1,
  stagger = 0.09,
  trigger = "view",
  align = "center",
  weight = 700,
  tracking = -0.03,
  lineHeight = 1.06,
  textScale = 0.115,
  className = "",
  style,
}: MaskedHeadingProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const revealRef = useRef<HTMLSpanElement | null>(null);
  const mediaRef = useRef<HTMLSpanElement | null>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const baseRefs = useRef<(HTMLElement | null)[]>([]);
  const glyphRefs = useRef<(SVGTextElement | null)[]>([]);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const offsetRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const settingsRef = useRef({ fillScale, parallax, drift, brightness, saturation, grayscale, textScale });
  const clipId = `mh-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const words = useMemo(() => String(text).split(/\s+/).filter(Boolean), [text]);

  useEffect(() => {
    settingsRef.current = { fillScale, parallax, drift, brightness, saturation, grayscale, textScale };
  }, [brightness, drift, fillScale, grayscale, parallax, saturation, textScale]);

  const place = useCallback(() => {
    const root = rootRef.current;
    const media = mediaRef.current;
    if (!root || !media) return;

    const settings = settingsRef.current;
    const maxX = Math.max(0, ((settings.fillScale - 1) / 2) * root.clientWidth);
    const maxY = Math.max(0, ((settings.fillScale - 1) / 2) * root.clientHeight);
    const offset = offsetRef.current;

    media.style.transform = `translate3d(${clamp(offset.x, -maxX, maxX).toFixed(2)}px, ${clamp(offset.y, -maxY, maxY).toFixed(2)}px, 0) scale(${settings.fillScale})`;
    media.style.filter = `brightness(${settings.brightness}) saturate(${settings.saturation})${settings.grayscale ? " grayscale(1)" : ""}`;
  }, []);

  const sync = useCallback(() => {
    const root = rootRef.current;
    const measure = measureRef.current;
    if (!root || !measure) return;

    root.style.fontSize = `${clamp(root.clientWidth * settingsRef.current.textScale, 20, 200).toFixed(1)}px`;
    svgRef.current?.setAttribute("width", `${root.clientWidth}`);
    svgRef.current?.setAttribute("height", `${root.clientHeight}`);
    svgRef.current?.setAttribute("viewBox", `0 0 ${root.clientWidth} ${root.clientHeight}`);
    const computedStyle = window.getComputedStyle(measure);

    wordRefs.current.forEach((word, index) => {
      const base = baseRefs.current[index];
      const glyph = glyphRefs.current[index];
      if (!word || !base || !glyph) return;
      glyph.setAttribute("x", `${word.offsetLeft}`);
      glyph.setAttribute("y", `${base.offsetTop}`);
      glyph.style.fontFamily = computedStyle.fontFamily;
      glyph.style.fontSize = computedStyle.fontSize;
      glyph.style.fontWeight = computedStyle.fontWeight;
      glyph.style.fontStyle = computedStyle.fontStyle;
      glyph.style.letterSpacing = computedStyle.letterSpacing;
    });
    place();
  }, [place]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    sync();
    const resizeObserver = new ResizeObserver(sync);
    resizeObserver.observe(root);
    document.fonts?.ready.then(sync).catch(() => {});

    let raf = 0;
    let last = performance.now();
    let clock = 0;
    const frame = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += delta;
      const settings = settingsRef.current;
      const offset = offsetRef.current;
      const ease = 1 - Math.exp(-delta / 0.18);
      offset.x += (offset.tx + Math.sin(clock * 0.21) * settings.drift - offset.x) * ease;
      offset.y += (offset.ty + Math.cos(clock * 0.17) * settings.drift * 0.6 - offset.y) * ease;
      place();
      raf = requestAnimationFrame(frame);
    };

    const onMove = (event: PointerEvent) => {
      if (settingsRef.current.parallax <= 0) return;
      const bounds = root.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / (bounds.width || 1)) * 2 - 1;
      const y = ((event.clientY - bounds.top) / (bounds.height || 1)) * 2 - 1;
      offsetRef.current.tx = clamp(x, -1, 1) * -settingsRef.current.parallax;
      offsetRef.current.ty = clamp(y, -1, 1) * -settingsRef.current.parallax;
    };

    const onLeave = () => {
      offsetRef.current.tx = 0;
      offsetRef.current.ty = 0;
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [place, sync]);

  useEffect(() => {
    sync();
  }, [align, lineHeight, sync, tag, textScale, tracking, weight, words]);

  useEffect(() => {
    const root = rootRef.current;
    const layer = revealRef.current;
    if (!root || !layer) return;
    const glyphs = glyphRefs.current.filter(Boolean);
    if (!glyphs.length) return;

    const riseDistance = () => (parseFloat(window.getComputedStyle(root).fontSize) || 48) * 1.15;
    const settle = () => {
      gsap.set(glyphs, { y: 0 });
      gsap.set(layer, { opacity: 1, scale: 1, clipPath: "inset(0% 0% 0% 0%)" });
    };
    const rest = () => {
      if (reveal === "rise") gsap.set(glyphs, { y: riseDistance() });
      if (reveal === "wipe") gsap.set(layer, { clipPath: "inset(0% 100% 0% 0%)" });
      if (reveal === "fade") gsap.set(layer, { opacity: 0, scale: 1.08 });
    };

    if (reveal === "none" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      settle();
      return;
    }

    const play = () => {
      tweenRef.current?.kill();
      if (reveal === "rise") {
        gsap.set(layer, { opacity: 1, scale: 1, clipPath: "inset(0% 0% 0% 0%)" });
        tweenRef.current = gsap.fromTo(glyphs, { y: riseDistance() }, { y: 0, duration, stagger, ease: "power4.out", overwrite: "auto" });
      } else if (reveal === "wipe") {
        gsap.set(glyphs, { y: 0 });
        const state = { progress: 100 };
        tweenRef.current = gsap.to(state, {
          progress: 0,
          duration,
          ease: "power3.inOut",
          overwrite: "auto",
          onUpdate: () => {
            layer.style.clipPath = `inset(0% ${state.progress}% 0% 0%)`;
          },
        });
      } else {
        gsap.set(glyphs, { y: 0 });
        tweenRef.current = gsap.fromTo(layer, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration, ease: "power3.out", overwrite: "auto" });
      }
    };

    if (trigger === "hover") {
      settle();
      root.addEventListener("pointerenter", play);
      return () => {
        root.removeEventListener("pointerenter", play);
        tweenRef.current?.kill();
      };
    }

    if (trigger === "view") {
      settle();
      rest();
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          play();
          observer.disconnect();
        }
      }, { threshold: 0.25 });
      observer.observe(root);
      return () => {
        observer.disconnect();
        tweenRef.current?.kill();
      };
    }

    play();
    return () => tweenRef.current?.kill();
  }, [duration, reveal, stagger, trigger, words]);

  // The tag is intentionally configurable so the component can preserve page semantics.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const HeadingTag = tag as any;

  return (
    <HeadingTag
      ref={rootRef as never}
      className={`masked-heading ${className}`.trim()}
      style={{ textAlign: align, fontWeight: weight, letterSpacing: `${tracking}em`, lineHeight, ...style }}
    >
      <span ref={measureRef} className="masked-heading-measure">
        {words.map((word, index) => (
          <span key={`${word}-${index}`} ref={(element) => { wordRefs.current[index] = element; }} className="masked-heading-word">
            {word}
            <i ref={(element) => { baseRefs.current[index] = element; }} className="masked-heading-baseline" />
          </span>
        ))}
      </span>

      <span className="masked-heading-solid" aria-hidden="true">{text}</span>

      <svg ref={svgRef} className="masked-heading-svg" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            {words.map((word, index) => (
              <text key={`${word}-${index}`} ref={(element) => { glyphRefs.current[index] = element; }}>{word}</text>
            ))}
          </clipPath>
        </defs>
      </svg>

      <span ref={revealRef} className="masked-heading-reveal">
        <span className="masked-heading-clip" style={{ clipPath: `url(#${clipId})` }}>
          <span ref={mediaRef} className="masked-heading-media">
            {mediaType === "video" ? (
              <video className="masked-heading-media-content" src={src} poster={poster} autoPlay muted loop playsInline />
            ) : (
              <img className="masked-heading-media-content" src={src} alt="" draggable={false} referrerPolicy={src.includes("a0.muscache.com") ? "no-referrer" : undefined} />
            )}
          </span>
        </span>
      </span>
    </HeadingTag>
  );
}
