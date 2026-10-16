import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { pageMetadata } from "@/src/lib/seo";
import { AIRBNB_URL, ORANI_PHOTOS } from "./listing";
import styles from "./other-businesses.module.css";

const SPECIALIST_SUITES_URL = "https://specialistsuiteshub.com.au/";
const SPECIALIST_SUITES_IMAGE = "https://jiuvzvqeoguxjprpltsf.supabase.co/storage/v1/object/public/site-media/benefits/a47efbb3-b90d-4342-a8ed-fa65cf8d4301-front.webp";

export const metadata = pageMetadata(
  "Other Businesses",
  "Explore our vacation home in Orani, Bataan and Specialist Suites & Allied Health Hub in Skye, Victoria.",
);

export default function OtherBusinessesPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hubHero}>
        <div className={styles.hubTopline}>
          <span>Serenity / Beyond our homes</span>
          <span>Hospitality &amp; professional spaces</span>
        </div>
        <div className={styles.hubHeroContent}>
          <div>
            <h1>Other businesses</h1>
          </div>
          <p>From a getaway in the Philippines to purpose-built spaces for healthcare professionals in Victoria, explore what else we do.</p>
        </div>
      </header>

      <main className={styles.hubMain}>
        <div className={styles.hubSectionHeading}>
          <div>
            <p className={styles.eyebrow}>Explore more</p>
            <h2>Two spaces, two stories.</h2>
          </div>
          <p>Choose a place to stay or a space to practise.</p>
        </div>

        <div className={styles.businessGrid}>
          <article className={styles.businessCard}>
            <a href={AIRBNB_URL} target="_blank" rel="noopener noreferrer" className={styles.businessImage} aria-label="Open Casa de Vacacion on Airbnb">
              <Image src={ORANI_PHOTOS[0].src} alt={ORANI_PHOTOS[0].alt} fill sizes="(max-width: 760px) 100vw, 50vw" unoptimized referrerPolicy="no-referrer" />
            </a>
            <div className={styles.businessBody}>
              <p className={styles.businessLocation}><MapPin size={16} aria-hidden="true" /> Orani, Bataan · Philippines</p>
              <h3>Casa de Vacacion</h3>
              <p>A private home for a peaceful getaway in Bataan. See photos, availability and booking details on Airbnb.</p>
              <a href={AIRBNB_URL} target="_blank" rel="noopener noreferrer" className={styles.businessAction}>Open on Airbnb <ArrowUpRight size={19} aria-hidden="true" /></a>
              <Link href="/other-businesses/airbnb" className={styles.businessSecondary}>View home details <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </article>

          <article className={styles.businessCard}>
            <a href={SPECIALIST_SUITES_URL} target="_blank" rel="noopener noreferrer" className={styles.businessImage} aria-label="Open Specialist Suites & Allied Health Hub website">
              <Image src={SPECIALIST_SUITES_IMAGE} alt="Front of Specialist Suites & Allied Health Hub in Skye" fill sizes="(max-width: 760px) 100vw, 50vw" />
            </a>
            <div className={styles.businessBody}>
              <p className={styles.businessLocation}><MapPin size={16} aria-hidden="true" /> Skye, Victoria · Australia</p>
              <h3>Specialist Suites</h3>
              <p>Consulting rooms and treatment-ready spaces for healthcare professionals.</p>
              <a href={SPECIALIST_SUITES_URL} target="_blank" rel="noopener noreferrer" className={styles.businessAction}>Visit Specialist Suites <ArrowUpRight size={19} aria-hidden="true" /></a>
            </div>
          </article>
        </div>

        <div className={styles.hubClosing}>
          <span>Looking for a furnished home in Pakenham?</span>
          <Link href="/houses">Explore Serenity homes <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </main>
    </div>
  );
}
