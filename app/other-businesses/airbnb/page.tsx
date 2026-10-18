import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Bath, BedDouble, MapPin, Users, WashingMachine, Wifi } from "lucide-react";
import { pageMetadata } from "@/src/lib/seo";
import { AIRBNB_URL, ORANI_PHOTOS } from "../listing";
import styles from "../other-businesses.module.css";

export const metadata = pageMetadata(
  "Vacation Home in Orani Bataan",
  "Explore a peaceful entire-home stay in Orani, Bataan, Philippines. View live availability and book on Airbnb.",
);

export default function AirbnbHomePage() {
  return (
    <div className={styles.page}>
      <div className={styles.stayMain}>
        <header className={styles.stayMasthead}>
          <Link href="/other-businesses" className={styles.backLink}><ArrowLeft size={18} aria-hidden="true" /> Back to other businesses</Link>
          <div className={styles.stayHeading}>
            <div>
              <p className={styles.eyebrow}>Vacation home in Orani Bataan</p>
              <h1>Casa de<br /><em>Vacacion.</em></h1>
            </div>
            <div className={styles.stayIntro}>
              <p><MapPin size={18} aria-hidden="true" /> Orani, Bataan, Philippines</p>
              <a href={AIRBNB_URL} target="_blank" rel="noopener noreferrer" className={styles.primaryButton}>View on Airbnb <ArrowUpRight size={19} aria-hidden="true" /></a>
            </div>
          </div>
        </header>

        <div className={styles.photoGrid}>
          {ORANI_PHOTOS.map((photo, index) => (
            <div className={`${styles.photo} ${index === 0 ? styles.photoMain : ""}`} key={photo.src}>
              <Image src={photo.src} alt={photo.alt} fill sizes={index === 0 ? "(max-width: 760px) 100vw, 50vw" : "(max-width: 760px) 50vw, 25vw"} unoptimized referrerPolicy="no-referrer" />
            </div>
          ))}
        </div>

        <section className={styles.stayDetails} aria-labelledby="orani-about-title">
          <div className={styles.stayCopy}>
            <p className={styles.eyebrow}>Your space</p>
            <h2 id="orani-about-title">A quiet place<br />to settle in.</h2>
            <p>Enjoy a peaceful entire-home stay in Orani. There’s room to slow down, spend time together, and make the space your own.</p>
            <p>For current photos, house rules, pricing and available dates, visit the Airbnb listing.</p>
          </div>
          <div className={styles.stayFacts}>
            <p className={styles.factsLabel}>At a glance</p>
            <div><Users size={22} aria-hidden="true" /><span>Up to 2 guests</span></div>
            <div><BedDouble size={22} aria-hidden="true" /><span>2 bedrooms · 2 beds</span></div>
            <div><Bath size={22} aria-hidden="true" /><span>1 bathroom</span></div>
            <div><Wifi size={22} aria-hidden="true" /><span>Wi-Fi</span></div>
            <div><WashingMachine size={22} aria-hidden="true" /><span>Washing machine</span></div>
          </div>
        </section>

        <aside className={styles.bookingBand}>
          <div>
            <p className={styles.eyebrow}>Plan your stay</p>
            <h2>Ready for Orani?</h2>
            <p>Check live availability and book securely on Airbnb.</p>
          </div>
          <a href={AIRBNB_URL} target="_blank" rel="noopener noreferrer" className={styles.lightButton}>See the Airbnb listing <ArrowUpRight size={19} aria-hidden="true" /></a>
        </aside>
      </div>
    </div>
  );
}
