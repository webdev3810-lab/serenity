import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, CheckCircle2, Home, Users } from "lucide-react";
import { GsapFadeIn } from "@/src/components/GsapAnimations";
import ScrollWipeText from "@/src/components/homepage/ScrollWipeText";
import { properties } from "@/src/data/properties";

const STAY_TYPES = [
  {
    icon: Home,
    title: "Private homes",
    text: "A whole furnished house with room to spread out, cook, work, and rest.",
  },
  {
    icon: Users,
    title: "Family stays",
    text: "Comfortable spaces for families and groups who want to stay close together.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Work stays",
    text: "Practical accommodation for teams, contractors, relocations, and longer visits.",
  },
];

export function AboutPage() {
  const coverImage = properties[0]?.featuredImage;

  return (
    <main className="bg-[#FAF8F5] text-[#2D2622]">
      <section className="border-b border-[#D8CCC4] bg-[#F7F4F1] px-6 py-20 sm:px-10 lg:px-16 lg:py-32">
        <div className="mx-auto grid max-w-[92rem] gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-24">
          <GsapFadeIn className="max-w-2xl">
            <span className="eyebrow text-[#8B6B55]">About Serenity</span>
            <ScrollWipeText as="h1" className="display-font mt-6 text-[clamp(3.5rem,8vw,8rem)] leading-[0.86] tracking-[-0.065em]">
              A private place to settle in.
            </ScrollWipeText>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-[#6F5A4D] sm:text-lg">
              Serenity is a small collection of fully furnished houses in Pakenham, prepared for calm family stays, practical work trips, and everything in between.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/houses" className="inline-flex items-center gap-3 bg-[#2D2622] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#5A463A]">
                Explore the houses <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/location" className="inline-flex items-center gap-3 border border-[#B99D88] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[#2D2622] transition-colors hover:bg-white">
                See the location <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </GsapFadeIn>

          <GsapFadeIn className="relative aspect-[4/3] overflow-hidden bg-[#DED2CB] lg:aspect-[5/4]">
            {coverImage ? (
              <Image
                src={coverImage}
                alt="Serenity furnished house in Pakenham"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-[#2D2521]/65 via-transparent to-transparent" aria-hidden="true" />
            <div className="absolute inset-x-6 bottom-6 flex items-end justify-between gap-4 text-white sm:inset-x-8 sm:bottom-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">Serenity Stays</p>
                <p className="mt-2 font-marcellus text-3xl sm:text-4xl">Pakenham, Victoria</p>
              </div>
              <span className="border border-white/60 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em]">Since 2018</span>
            </div>
          </GsapFadeIn>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-10 lg:px-16 lg:py-28">
        <GsapFadeIn className="mx-auto grid max-w-[92rem] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <span className="eyebrow text-[#8B6B55]">The simple idea</span>
            <ScrollWipeText className="font-marcellus mt-5 text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">
              Feel at home from the moment you arrive.
            </ScrollWipeText>
          </div>
          <div className="max-w-2xl space-y-5 text-base leading-relaxed text-[#6F5A4D] sm:text-lg">
            <p>
              We started Serenity to make furnished accommodation feel more personal, more straightforward, and easier to trust.
            </p>
            <p>
              Each home is set up for real life: a proper kitchen, laundry, private bedrooms, parking, Wi-Fi, and the space to enjoy your own routine. The three houses sit beside each other, so larger groups can stay close while keeping their own private home.
            </p>
            <p>
              Our local team is here before arrival, during the stay, and whenever you need a clear answer.
            </p>
          </div>
        </GsapFadeIn>
      </section>

      <section className="border-y border-[#D8CCC4] bg-white px-6 py-20 sm:px-10 lg:px-16 lg:py-28">
        <GsapFadeIn className="mx-auto max-w-[92rem]">
          <div className="mb-12 max-w-2xl">
            <span className="eyebrow text-[#8B6B55]">Made for real stays</span>
            <ScrollWipeText className="font-marcellus mt-5 text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">
              Thoughtful basics, done well.
            </ScrollWipeText>
          </div>
          <div className="grid gap-px overflow-hidden border border-[#D8CCC4] bg-[#D8CCC4] md:grid-cols-3">
            {STAY_TYPES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="bg-[#FAF8F5] p-7 sm:p-9">
                <Icon size={22} strokeWidth={1.5} className="text-[#8B6B55]" aria-hidden="true" />
                <h2 className="mt-12 font-marcellus text-2xl text-[#2D2622]">{title}</h2>
                <p className="mt-4 text-sm leading-relaxed text-[#6F5A4D]">{text}</p>
                <CheckCircle2 size={18} className="mt-10 text-[#B99D88]" aria-hidden="true" />
              </article>
            ))}
          </div>
        </GsapFadeIn>
      </section>

      <section className="bg-[#EAE1DD] px-6 py-20 sm:px-10 lg:px-16 lg:py-24">
        <GsapFadeIn className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <span className="eyebrow text-[#5A463A]">Your stay, your space</span>
          <ScrollWipeText className="font-marcellus mt-5 text-4xl leading-[0.98] tracking-[-0.04em] sm:text-6xl">
            Find the house that fits.
          </ScrollWipeText>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#5A463A]">
            Browse the three Serenity houses or get in touch if you need help choosing the right setup.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/houses" className="inline-flex items-center gap-3 bg-[#2D2622] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#5A463A]">
              Browse houses <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-3 border border-[#8B6B55] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[#2D2622] transition-colors hover:bg-white/60">
              Contact us <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </GsapFadeIn>
      </section>
    </main>
  );
}
