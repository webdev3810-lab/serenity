import { GsapFadeIn } from "./AnimatedSection";
import { ApproximateMap } from "@/src/components/ApproximateMap";
import { useContactSettings } from "@/src/context/ContactSettingsContext";
import { DEFAULT_CONTACT_SETTINGS } from "@/src/lib/siteSettings";
import ScrollWipeText from "./ScrollWipeText";

export interface LocationFact {
  label: string;
  detail: string;
}

export interface HomepageLocationSectionProps {
  heading: string;
  description: string;
  phoneLabel: string;
  phoneNumber: string;
  emailLabel: string;
  emailAddress: string;
  directionsLabel: string;
  directionsLink: string;
  privacyMessage: string;
  mapTitle: string;
  publicText: string;
  facts: LocationFact[];
  className?: string;
}

/**
 * Premium editorial location section.
 * Features a centred heading, a row of three contact buttons,
 * and a 2-column layout with a map and location facts.
 */
export default function HomepageLocationSection({
  heading,
  description,
  phoneLabel,
  phoneNumber,
  emailLabel,
  emailAddress,
  directionsLabel,
  directionsLink,
  privacyMessage,
  mapTitle,
  publicText,
  facts,
  className = "",
}: HomepageLocationSectionProps) {
  const contact = useContactSettings() ?? DEFAULT_CONTACT_SETTINGS;
  const resolvedPhoneNumber = phoneNumber || contact.phoneNumber;
  const resolvedEmailAddress = emailAddress || contact.contactEmail;
  const resolvedDirectionsLink = directionsLink || contact.directionsUrl;

  // Format contact values as safe browser links while keeping the component's
  // existing content props available for future homepage CMS sections.
  const phoneHref = resolvedPhoneNumber ? `tel:${resolvedPhoneNumber.replace(/[^+\d]/g, "")}` : "#";
  const emailHref = resolvedEmailAddress ? `mailto:${resolvedEmailAddress}` : "#";

  return (
    <section className={`py-24 lg:py-32 bg-white text-stone-900 overflow-hidden ${className}`}>
      <GsapFadeIn className="w-full max-w-[85rem] mx-auto px-6 lg:px-12">
        {/* Heading Area */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <ScrollWipeText className="font-marcellus text-4xl sm:text-5xl lg:text-6xl text-[#2D2622] leading-[1.1] mb-6 tracking-tight">
            {heading}
          </ScrollWipeText>
          <p className="text-base sm:text-lg text-stone-600 leading-relaxed font-sans">
            {description}
          </p>
        </div>

        {/* Contact Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-16 lg:mb-24">
          <a
            href={phoneHref}
            className="flex items-center justify-center w-full md:w-56 px-6 py-4 border border-[#D8CCC4] text-[11px] font-bold tracking-[0.2em] uppercase text-stone-800 hover:bg-white hover:border-[#B99D88] transition-all duration-300"
          >
            {phoneLabel}
          </a>
          <a
            href={emailHref}
            className="flex items-center justify-center w-full md:w-56 px-6 py-4 border border-[#D8CCC4] text-[11px] font-bold tracking-[0.2em] uppercase text-stone-800 hover:bg-white hover:border-[#B99D88] transition-all duration-300"
          >
            {emailLabel}
          </a>
          <a
            href={resolvedDirectionsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full md:w-56 px-6 py-4 border border-[#D8CCC4] text-[11px] font-bold tracking-[0.2em] uppercase text-stone-800 hover:bg-white hover:border-[#B99D88] transition-all duration-300"
          >
            {directionsLabel}
          </a>
        </div>

        {/* 2-Column Map & Info Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Map Column */}
          <div className="w-full h-[400px] lg:h-[500px] rounded-none overflow-hidden shadow-xl shadow-stone-200/50 border border-[#EAE1DD]">
            <ApproximateMap title={mapTitle} compact={false} />
          </div>

          {/* Info Column */}
          <div className="flex flex-col justify-center h-full pt-4 lg:pt-8">
            <div className="mb-10 lg:mb-12">
              <h3 className="font-marcellus text-3xl sm:text-4xl text-[#2D2622] mb-4">
                {publicText}
              </h3>
              <p className="text-stone-600 text-base leading-relaxed">
                Contact us to request more details about the local area, or for help planning your arrival. We are here to ensure your stay is completely seamless.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-8 mb-12">
              {facts.map(({ label, detail }, index) => (
                <div key={index}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8B6B55] mb-2">
                    {label}
                  </p>
                  <p className="text-base font-semibold text-stone-800">
                    {detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t border-[#D8CCC4]">
              <p className="text-sm text-stone-500 italic leading-relaxed">
                {privacyMessage}
              </p>
            </div>
          </div>
        </div>
      </GsapFadeIn>
    </section>
  );
}
