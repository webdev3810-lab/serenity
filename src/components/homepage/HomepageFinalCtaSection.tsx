import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GsapFadeIn } from "./AnimatedSection";
import type { Property } from "@/src/data/properties";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";
import ScrollWipeText from "./ScrollWipeText";

export interface HomepageFinalCtaSectionProps {
  heading: string;
  subheading?: string;
  eyebrow?: string;
  properties: Property[];
  className?: string;
}

/**
 * A final booking index that feels like the closing page of an editorial stay guide.
 */
export default function HomepageFinalCtaSection({
  heading = "Ready to stay with Serenity?",
  subheading = "Choose your ideal home below.",
  eyebrow = "Your next stay",
  properties,
  className = "",
}: HomepageFinalCtaSectionProps) {
  const homes = properties.slice(0, 3);
  const coverProperty = homes.find((property) => isApprovedHomepageMediaSource(property.featuredImage));
  const coverImage = coverProperty?.featuredImage || "";

  return (
    <section className={`relative overflow-hidden bg-white px-6 py-24 sm:px-10 lg:px-16 lg:py-32 ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-[#D8CCC4]" aria-hidden="true" />

      <div className="mx-auto max-w-[92rem]">
        <div className="mb-12 flex items-center justify-between gap-6 border-b border-[#D8CCC4] pb-5 text-[10px] font-bold uppercase tracking-[0.24em] text-[#8B6B55] sm:mb-16">
          <span>Serenity guestbook</span>
          <span className="hidden sm:inline">Pakenham / Victoria</span>
        </div>

        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-20">
          <GsapFadeIn className="max-w-3xl">
            <div className="mb-8 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#B88A5A]">
              <span className="h-px w-10 bg-[#B88A5A]" aria-hidden="true" />
              <span>{eyebrow}</span>
            </div>

            <ScrollWipeText className="font-marcellus text-[clamp(3.2rem,6.4vw,6.4rem)] leading-[0.96] tracking-[-0.045em] text-[#2D2622]">
              {heading}
            </ScrollWipeText>

            {subheading && (
              <p className="mt-8 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
                {subheading}
              </p>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link
                href="/houses"
                className="group inline-flex items-center gap-3 border-b border-[#2D2622] pb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#2D2622] transition-colors hover:border-[#B88A5A] hover:text-[#B88A5A]"
              >
                Explore the homes
                <ArrowUpRight size={15} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" aria-hidden="true" />
              </Link>
              <span className="text-sm text-stone-500">Three furnished homes, one comfortable setting.</span>
            </div>
          </GsapFadeIn>

          <GsapFadeIn className="w-full">
            <div className="overflow-hidden rounded-none bg-[#2D2521] text-[#F7F4F1] shadow-[0_24px_70px_-38px_rgba(45,37,33,0.7)]">
              <div className="relative min-h-[19rem] overflow-hidden p-7 sm:min-h-[23rem] sm:p-10">
                {coverImage ? (
                  <Image
                    src={coverImage}
                    alt={`${coverProperty?.name.replace(" - Whole", "") || "Serenity house"} furnished accommodation`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    className="homepage-editorial-image object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,#B99D88_0%,#6D5446_48%,#2D2521_100%)]" aria-hidden="true" />
                )}
                <div className="absolute inset-0 bg-gradient-to-br from-[#2D2521]/20 via-[#2D2521]/30 to-[#2D2521]/90" aria-hidden="true" />
                <div className="relative z-10 flex h-full min-h-[15rem] flex-col justify-between sm:min-h-[19rem]">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.22em] text-[#F7F4F1]/75">
                    <span>Book direct</span>
                    <span>01 / 03</span>
                  </div>
                  <p className="max-w-[14ch] font-marcellus text-3xl leading-[1.02] sm:text-4xl">
                    A private home, thoughtfully prepared.
                  </p>
                </div>
              </div>

              {homes.length > 0 ? (
                <div className="divide-y divide-[#F7F4F1]/15">
                  {homes.map((property, index) => {
                    const name = property.name.replace(" - Whole", "");
                    return (
                      <Link
                        key={property.slug}
                        href={`/properties/${property.slug}`}
                        className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-7 py-5 transition-colors hover:bg-[#F7F4F1]/10 sm:px-10"
                      >
                        <span className="text-[10px] font-bold tracking-[0.18em] text-[#B99D88]">0{index + 1}</span>
                        <span className="font-marcellus text-xl sm:text-2xl">{name}</span>
                        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#F7F4F1]/65 transition-colors group-hover:text-[#F7F4F1]">
                          View
                          <ArrowUpRight size={14} aria-hidden="true" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <Link href="/houses" className="flex items-center justify-between px-7 py-6 text-sm font-bold sm:px-10">
                  Browse available homes <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              )}
            </div>
          </GsapFadeIn>
        </div>
      </div>
    </section>
  );
}
