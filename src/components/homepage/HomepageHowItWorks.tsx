import Image from "next/image";
import { CalendarDays, CircleCheck, House, KeyRound, Monitor } from "lucide-react";
import type { PublicPageCopy } from "@/src/lib/publicPageCopy";
import { PUBLIC_PAGE_MEDIA, type PublicPageMedia } from "@/src/lib/publicPageMedia";
import styles from "./HomepageHowItWorks.module.css";

export default function HomepageHowItWorks({ copy, media }: { copy: PublicPageCopy; media: PublicPageMedia }) {
  const steps = [
    { title: copy.howStep1Title, description: copy.howStep1Lead, Icon: Monitor },
    { title: copy.howStep2Title, description: copy.howStep2Lead, Icon: House },
    { title: copy.howStep3Title, description: copy.howStep3Lead, Icon: CalendarDays },
    { title: copy.howStep4Title, description: copy.howStep4Lead, Icon: CircleCheck },
    { title: copy.howStep5Title, description: copy.howStep5Lead, Icon: KeyRound },
  ];

  return (
    <section id="how-it-works" className={styles.section} aria-labelledby="how-it-works-title">
      <div className={styles.frame}>
        <header className={styles.heading}>
          <h2 id="how-it-works-title">{copy.howHeroTitle}</h2>
          <div className={styles.headingCopy}>
            <p className={styles.tagline}>{copy.howProcessTitle}</p>
            <p className={styles.lead}>{copy.howProcessLead}</p>
          </div>
        </header>
        <div className={styles.body}>
          <ol className={styles.steps}>
            {steps.map(({ title, description, Icon }, index) => (
              <li className={styles.step} key={index}>
                <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                <div className={styles.stepCopy}><h3>{title}</h3><p>{description}</p></div>
                <span className={styles.stepIcon} aria-hidden="true"><Icon size={22} strokeWidth={1.6} /></span>
              </li>
            ))}
          </ol>
          <figure className={styles.photo}>
            <Image src={media.howArrival.src} alt={media.howArrival.alt} fill sizes="(max-width: 720px) 100vw, 36vw" />
            {media.howArrival.src === PUBLIC_PAGE_MEDIA.howArrival.src && <figcaption className="illustrative-photo-label">Illustrative image</figcaption>}
          </figure>
        </div>
      </div>
    </section>
  );
}
