import Link from "next/link";
import Image from "next/image";
import { GsapFadeIn } from "./AnimatedSection";
import ScrollWipeText from "./ScrollWipeText";
import ScrollFloat from "./ScrollFloat";

export interface HomepageIntroSectionProps {
  eyebrow?: string;
  heading?: string;
  lead?: string;
  body?: string;
  primaryLabel?: string;
  primaryHref?: string;
  artLabel?: string;
  artHeading?: string;
  artCard?: string;
  artImage?: string;
  artCardImage?: string;
  className?: string;
}

/**
 * Intro section: Premium editorial layout matching Lionheart design
 */
export default function HomepageIntroSection({
  eyebrow = "Serenity On The Rocks",
  heading = "A premium stay in Pakenham.",
  lead = "With 8 years of hosting experience and Superhost recognition, Serenity offers what standard accommodation cannot: a fully personalised home built around how you live.",
  body = "Every guest has their own space and enjoys a beautifully furnished, peaceful home just a 5-minute walk from Pakenham Train Station. Whether your stay needs corporate convenience, support through relocations, or simply an environment where you can finally relax, comfort comes quickly when you have the whole house to yourself.",
  primaryLabel = "Learn more about Serenity",
  primaryHref = "/about",
  artLabel = "Serenity stays",
  artHeading = "Space to settle in.",
  artCard = "Private homes, thoughtfully prepared.",
  artImage = "",
  artCardImage = "",
  className = "",
}: HomepageIntroSectionProps) {
  return (
    <section className={`section-editorial bg-[#F7F4F1] py-20 lg:py-32 ${className}`}>
      <GsapFadeIn className="w-full max-w-[85rem] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-center">
          
          {/* Left Column: abstract editorial artwork (no external demo imagery) */}
          <ScrollFloat className="lg:col-span-6 relative" intensity={30}>
            <div className="relative aspect-[4/5] w-full max-w-lg mx-auto lg:mr-auto overflow-hidden rounded-none bg-[#DED2CB] shadow-xl">
              {artImage ? <Image src={artImage} alt="" fill sizes="(max-width: 1023px) 100vw, 50vw" unoptimized className="object-cover" /> : <div className="absolute inset-0 bg-[linear-gradient(145deg,#f1e8e1_0%,#d4bcae_42%,#8d7364_100%)]" aria-hidden="true" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/5" aria-hidden="true" />
              <div className="absolute inset-8 border border-white/60" aria-hidden="true" />
              <div className="absolute bottom-10 left-10 right-10 border-t border-white/70 pt-4 text-white" aria-hidden="true">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em]">{artLabel}</p>
                <p className="mt-2 font-marcellus text-3xl leading-tight">{artHeading}</p>
              </div>
            </div>
            
            {/* Overlapping editorial detail panel */}
            <div className="absolute -bottom-8 -right-4 sm:-right-8 lg:-bottom-12 lg:-right-12 w-1/2 aspect-square bg-white p-2 shadow-2xl z-10">
              <div className="relative flex h-full items-end overflow-hidden bg-[#F7F4F1] p-5 sm:p-7">
                {artCardImage && <Image src={artCardImage} alt="" fill sizes="(max-width: 1023px) 50vw, 25vw" unoptimized className="object-cover" />}
                {artCardImage && <div className="absolute inset-0 bg-black/25" aria-hidden="true" />}
                <p className={`relative z-10 font-marcellus text-2xl leading-tight sm:text-3xl ${artCardImage ? "text-white" : "text-stone-800"}`}>{artCard}</p>
              </div>
            </div>
          </ScrollFloat>

          {/* Right Column: Text Content */}
          <div className="lg:col-span-6 flex flex-col items-start justify-center pt-12 lg:pt-0">
            {eyebrow && (
              <span className="font-marcellus italic text-xl md:text-2xl text-stone-800 mb-6 tracking-wide">
                {eyebrow}
              </span>
            )}
            
            <ScrollWipeText className="display-font mb-8 max-w-[12ch] text-[clamp(3.4rem,6vw,6rem)] font-bold leading-[0.9] tracking-[-0.045em] text-stone-900">
              {heading}
            </ScrollWipeText>
            
            {lead && (
              <p className="text-lg md:text-xl font-medium text-stone-800 mb-6 leading-relaxed max-w-xl">
                {lead}
              </p>
            )}
            
            {body && (
              <p className="text-sm md:text-base text-stone-600 mb-12 leading-loose max-w-xl">
                {body}
              </p>
            )}
            
            <Link 
              href={primaryHref} 
              className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-stone-500 hover:text-stone-900 transition-colors border-b border-stone-300 hover:border-stone-900 pb-1"
            >
              {primaryLabel}
            </Link>
          </div>

        </div>
      </GsapFadeIn>
    </section>
  );
}
