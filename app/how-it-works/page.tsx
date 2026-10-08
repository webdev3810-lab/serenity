import Image from "next/image";
import Link from "next/link";
import { CalendarDays, CircleCheck, House, KeyRound, Monitor } from "lucide-react";
import { pageMetadata } from "@/src/lib/seo";
import { getPublicProperties } from "@/src/lib/supabase/content";
import styles from "./how-it-works.module.css";

export const metadata = pageMetadata(
  "How It Works | Booking a Serenity Stay",
  "A simple guide to finding, booking, and arriving at a Serenity furnished home in Pakenham.",
);

const steps = [
  {
    title: "Enter your Partner ID or enquire",
    description: "Use your Partner ID for direct access or send a general enquiry.",
    Icon: Monitor,
  },
  {
    title: "View available homes",
    description: "Explore our range of fully furnished homes.",
    Icon: House,
  },
  {
    title: "Select your dates",
    description: "Choose your preferred stay dates and home.",
    Icon: CalendarDays,
  },
  {
    title: "Confirm your booking",
    description: "Complete your booking and receive instant confirmation.",
    Icon: CircleCheck,
  },
  {
    title: "Receive your stay details",
    description: "Get all the information you need for a smooth arrival.",
    Icon: KeyRound,
  },
] as const;

export default async function HowItWorksPage() {
  const properties = await getPublicProperties();
  const home = properties.find((property) => property.slug === "serenity-7") ?? properties[0];
  const roomImage = home?.images.find((image) => /bedroom/i.test(image.alt)) ?? home?.images.find((image) => /living room/i.test(image.alt));
  const image = roomImage ?? (home?.featuredImage ? { src: home.featuredImage, alt: `${home.name} furnished home` } : null);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTopline}>
          <span>The Serenity booking guide</span>
          <span>Pakenham · Victoria</span>
        </div>
        <div className={styles.heroGrid}>
          <div>
            <p className={styles.eyebrow}>A simple and seamless booking process</p>
            <h1>How it works<span>.</span></h1>
          </div>
          <div className={styles.heroIntro}>
            <p>Whether you’re a partner using your Partner ID or a guest making a general enquiry, booking a Serenity home is quick and easy.</p>
            <div className={styles.heroLinks}>
              <Link href="/houses">Explore our homes <span aria-hidden="true">↗</span></Link>
              <Link href="/corporate-stays#corporate-booking">Partner booking <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </div>
      </header>

      <section className={styles.process} aria-labelledby="how-it-works-process-title">
        <div className={styles.sectionIntro}>
          <p className={styles.sectionLabel}>01 / Your journey</p>
          <h2 id="how-it-works-process-title">From first look to feeling at home.</h2>
        </div>
        <ol className={styles.steps}>
          {steps.map(({ title, description, Icon }, index) => (
            <li className={styles.step} key={title}>
              <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
              <div className={styles.stepHeading}>
                <span className={styles.stepIcon} aria-hidden="true"><Icon size={24} strokeWidth={1.6} /></span>
                <h3>{title}</h3>
              </div>
              <p>{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.closing} aria-labelledby="how-it-works-closing-title">
        <div className={styles.closingMedia}>
          {image ? <Image src={image.src} alt={image.alt} fill sizes="(max-width: 800px) 100vw, 50vw" unoptimized={image.src.startsWith("http")} /> : <span>Serenity on the Rocks</span>}
        </div>
        <div className={styles.closingCopy}>
          <p className={styles.eyebrow}>The stay starts here</p>
          <h2 id="how-it-works-closing-title">Move in.<br />Settle in.<br />Feel at home.</h2>
          <p>Quality furnished homes, ready when you are. Flexible stays for work, family, or life’s transitions.</p>
          <Link href="/houses">Check availability <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </div>
  );
}
