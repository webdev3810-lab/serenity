import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { ApproximateMap } from "@/src/components/ApproximateMap";
import { GsapFadeIn } from "@/src/components/GsapAnimations";
import ScrollWipeText from "@/src/components/homepage/ScrollWipeText";
import type { ContactSettings } from "@/src/lib/siteSettings";

const LOCATION_FACTS = [
  ["Train station", "Around a 5-minute walk to Pakenham Station."],
  ["Local essentials", "Shops, supermarkets, cafés, and restaurants nearby."],
  ["Road access", "Easy access to the Princes Freeway and the wider Gippsland region."],
  ["Work and projects", "Convenient for Pakenham Industrial Park and surrounding businesses."],
];

export function LocationPage({ contact }: { contact: ContactSettings }) {
  return (
    <main className="bg-[#FAF8F5] text-[#2D2622]">
      <section className="border-b border-[#D8CCC4] bg-[#F7F4F1] px-6 py-20 sm:px-10 lg:px-16 lg:py-32">
        <GsapFadeIn className="mx-auto max-w-[92rem]">
          <span className="eyebrow text-[#8B6B55]">Pakenham, Victoria</span>
          <ScrollWipeText as="h1" className="display-font mt-6 max-w-5xl text-[clamp(3.5rem,8vw,8rem)] leading-[0.86] tracking-[-0.065em]">
            Close to what brings you here.
          </ScrollWipeText>
          <div className="mt-10 grid max-w-4xl gap-8 lg:grid-cols-[1fr_0.7fr] lg:items-end">
            <p className="text-base leading-relaxed text-[#6F5A4D] sm:text-lg">
              Serenity houses sit in a quiet Pakenham neighbourhood, close to transport, everyday essentials, and the places guests need for work, family visits, and longer stays.
            </p>
            <div className="flex items-center gap-3 border-l border-[#B99D88] pl-5 text-sm leading-relaxed text-[#6F5A4D]">
              <MapPin size={18} className="shrink-0 text-[#8B6B55]" aria-hidden="true" />
              <span>{contact.publicAddress ? `${contact.publicAddress}. ` : ""}Exact street details are shared after a confirmed booking to protect guest privacy.</span>
            </div>
          </div>
        </GsapFadeIn>
      </section>

      <section className="bg-[#F7F4F1]">
        <div className="h-[clamp(38rem,72svh,54rem)] w-full">
          <ApproximateMap title="Where you&apos;ll be" compact={false} borderless fullHeight />
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <GsapFadeIn className="mx-auto max-w-[92rem]">
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-start lg:gap-20">
            <div>
              <span className="eyebrow text-[#8B6B55]">The neighbourhood</span>
              <ScrollWipeText className="font-marcellus mt-5 text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">
                A calm base with an easy connection to the region.
              </ScrollWipeText>
              <p className="mt-6 text-base leading-relaxed text-[#6F5A4D]">
                Stay close to the station and town centre without giving up the privacy of a whole house. Whether you are travelling for work or taking time with family, Pakenham makes a practical base for exploring South East Melbourne and Gippsland.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/houses" className="inline-flex items-center gap-3 bg-[#2D2622] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#5A463A]">
                  View the houses <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
                <Link href="/contact" className="inline-flex items-center gap-3 border border-[#B99D88] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[#2D2622] transition-colors hover:bg-white">
                  Ask a question <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
                <a href={contact.directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 border border-[#B99D88] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[#2D2622] transition-colors hover:bg-white">
                  Get directions <ArrowUpRight size={16} aria-hidden="true" />
                </a>
                <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 border border-[#B99D88] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[#2D2622] transition-colors hover:bg-white">
                  Open map <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </GsapFadeIn>
      </section>

      <section className="border-y border-[#D8CCC4] bg-white px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <GsapFadeIn className="mx-auto max-w-[92rem]">
          <div className="mb-10 max-w-xl">
            <span className="eyebrow text-[#8B6B55]">Useful to know</span>
            <ScrollWipeText className="font-marcellus mt-5 text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">
              Everything you need is nearby.
            </ScrollWipeText>
          </div>
          <div className="grid gap-px overflow-hidden border border-[#D8CCC4] bg-[#D8CCC4] sm:grid-cols-2 lg:grid-cols-4">
            {LOCATION_FACTS.map(([label, detail]) => (
              <article key={label} className="bg-[#FAF8F5] p-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B6B55]">{label}</p>
                <p className="mt-8 text-base leading-relaxed text-[#5A463A]">{detail}</p>
              </article>
            ))}
          </div>
        </GsapFadeIn>
      </section>

      <section className="bg-[#EAE1DD] px-6 py-20 text-center sm:px-10 lg:py-24">
        <GsapFadeIn className="mx-auto max-w-3xl">
          <span className="eyebrow text-[#5A463A]">Plan your stay</span>
          <ScrollWipeText className="font-marcellus mt-5 text-4xl leading-[0.98] tracking-[-0.04em] sm:text-6xl">
            Make Pakenham your base.
          </ScrollWipeText>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#5A463A]">
            Choose a private furnished house and enjoy the space, comfort, and local connection of staying somewhere that feels easy.
          </p>
          <Link href="/houses" className="mt-8 inline-flex items-center gap-3 bg-[#2D2622] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#5A463A]">
            Browse houses <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </GsapFadeIn>
      </section>
    </main>
  );
}
