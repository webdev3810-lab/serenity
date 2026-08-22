import type { Metadata } from "next";

const siteName = "Serenity Stays";
const defaultDescription = "Direct-book furnished houses in Pakenham, South East Melbourne, Victoria, Australia for family, corporate, relocation and extended stays.";

export const pageMetadata = (title: string, description = defaultDescription): Metadata => ({
  title: `${title} | ${siteName}`,
  description,
  openGraph: {
    title: `${title} | ${siteName}`,
    description,
    images: ["/og-placeholder.jpg"],
  },
});

export const lodgingBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: "Serenity Stays",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Pakenham",
    addressRegion: "VIC",
    addressCountry: "AU",
  },
  description: defaultDescription,
};
