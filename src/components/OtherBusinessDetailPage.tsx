import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Bath, BedDouble, BriefcaseBusiness, DoorOpen, HeartPulse, MapPin, Users, WashingMachine, Wifi } from "lucide-react";
import type { BusinessContent, BusinessKey } from "@/src/lib/otherBusinessesContent";
import styles from "@/app/other-businesses/airbnb/airbnb-editorial.module.css";
import specialistStyles from "@/app/other-businesses/specialist-suites/specialist-editorial.module.css";

const factIcons = {
  airbnb: [Users, BedDouble, Wifi],
  specialistSuites: [DoorOpen, BriefcaseBusiness, HeartPulse],
};
const amenityIcons = [Bath, Wifi, WashingMachine];

export function OtherBusinessDetailPage({ business, kind }: { business: BusinessContent; kind: BusinessKey }) {
  const specialist = kind === "specialistSuites";
  const featureId = specialist ? "the-hub" : "the-home";
  const titleId = specialist ? "specialist-hub-title" : "orani-home-title";
  const galleryId = specialist ? "specialist-rooms-title" : "orani-rooms-title";
  const exploreId = specialist ? "specialist-benefits-title" : "orani-explore-title";
  return <main className={styles.page}>
    <div className={styles.shell}>
      <header className={styles.intro}>
        <Link href="/other-businesses" className={styles.backLink}><ArrowLeft size={17} aria-hidden="true" /> Other businesses</Link>
        <div className={styles.introGrid}>
          <div><p className={styles.eyebrow}>{business.introEyebrow}</p><h1 className={specialist ? specialistStyles.introTitle : undefined}>{business.introTitle}<br /><em>{business.introAccent}</em></h1></div>
          <div className={styles.introAside}><p>{business.introDescription}</p><div className={styles.actions}>
            <a href={`#${featureId}`} className={styles.solidButton}>{business.introPrimaryCta} <ArrowRight size={17} aria-hidden="true" /></a>
            <a href={business.externalUrl} target="_blank" rel="noopener noreferrer" className={styles.outlineButton}>{business.introSecondaryCta} <ArrowUpRight size={17} aria-hidden="true" /></a>
          </div></div>
        </div>
      </header>

      <section className={styles.feature} id={featureId} aria-labelledby={titleId}>
        <div className={styles.featureCopy}>
          <p className={styles.eyebrow}>{business.featureEyebrow}</p>
          <h2 className={specialist ? specialistStyles.hubTitle : undefined} id={titleId}>{business.featureTitle}<br /><em>{business.featureAccent}</em></h2>
          <p className={styles.featureLead}>{business.featureLead}</p>
          {business.featureParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          <p className={styles.featureSignoff}>{business.featureSignoff}</p>
          <div className={styles.actions}><a href={business.actionUrl} target="_blank" rel="noopener noreferrer" className={styles.solidButton}>{business.featureCta} <ArrowUpRight size={17} aria-hidden="true" /></a></div>
          <p className={styles.location}><MapPin size={17} aria-hidden="true" /> {business.featureLocation}</p>
        </div>
        <div className={`${styles.featureMedia} ${styles.featureLandscapeMedia}`}>
          <Image src={business.featureImage.src} alt={business.featureImage.alt} fill priority sizes="(max-width: 820px) 100vw, 50vw" unoptimized={business.featureImage.src.includes("muscache.com")} />
          {business.featureImageNote && <span className={styles.enhancedPhotoNote}>{business.featureImageNote}</span>}
        </div>
      </section>

      <div className={styles.factBand} aria-label={`${business.name} at a glance`}>
        {business.facts.map((fact, index) => { const Icon = factIcons[kind][index]; return <span key={index}><Icon size={20} aria-hidden="true" /><strong>{fact.title}</strong><small>{fact.detail}</small></span>; })}
      </div>

      <section className={styles.rooms} aria-labelledby={galleryId}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{business.galleryEyebrow}</p><h2 id={galleryId}>{business.galleryTitle}</h2></div><p>{business.galleryDescription}</p></div>
        <div className={styles.roomGrid}>{business.galleryImages.map((photo, index) => <figure key={index}><div className={styles.roomImage}><Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 700px) 100vw, 33vw" unoptimized={photo.src.includes("muscache.com")} /></div><figcaption>{photo.label}</figcaption></figure>)}</div>
        {business.galleryDisclosure && <p className={styles.imageDisclosure}>{business.galleryDisclosure}</p>}
        {business.amenities.length > 0 && <div className={styles.amenities} aria-label="Features">{business.amenities.map((amenity, index) => { const Icon = amenityIcons[index]; return <span key={index}><Icon size={18} aria-hidden="true" /> {amenity}</span>; })}</div>}
      </section>

      <section className={styles.explore} aria-labelledby={exploreId}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{business.exploreEyebrow}</p><h2 id={exploreId}>{business.exploreTitle}</h2></div><p>{business.exploreDescription}</p></div>
        <div className={styles.exploreGrid}>
          <div className={styles.exploreImage}><Image src={business.exploreImage.src} alt={business.exploreImage.alt} fill sizes="(max-width: 820px) 100vw, 45vw" unoptimized={business.exploreImage.src.includes("muscache.com")} referrerPolicy={business.exploreImage.src.includes("muscache.com") ? "no-referrer" : undefined} /><span>{business.exploreCaption}</span></div>
          <div className={styles.placeList}>{business.exploreItems.map((item, index) => <div key={index}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong><small>{item.detail}</small></div>)}<a href={business.exploreUrl} target="_blank" rel="noopener noreferrer">{business.exploreCta} <ArrowUpRight size={17} aria-hidden="true" /></a></div>
        </div>
      </section>

      <aside className={styles.plan}>
        <div><p className={styles.eyebrow}>{business.planEyebrow}</p><h2>{business.planTitle}<br />{business.planTitleSecond}</h2><p>{business.planDescription}</p><a href={business.actionUrl} target="_blank" rel="noopener noreferrer" className={styles.solidButton}>{business.planCta} <ArrowUpRight size={17} aria-hidden="true" /></a></div>
        <div className={styles.planDetails}><p className={styles.eyebrow}>{business.planDetailsEyebrow}</p><strong>{business.planDetailsTitle}</strong><span>{business.planDetailsSubtitle}</span><p>{business.planDetailsDescription}</p></div>
      </aside>
    </div>
  </main>;
}
