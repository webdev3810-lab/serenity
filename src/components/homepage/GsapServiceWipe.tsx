"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function GsapServiceWipe({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!container.current) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      
      const cards = container.current.querySelectorAll(".service-card");
      if (!cards.length) return;
      
      if (reducedMotion) {
        gsap.set(cards, { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 });
        return;
      }
      
      // Bottom-to-top wipe reveal for cards
      gsap.fromTo(cards, 
        { clipPath: "inset(100% 0% 0% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.2,
          stagger: 0.15,
          ease: "power3.inOut",
          scrollTrigger: {
            trigger: container.current,
            start: "top 85%",
            toggleActions: "play none none none"
          }
        }
      );
      
      // Parallax on decorative graphics
      const mm = gsap.matchMedia();
      
      mm.add({
        isDesktop: "(min-width: 1024px)",
        isTablet: "(min-width: 768px) and (max-width: 1023px)",
        isMobile: "(max-width: 767px)"
      }, (context) => {
        const { isMobile = false, isTablet = false } = (context.conditions ?? {}) as Partial<{
          isMobile: boolean;
          isTablet: boolean;
        }>;
        
        const multiplier = isMobile ? 0.3 : isTablet ? 0.6 : 1;
        
        cards.forEach((card, i) => {
          const graphic = card.querySelector(".service-graphic") as HTMLElement;
          if (!graphic) return;
          
          const type = graphic.getAttribute("data-graphic-type");
          
          let fromVars: gsap.TweenVars = {};
          let toVars: gsap.TweenVars = {
            ease: "none",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              end: "center center",
              scrub: 1
            }
          };

          if (type === "radial") {
            // scale and rotate
            fromVars = { scale: 0.8, rotation: -30 * multiplier, transformOrigin: "center center" };
            toVars = { ...toVars, scale: 1.05, rotation: 30 * multiplier };
          } else if (type === "vertical") {
            // reveal upward from the bottom
            fromVars = { clipPath: "inset(100% 0 0 0)" };
            toVars = { ...toVars, clipPath: "inset(0% 0 0 0)" };
          } else if (type === "horizontal") {
            // wipe from left to right
            fromVars = { clipPath: "inset(0 100% 0 0)" };
            toVars = { ...toVars, clipPath: "inset(0 0% 0 0)" };
          } else {
            // fallback translation
            const yOffset = (i % 2 === 0 ? 30 : -25) * multiplier;
            fromVars = { y: yOffset };
            toVars = { ...toVars, y: -yOffset };
          }
          
          gsap.fromTo(graphic, fromVars, toVars);
        });
      });
      
    },
    { scope: container }
  );

  return (
    <div ref={container} className={className}>
      {children}
    </div>
  );
}
