import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, CircleCheck, House, KeyRound, Monitor } from "lucide-react";
import { pageMetadata } from "@/src/lib/seo";
import { getPublicPageCopy, getPublicPageMedia } from "@/src/lib/supabase/content";
import { PUBLIC_PAGE_MEDIA } from "@/src/lib/publicPageMedia";
import styles from "./how-it-works.module.css";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata(
  "How It Works | Booking a Serenity Stay",
  "A simple guide to finding, booking, and arriving at a Serenity furnished home in Pakenham.",
);

export default async function HowItWorksPage() {
  const [media, copy] = await Promise.all([getPublicPageMedia(), getPublicPageCopy()]);
  const steps = [
    { title: copy.howStep1Title, description: copy.howStep1Lead, Icon: Monitor },
    { title: copy.howStep2Title, description: copy.howStep2Lead, Icon: House },
    { title: copy.howStep3Title, description: copy.howStep3Lead, Icon: CalendarDays },
    { title: copy.howStep4Title, description: copy.howStep4Lead, Icon: CircleCheck },
    { title: copy.howStep5Title, description: copy.howStep5Lead, Icon: KeyRound },
  ];
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Pakenham · Victoria</p>
          <h1>{copy.howHeroTitle}<span>.</span></h1>
          <h2>{copy.howHeroSubtitle}</h2>
          <p className={styles.heroLead}>{copy.howHeroLead}</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/homes">Explore our homes <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link className={styles.outlineButton} href="/corporate-stays#corporate-booking">Partner booking <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
        <figure className={styles.heroMedia}>
          <Image
            src={media.howHero.src}
            alt={media.howHero.alt}
            fill
            priority
            sizes="(max-width: 800px) 100vw, 52vw"
          />
          {media.howHero.src === PUBLIC_PAGE_MEDIA.howHero.src && <figcaption className="illustrative-photo-label">Illustrative image</figcaption>}
        </figure>
      </header>

      <section className={styles.process} aria-labelledby="how-it-works-process-title">
        <div className={styles.sectionIntro}>
          <div>
            <p className={styles.sectionLabel}>A simple path to your stay</p>
            <h2 id="how-it-works-process-title">{copy.howProcessTitle}</h2>
          </div>
          <p>{copy.howProcessLead}</p>
        </div>
        <div className={styles.processGrid}>
          <ol className={styles.steps}>
            {steps.map(({ title, description, Icon }, index) => (
              <li className={styles.step} key={title}>
                <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.stepIcon} aria-hidden="true"><Icon size={22} strokeWidth={1.7} /></span>
                <div className={styles.stepCopy}>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
          <figure className={styles.processMedia}>
            <Image
              src={media.howArrival.src}
              alt={media.howArrival.alt}
              fill
              sizes="(max-width: 900px) 100vw, 37vw"
            />
            {media.howArrival.src === PUBLIC_PAGE_MEDIA.howArrival.src && <figcaption className="illustrative-photo-label">Illustrative image</figcaption>}
          </figure>
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="how-it-works-closing-title">
        <div className={styles.closingCopy}>
          <p className={styles.eyebrow}>The stay starts here</p>
          <h2 id="how-it-works-closing-title" style={{ whiteSpace: "pre-line" }}>{copy.howClosingTitle}</h2>
          <p>{copy.howClosingLead}</p>
          <div className={styles.closingActions}>
            <Link href="/homes">View our homes <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link href="/contact">Ask a question <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
        <figure className={styles.closingMedia}>
          <Image src={media.howClosing.src} alt={media.howClosing.alt} fill sizes="(max-width: 700px) 100vw, 52vw" />
          {media.howClosing.src === PUBLIC_PAGE_MEDIA.howClosing.src && <figcaption className="illustrative-photo-label">Illustrative image</figcaption>}
        </figure>
      </section>
    </div>
  );
}
