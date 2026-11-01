import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { pageMetadata } from "@/src/lib/seo";
import { getOtherBusinessesContent } from "@/src/lib/supabase/otherBusinesses";
import type { BusinessKey } from "@/src/lib/otherBusinessesContent";
import styles from "./other-businesses.module.css";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "Other Businesses",
  "Explore our vacation home in Orani, Bataan and Specialist Suites & Allied Health Hub in Skye, Victoria.",
);

const entries: { key: BusinessKey; path: string }[] = [
  { key: "airbnb", path: "/other-businesses/airbnb" },
  { key: "specialistSuites", path: "/other-businesses/specialist-suites" },
];

export default async function OtherBusinessesPage() {
  const content = await getOtherBusinessesContent();
  return <div className={styles.page}>
    <header className={styles.hubHero}>
      <div className={styles.hubTopline}><span>{content.hub.topline}</span><span>{content.hub.category}</span></div>
      <div className={styles.hubHeroContent}>
        <div className={styles.hubHeroCopy}><h1>{content.hub.title}</h1><p>{content.hub.description}</p></div>
        <nav className={styles.hubQuickLinks} aria-label="Explore other businesses">
          {entries.map(({ key }, index) => <Link href={`#${key}`} key={key}>
            <span className={styles.hubQuickNumber}>0{index + 1}</span>
            <span><strong>{content.businesses[key].name}</strong><small>{content.businesses[key].cardLocation}</small></span>
            <ArrowUpRight size={19} aria-hidden="true" />
          </Link>)}
        </nav>
      </div>
    </header>
    <section className={styles.hubMain} aria-label="Our other businesses">
      <div className={styles.businessGrid}>{entries.map(({ key, path }, index) => {
        const business = content.businesses[key];
        const photos = [business.cardImage, ...business.galleryImages].slice(0, 4);
        return <article className={styles.businessCard} id={key} key={key}>
          <Link href={path} className={styles.businessGallery} aria-label={`View ${business.name} details`}>
            {photos.map((photo, index) => <div className={`${styles.businessPhoto} ${index === 0 ? styles.businessPhotoMain : ""}`} key={index}>
              <Image src={photo.src} alt={photo.alt} fill sizes={index === 0 ? "(max-width: 760px) 100vw, 35vw" : "(max-width: 760px) 50vw, 18vw"} unoptimized={photo.src.includes("muscache.com")} />
              {index === 0 && photo.label && <span className={`${styles.galleryDisclosure} illustrative-photo-label`}>{photo.label}</span>}
            </div>)}
          </Link>
          <div className={styles.businessBody}>
            <div className={styles.businessMeta}><p className={styles.businessLocation}><MapPin size={16} aria-hidden="true" /> {business.cardLocation}</p><span>0{index + 1} / 0{entries.length}</span></div>
            <h2>{business.name}</h2><p className={styles.businessDescription}>{business.cardDescription}</p>
            <ul className={styles.businessFacts}>{business.cardFacts.map((fact, factIndex) => <li key={factIndex}>{fact}</li>)}</ul>
            <div className={styles.businessActions}>
              <Link href={path} className={styles.businessAction}>{business.cardCta} <ArrowRight size={18} aria-hidden="true" /></Link>
              <a href={business.externalUrl} target="_blank" rel="noopener noreferrer" className={styles.businessSecondary}>{business.cardExternalCta} <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </article>;
      })}</div>
      <div className={styles.hubClosing}><span>{content.hub.closingText}</span><Link href="/homes">{content.hub.closingCta} <ArrowRight size={17} aria-hidden="true" /></Link></div>
    </section>
  </div>;
}
