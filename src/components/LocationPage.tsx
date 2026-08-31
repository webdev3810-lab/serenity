import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { ApproximateMap } from "@/src/components/ApproximateMap";
import { GsapFadeIn } from "@/src/components/GsapAnimations";
import ScrollWipeText from "@/src/components/homepage/ScrollWipeText";
import type { ContactSettings } from "@/src/lib/siteSettings";

const LOCATION_FACTS = [
  ["Train station", "Around a 5-minute walk to Pakenham Station."],
  ["Local essentials", "Shops, supermarkets, cafés, and restaurants nearby."],
  ["Road access", "Easy access to the Princes Freeway and the wider Gippsland region."],
  ["Work and projects", "Convenient for Pakenham Industrial Park and surrounding businesses."],
];

export function LocationPage({ contact }: { contact: ContactSettings }) {
  return (
    <main className="location-editorial-page">
      <section className="location-editorial-hero">
        <GsapFadeIn className="location-editorial-shell">
          <ScrollWipeText
            as="h1"
            aria-label="Close to what brings you here."
            className="location-editorial-hero-title display-font"
          >
            Close to what brings you here.
          </ScrollWipeText>

          <div className="location-editorial-hero-footer">
            <p className="location-editorial-lead">
              Serenity houses sit in a quiet Pakenham neighbourhood, close to transport,
              everyday essentials, and the places guests need for work, family visits,
              and longer stays.
            </p>
            <div className="location-editorial-privacy">
              <MapPin size={17} aria-hidden="true" />
              <p>
                {contact.publicAddress ? `${contact.publicAddress}. ` : ""}
                Exact street details are shared after a confirmed booking to protect guest privacy.
              </p>
            </div>
          </div>
        </GsapFadeIn>
      </section>

      <section className="location-editorial-map-section" aria-labelledby="location-map-heading">
        <GsapFadeIn className="location-editorial-map-heading location-editorial-shell">
          <ScrollWipeText
            as="h2"
            aria-label="Where you'll be."
            className="location-editorial-section-title font-marcellus"
          >
            Where you&apos;ll be.
          </ScrollWipeText>
          <p className="location-editorial-section-copy" id="location-map-heading">
            One shared approximate pin shows the neighbourhood because Serenity 7,
            Serenity 9, and Serenity 11 sit beside each other.
          </p>
        </GsapFadeIn>

        <div className="location-editorial-map">
          <ApproximateMap title="Where you'll be" compact={false} borderless fullHeight hideHeader />
        </div>

        <div className="location-editorial-map-footer location-editorial-shell">
          <p>
            Pakenham VIC 3810 · approximately 55 kilometres south-east of Melbourne CBD.
          </p>
          <div>
            <a href={contact.directionsUrl} target="_blank" rel="noopener noreferrer">
              Get directions <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer">
              Open map <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className="location-editorial-neighbourhood">
        <GsapFadeIn className="location-editorial-shell">
          <div className="location-editorial-neighbourhood-heading">
            <ScrollWipeText
              as="h2"
              aria-label="Everything you need is nearby."
              className="location-editorial-section-title font-marcellus"
            >
              Everything you need is nearby.
            </ScrollWipeText>
            <p className="location-editorial-section-copy">
              Stay close to the station and town centre without giving up the privacy
              of a whole house. Pakenham is a practical location for South East Melbourne,
              Cardinia, and Gippsland.
            </p>
          </div>

          <div className="location-editorial-facts">
            {LOCATION_FACTS.map(([label, detail], index) => (
              <article key={label}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{label}</h3>
                <p>{detail}</p>
              </article>
            ))}
          </div>

          <div className="location-editorial-actions">
            <p>Explore the houses and rooms, or ask us which setup fits your stay.</p>
            <div>
              <Link href="/gallery" className="location-editorial-button location-editorial-button-primary">
                Explore the gallery <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
              <Link href="/contact" className="location-editorial-button">
                Ask a question <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </GsapFadeIn>
      </section>
    </main>
  );
}
