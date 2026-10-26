import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { getPublicProperties } from "@/src/lib/supabase/content";
import { pageMetadata } from "@/src/lib/seo";
import styles from "./page.module.css";

export const metadata = pageMetadata(
  "How It Works — Design Preview | Serenity",
  "An alternative design concept for the Serenity booking guide.",
);

const journey = [
  {
    number: "01",
    label: "The beginning",
    title: "Tell us about your stay.",
    description: "Have a Partner ID? Use it to begin your booking. Otherwise, send us an enquiry and tell us what you need.",
  },
  {
    number: "02",
    label: "The discovery",
    title: "Find a home that fits.",
    description: "Explore our furnished Serenity homes in Pakenham and choose the space that feels right for your people and plans.",
  },
  {
    number: "03",
    label: "The details",
    title: "Choose your dates.",
    description: "Select your preferred home, arrival date and length of stay. You can review the details before you continue.",
  },
  {
    number: "04",
    label: "The confirmation",
    title: "Make it yours.",
    description: "Complete the booking steps or submit your enquiry. We’ll confirm the arrangements for your stay.",
  },
  {
    number: "05",
    label: "The arrival",
    title: "Settle in with ease.",
    description: "Receive the stay information you need before arrival, then make yourself at home.",
  },
] as const;

export default async function HowItWorksDraftPage() {
  const properties = await getPublicProperties();
  const home = properties.find((property) => property.slug === "serenity-7") ?? properties[0];
  const livingRoom = home?.images.find((image) => /living[ -]?room|lounge/i.test(`${image.category ?? ""} ${image.categoryLabel ?? ""} ${image.alt}`));
  const bedroom = home?.images.find((image) => /bedroom/i.test(`${image.category ?? ""} ${image.categoryLabel ?? ""} ${image.alt}`));
  const heroImage = livingRoom ?? (home?.featuredImage ? { src: home.featuredImage } : null);
  const detailImage = bedroom ?? heroImage;

  return (
    <div className={styles.page}>
      <div className={styles.previewBar}>
        <span><i aria-hidden="true" /> Serenity design concept</span>
        <Link href="/how-it-works">View current page <ArrowUpRight size={14} aria-hidden="true" /></Link>
      </div>

      <section className={styles.hero} aria-labelledby="draft-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}><span>Serenity</span><span className={styles.kickerRule} />The booking guide</p>
          <h1 id="draft-title">The art of<br /><em>arriving.</em></h1>
          <p className={styles.heroIntro}>Every memorable stay begins with a feeling of ease. From your first enquiry to the moment you settle in, here’s how we make room for what matters.</p>
          <div className={styles.heroActions}>
            <Link href="/homes" className={styles.primaryAction}>Explore our homes <ArrowUpRight size={18} aria-hidden="true" /></Link>
            <Link href="#journey" className={styles.textAction}>See how it works <ArrowDown size={17} aria-hidden="true" /></Link>
          </div>
          <div className={styles.heroFootnote}><span>Private furnished homes</span><span>Pakenham · Victoria</span></div>
        </div>
        <div className={styles.heroVisual}>
          {heroImage ? <Image src={heroImage.src} alt={`${home?.name ?? "Serenity"} ${livingRoom ? "living room" : "furnished home"}`} fill priority sizes="(max-width: 850px) 100vw, 55vw" unoptimized={heroImage.src.startsWith("http")} className={styles.coverImage} /> : <div className={styles.imagePlaceholder} />}
          <div className={styles.heroImageCaption}><span>01 / Serenity at home</span><span>Thoughtful stays, simply arranged.</span></div>
        </div>
      </section>

      <div className={styles.chapterLine} aria-hidden="true"><span>01 — 05</span><span className={styles.chapterOrnament}>✦</span><span>Your stay, considered</span></div>

      <section id="journey" className={styles.journey} aria-labelledby="journey-title">
        <div className={styles.journeyIntro}>
          <p className={styles.sectionKicker}>A seamless experience</p>
          <h2 id="journey-title">Five simple steps.<br /><em>One easy arrival.</em></h2>
          <p>Clear from the start and comfortable all the way through. Your Serenity stay comes together one thoughtful step at a time.</p>
          <div className={styles.journeyAccent} aria-hidden="true"><span /></div>
        </div>
        <ol className={styles.journeyList}>
          {journey.map((step) => (
            <li className={styles.journeyStep} key={step.number}>
              <span className={styles.stepNumber}>{step.number}</span>
              <div className={styles.stepCopy}>
                <p>{step.label}</p>
                <h3>{step.title}</h3>
                <span>{step.description}</span>
              </div>
              <ArrowUpRight className={styles.stepArrow} size={22} strokeWidth={1.2} aria-hidden="true" />
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.pause} aria-label="A place to feel at home">
        <div className={styles.pauseImage}>
          {detailImage ? <Image src={detailImage.src} alt={`${home?.name ?? "Serenity"} ${bedroom ? "bedroom" : "furnished home"}`} fill sizes="(max-width: 850px) 100vw, 50vw" unoptimized={detailImage.src.startsWith("http")} className={styles.coverImage} /> : <div className={styles.imagePlaceholder} />}
        </div>
        <div className={styles.pauseCopy}>
          <p className={styles.sectionKicker}>Beyond the booking</p>
          <span className={styles.goldMark} aria-hidden="true">✦</span>
          <h2>Make yourself<br /><em>at home.</em></h2>
          <p>Space to rest. Space to work. Space to be together. A private furnished home gives you room to settle into your own rhythm.</p>
          <Link href="/guest-information">Explore guest information <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="closing-title">
        <p className={styles.sectionKicker}>Whenever you&apos;re ready</p>
        <div className={styles.closingGrid}>
          <h2 id="closing-title">Your next stay<br /><em>starts here.</em></h2>
          <div>
            <p>Discover the Serenity homes, or speak with us about a partner booking. We&apos;ll help you find the right way forward.</p>
            <div className={styles.closingActions}>
              <Link href="/homes">Explore the homes <ArrowUpRight size={18} aria-hidden="true" /></Link>
              <Link href="/corporate-stays#corporate-booking">Partner booking <ArrowUpRight size={18} aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
        <div className={styles.closingFoot}><span>Serenity Corporate Bookings</span><span>Pakenham, Victoria</span></div>
      </section>
    </div>
  );
}
