import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, CircleCheck, House, KeyRound, Monitor } from "lucide-react";
import { pageMetadata } from "@/src/lib/seo";
import styles from "./how-it-works.module.css";

export const metadata = pageMetadata(
  "How It Works | Booking a Serenity Stay",
  "A simple guide to finding, booking, and arriving at a Serenity furnished home in Pakenham.",
);

const steps = [
  {
    title: "Start with your enquiry",
    description: "Enter your Partner ID for direct access, or tell us what you need through a general enquiry.",
    Icon: Monitor,
  },
  {
    title: "Explore the homes",
    description: "Compare our furnished homes, room layouts and the details that matter to your stay.",
    Icon: House,
  },
  {
    title: "Choose your dates",
    description: "Find the home and stay dates that work for you, your family or your team.",
    Icon: CalendarDays,
  },
  {
    title: "Finalise your booking",
    description: "Review the arrangements and receive confirmation once your booking is complete.",
    Icon: CircleCheck,
  },
  {
    title: "Arrive with confidence",
    description: "We’ll share the stay and arrival details you need before check-in.",
    Icon: KeyRound,
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Pakenham · Victoria</p>
          <h1>How it works<span>.</span></h1>
          <h2>From enquiry to feeling at home.</h2>
          <p className={styles.heroLead}>Finding a place to feel at home should be simple. From your first enquiry to the day you arrive, here’s what to expect.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/homes">Explore our homes <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link className={styles.outlineButton} href="/corporate-stays#corporate-booking">Partner booking <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
        <figure className={styles.heroMedia}>
          <Image
            src="/how-it-works-hero.jpg"
            alt="Illustrative sunlit furnished living and dining room"
            fill
            priority
            sizes="(max-width: 800px) 100vw, 52vw"
          />
          <figcaption className="illustrative-photo-label">Illustrative image</figcaption>
        </figure>
      </header>

      <section className={styles.process} aria-labelledby="how-it-works-process-title">
        <div className={styles.sectionIntro}>
          <div>
            <p className={styles.sectionLabel}>A simple path to your stay</p>
            <h2 id="how-it-works-process-title">From first look to feeling at home.</h2>
          </div>
          <p>Five clear steps, with support along the way. Explore at your own pace and enquire when you’re ready.</p>
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
              src="/how-it-works-arrival.jpg"
              alt="Illustrative furnished home entry with a suitcase ready for arrival"
              fill
              sizes="(max-width: 900px) 100vw, 37vw"
            />
            <figcaption className="illustrative-photo-label">Illustrative image</figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="how-it-works-closing-title">
        <div className={styles.closingCopy}>
          <p className={styles.eyebrow}>The stay starts here</p>
          <h2 id="how-it-works-closing-title">Move in.<br />Settle in.<br />Feel at home.</h2>
          <p>Explore the real Serenity homes and find the right fit for work, family or life’s transitions.</p>
          <div className={styles.closingActions}>
            <Link href="/homes">View our homes <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link href="/contact">Ask a question <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
        <figure className={styles.closingMedia}>
          <Image src="/how-it-works-settle-in-v1.jpg" alt="Illustrative furnished home entry opening into a living and dining area" fill sizes="(max-width: 700px) 100vw, 52vw" />
          <figcaption className="illustrative-photo-label">Illustrative image</figcaption>
        </figure>
      </section>
    </div>
  );
}
