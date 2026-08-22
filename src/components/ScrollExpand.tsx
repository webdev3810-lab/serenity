"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CSSProperties, FC, ReactNode } from "react";

const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value;

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

export interface ScrollExpandProps {
  src?: string;
  mediaType?: "image" | "video";
  poster?: string;
  alt?: string;
  title?: ReactNode;
  scrollHint?: string;
  startWidth?: number;
  startHeight?: number;
  startRadius?: number;
  endRadius?: number;
  mediaZoom?: number;
  scrollDistance?: number;
  holdDistance?: number;
  smoothing?: number;
  overlayScrim?: number;
  useWindowScroll?: boolean;
  enabled?: boolean;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const ScrollExpand: FC<ScrollExpandProps> = ({
  src = "",
  mediaType = "image",
  poster = "",
  alt = "",
  title = "",
  scrollHint = "",
  startWidth = 42,
  startHeight = 58,
  startRadius = 24,
  endRadius = 0,
  mediaZoom = 1.35,
  scrollDistance = 1.2,
  holdDistance = 0.35,
  smoothing = 0.1,
  overlayScrim = 0.45,
  useWindowScroll = false,
  enabled = true,
  children,
  className = "",
  style,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLImageElement & HTMLVideoElement>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const scrimRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);

  const propsRef = useRef({
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
    useWindowScroll,
    enabled,
  });

  useEffect(() => {
    propsRef.current = {
      startWidth,
      startHeight,
      startRadius,
      endRadius,
      mediaZoom,
      scrollDistance,
      holdDistance,
      smoothing,
      overlayScrim,
      useWindowScroll,
      enabled,
    };
  }, [enabled, endRadius, holdDistance, mediaZoom, overlayScrim, scrollDistance, smoothing, startHeight, startRadius, startWidth, useWindowScroll]);

  const applyProgress = useCallback((progress: number) => {
    const frame = frameRef.current;
    const media = mediaRef.current;
    if (!frame || !media) return;

    const config = propsRef.current;
    const eased = smoothstep(0, 1, progress);
    const width = config.startWidth + (100 - config.startWidth) * eased;
    const height = config.startHeight + (100 - config.startHeight) * eased;
    const insetX = Math.max(0, (100 - width) / 2);
    const insetY = Math.max(0, (100 - height) / 2);
    const radius = config.startRadius + (config.endRadius - config.startRadius) * eased;

    frame.style.clipPath = `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${radius}px)`;
    media.style.transform = `scale(${config.mediaZoom + (1 - config.mediaZoom) * eased})`;

    if (scrimRef.current) scrimRef.current.style.opacity = `${config.overlayScrim * eased}`;

    if (titleRef.current) {
      const out = smoothstep(0.4, 0.88, progress);
      titleRef.current.style.opacity = `${1 - out}`;
      titleRef.current.style.transform = `translate3d(0, ${-28 * out}px, 0) scale(${1 + 0.06 * out})`;
    }

    if (hintRef.current) {
      const gone = smoothstep(0, 0.12, progress);
      hintRef.current.style.opacity = `${1 - gone}`;
      hintRef.current.style.transform = `translate3d(0, ${8 * gone}px, 0)`;
    }

    if (overlayRef.current) {
      const incoming = smoothstep(0.68, 1, progress);
      overlayRef.current.style.opacity = `${incoming}`;
      overlayRef.current.style.transform = `translate3d(0, ${18 * (1 - incoming)}px, 0)`;
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!root || !track || !stage) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let current = 0;
    let target = 0;
    let stageHeight = 0;
    let running = false;

    const measure = () => {
      const config = propsRef.current;
      stageHeight = config.useWindowScroll ? window.innerHeight : root.clientHeight;
      if (stageHeight <= 0) return;

      stage.style.height = `${stageHeight}px`;
      track.style.height = `${stageHeight * (1 + Math.max(0, config.scrollDistance) + Math.max(0, config.holdDistance))}px`;
      stage.style.setProperty("--se-title-size", `${clamp((root.clientWidth || stageHeight) * 0.075, 20, 84)}px`);
    };

    const readProgress = () => {
      const config = propsRef.current;
      if (!config.enabled) return 1;
      const span = stageHeight * Math.max(0.01, config.scrollDistance);
      if (!span) return 0;
      if (config.useWindowScroll) {
        return clamp(-track.getBoundingClientRect().top / span, 0, 1);
      }
      return clamp(root.scrollTop / span, 0, 1);
    };

    const tick = () => {
      const config = propsRef.current;
      const follow = config.smoothing <= 0 ? 1 : 1 - Math.exp(-1 / (60 * config.smoothing));
      current += (target - current) * follow;
      if (Math.abs(target - current) < 0.0004) {
        current = target;
        running = false;
      }
      applyProgress(current);
      raf = running ? requestAnimationFrame(tick) : 0;
    };

    const kick = () => {
      if (running) return;
      running = true;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      target = readProgress();
      if (propsRef.current.smoothing <= 0 || reduceMotion) {
        current = target;
        applyProgress(current);
        return;
      }
      kick();
    };

    const onResize = () => {
      measure();
      target = readProgress();
      current = target;
      applyProgress(current);
    };

    measure();
    target = readProgress();
    current = target;
    applyProgress(current);

    const scroller = useWindowScroll ? window : root;
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(root);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      resizeObserver.disconnect();
    };
  }, [applyProgress, useWindowScroll]);

  const media = mediaType === "video" ? (
    <video
      ref={mediaRef}
      className="scroll-expand-media"
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
    />
  ) : (
    <img
      ref={mediaRef}
      className="scroll-expand-media"
      src={src}
      alt={alt}
      draggable={false}
      referrerPolicy={src.includes("a0.muscache.com") ? "no-referrer" : undefined}
    />
  );

  return (
    <div
      ref={rootRef}
      className={`scroll-expand-root ${useWindowScroll ? "" : "scroll-expand-root-local"} ${className}`.trim()}
      style={style}
    >
      <div ref={trackRef} className="scroll-expand-track">
        <div ref={stageRef} className="scroll-expand-stage">
          <div ref={frameRef} className="scroll-expand-frame">
            {media}
            <div ref={scrimRef} className="scroll-expand-scrim" />
            {children ? <div ref={overlayRef} className="scroll-expand-overlay">{children}</div> : null}
          </div>
          {title ? <div ref={titleRef} className="scroll-expand-title">{title}</div> : null}
          {scrollHint ? <div ref={hintRef} className="scroll-expand-hint">{scrollHint}</div> : null}
        </div>
      </div>
    </div>
  );
};

export default ScrollExpand;
