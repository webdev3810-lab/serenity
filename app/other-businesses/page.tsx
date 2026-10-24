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
      <div className={styles.hubHeroContent}><div><h1>{content.hub.title}</h1></div><p>{content.hub.description}</p></div>
    </header>
    <main className={styles.hubMain}>
      <div className={styles.businessGrid}>{entries.map(({ key, path }) => {
        const business = content.businesses[key];
        const photos = [business.cardImage, ...business.galleryImages];
        return <article className={styles.businessCard} key={key}>
          <div className={`${styles.businessBody} ${styles.businessIntro}`}>
            <p className={styles.businessLocation}><MapPin size={16} aria-hidden="true" /> {business.cardLocation}</p>
            <h3>{business.name}</h3><p>{business.cardDescription}</p>
            <ul className={styles.businessFacts}>{business.cardFacts.map((fact, index) => <li key={index}>{fact}</li>)}</ul>
          </div>
          <Link href={path} className={styles.businessGallery} aria-label={`View ${business.name} details`}>
            {photos.map((photo, index) => <div className={`${styles.businessPhoto} ${index === 0 ? styles.businessPhotoMain : ""}`} key={index}>
              <Image src={photo.src} alt={photo.alt} fill sizes={index === 0 ? "(max-width: 760px) 100vw, 35vw" : "(max-width: 760px) 50vw, 18vw"} unoptimized={photo.src.includes("muscache.com")} />
              {index === 0 && photo.label && <span className={`${styles.galleryDisclosure} illustrative-photo-label`}>{photo.label}</span>}
            </div>)}
          </Link>
          <div className={`${styles.businessActions} ${styles.businessGalleryActions}`}>
            <Link href={path} className={styles.businessAction}>{business.cardCta} <ArrowRight size={18} aria-hidden="true" /></Link>
            <a href={business.externalUrl} target="_blank" rel="noopener noreferrer" className={styles.businessSecondary}>{business.cardExternalCta} <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
        </article>;
      })}</div>
      <div className={styles.hubClosing}><span>{content.hub.closingText}</span><Link href="/homes">{content.hub.closingCta} <ArrowRight size={17} aria-hidden="true" /></Link></div>
    </main>
  </div>;
}
