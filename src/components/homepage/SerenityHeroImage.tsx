"use client";

import Image from "next/image";
import { useState } from "react";

export default function SerenityHeroImage({ src, alt }: { src: string; alt: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  if (!src) return <div className="serenity-editorial-image-fallback" aria-hidden="true" />;

  return (
    <div className="serenity-editorial-hero__media" data-state={state}>
      <Image
        src={src}
        alt={alt}
        fill
        preload
        sizes="100vw"
        unoptimized={src.includes("a0.muscache.com") || src.includes(".supabase.co/")}
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
      />
      <div className="serenity-editorial-hero__loading" aria-hidden="true">
        <span className="serenity-editorial-hero__loading-name">Serenity</span>
        <span className="serenity-editorial-hero__loading-track" />
      </div>
    </div>
  );
}
