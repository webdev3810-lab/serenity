import type { Property } from "@/src/data/properties";

/** Server-rendered metadata; executable theme initialization lives in root next/script. */
export function PropertyStructuredData({ property }: { property: Property }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    name: property.listingTitle?.trim() || property.name.replace(/\s+-\s+Whole$/i, ""),
    description: property.fullDescription,
    containsPlace: { "@type": "Accommodation", occupancy: { "@type": "QuantitativeValue", value: property.maxGuests } },
    address: { "@type": "PostalAddress", addressLocality: property.location, addressCountry: "AU" },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
