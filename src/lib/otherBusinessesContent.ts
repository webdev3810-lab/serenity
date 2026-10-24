import { AIRBNB_URL, ORANI_ENHANCED_EXTERIOR, ORANI_ENHANCED_INTERIORS, ORANI_PHOTOS, ORANI_PREVIEW_IMAGE, SPECIALIST_SUITES_IMAGE, SPECIALIST_SUITES_PHOTOS, SPECIALIST_SUITES_URL } from "@/app/other-businesses/listing";

export const OTHER_BUSINESSES_PAGE_KEY = "other-businesses";
export type BusinessKey = "airbnb" | "specialistSuites";
export type BusinessImage = { src: string; alt: string; label: string };
export type BusinessFact = { title: string; detail: string };
export type BusinessContent = {
  name: string; cardLocation: string; cardDescription: string; cardFacts: string[]; cardCta: string; cardExternalCta: string; cardImage: BusinessImage;
  externalUrl: string; actionUrl: string; introEyebrow: string; introTitle: string; introAccent: string; introDescription: string; introPrimaryCta: string; introSecondaryCta: string;
  featureEyebrow: string; featureTitle: string; featureAccent: string; featureLead: string; featureParagraphs: string[]; featureSignoff: string; featureCta: string; featureLocation: string; featureImage: BusinessImage; featureImageNote: string;
  facts: BusinessFact[]; galleryEyebrow: string; galleryTitle: string; galleryDescription: string; galleryImages: BusinessImage[]; galleryDisclosure: string; amenities: string[];
  exploreEyebrow: string; exploreTitle: string; exploreDescription: string; exploreImage: BusinessImage; exploreCaption: string; exploreItems: BusinessFact[]; exploreCta: string; exploreUrl: string;
  planEyebrow: string; planTitle: string; planTitleSecond: string; planDescription: string; planCta: string; planDetailsEyebrow: string; planDetailsTitle: string; planDetailsSubtitle: string; planDetailsDescription: string;
};
export type OtherBusinessesContent = {
  hub: { topline: string; category: string; title: string; description: string; closingText: string; closingCta: string };
  businesses: Record<BusinessKey, BusinessContent>;
};

export const DEFAULT_OTHER_BUSINESSES: OtherBusinessesContent = {
  hub: {
    topline: "Serenity / Beyond our homes", category: "Hospitality & professional spaces", title: "Other businesses",
    description: "From a getaway in the Philippines to purpose-built spaces for healthcare professionals in Victoria, explore what else we do.",
    closingText: "Looking for a furnished home in Pakenham?", closingCta: "Explore Serenity homes",
  },
  businesses: {
    airbnb: {
      name: "Casa de Vacacion", cardLocation: "Orani, Bataan · Philippines",
      cardDescription: "Your private retreat in Bataan. Slow down and settle into an entire two-bedroom holiday home, with space to reconnect, explore Orani or simply take a well-earned break.",
      cardFacts: ["Entire private home", "Wi-Fi and laundry", "Explore Bataan"], cardCta: "View Casa de Vacacion", cardExternalCta: "Check Airbnb availability",
      cardImage: { src: ORANI_PREVIEW_IMAGE, alt: "Illustrative tropical Philippines coastal scene, not the rental property", label: "Illustrative Philippines scenery" },
      externalUrl: AIRBNB_URL, actionUrl: AIRBNB_URL, introEyebrow: "Casa de Vacacion · Orani, Bataan", introTitle: "Your next stay", introAccent: "starts here.",
      introDescription: "A private place to pause, reconnect and explore Bataan at your own pace.", introPrimaryCta: "Explore the home", introSecondaryCta: "View on Airbnb",
      featureEyebrow: "Furnished private home · Bataan", featureTitle: "Casa de", featureAccent: "Vacacion", featureLead: "Your Private Retreat in Bataan",
      featureParagraphs: ["Slow down, settle in and enjoy a place of your own. Our two-bedroom holiday home in Orani offers a peaceful setting for reconnecting with loved ones, exploring Bataan or simply taking a well-earned break.", "Enjoy the privacy of an entire home, with Wi-Fi to keep you connected and laundry facilities for everyday convenience. Whether you’re returning to the Philippines or discovering somewhere new, make yourself at home."],
      featureSignoff: "A little time away. A place to call your own.", featureCta: "Book on Airbnb", featureLocation: "Orani, Bataan, Philippines",
      featureImage: { src: ORANI_ENHANCED_EXTERIOR, alt: "AI-enhanced landscape version of the Casa de Vacacion exterior", label: "" }, featureImageNote: "AI-enhanced exterior · see current photos on Airbnb",
      facts: [{ title: "Entire private home", detail: "Up to 2 guests" }, { title: "Two bedrooms", detail: "Two beds · one bathroom" }, { title: "Everyday comforts", detail: "Wi-Fi & laundry" }],
      galleryEyebrow: "A look around", galleryTitle: "Room to settle in.", galleryDescription: "Explore enhanced previews of the living areas and kitchen. For current, unedited property photos and house rules, open the Airbnb listing.",
      galleryImages: ORANI_ENHANCED_INTERIORS.map((image) => ({ ...image })), galleryDisclosure: "These interior images are AI-enhanced from property photos. View the Airbnb listing for the current, unedited photos.",
      amenities: ["1 bathroom", "Wi-Fi", "Washing machine"],
      exploreEyebrow: "Make the most of your stay", exploreTitle: "Places to explore.", exploreDescription: "From heritage sites to natural escapes, Bataan offers plenty to discover beyond the home.",
      exploreImage: { ...ORANI_PHOTOS[1] }, exploreCaption: "Make Orani your base for discovering Bataan.",
      exploreItems: [{ title: "Mount Samat National Shrine", detail: "History & views" }, { title: "Las Casas Filipinas de Acuzar", detail: "Heritage" }, { title: "Dunsulan Falls", detail: "Nature" }, { title: "Pawikan Conservation Center", detail: "Wildlife" }, { title: "Bataan World War II Museum", detail: "History" }, { title: "Mount Natib", detail: "Outdoors" }],
      exploreCta: "Explore the official Bataan guide", exploreUrl: "https://bataan.gov.ph/behold-bataan/",
      planEyebrow: "Plan your visit", planTitle: "Let’s find your", planTitleSecond: "next stay.", planDescription: "See live availability, rates and booking conditions on Airbnb.", planCta: "Check availability",
      planDetailsEyebrow: "The location", planDetailsTitle: "Orani, Bataan", planDetailsSubtitle: "Philippines", planDetailsDescription: "Casa de Vacacion is a two-bedroom private home. Booking and payment are handled on Airbnb.",
    },
    specialistSuites: {
      name: "Specialist Suites & Allied Health Hub", cardLocation: "Skye, Victoria · Australia",
      cardDescription: "A professional space for better care. Beside Skye East Medical Centre, the Hub brings specialists and allied health practitioners together in welcoming consulting spaces.",
      cardFacts: ["Six consulting suites", "Flexible sessions", "Allied health services"], cardCta: "View Specialist Suites", cardExternalCta: "Visit the Hub’s website",
      cardImage: { src: SPECIALIST_SUITES_IMAGE, alt: "Front of Specialist Suites & Allied Health Hub in Skye", label: "" },
      externalUrl: SPECIALIST_SUITES_URL, actionUrl: `${SPECIALIST_SUITES_URL}book/tour`, introEyebrow: "Specialist Suites · Skye, Victoria", introTitle: "Professional space.", introAccent: "Better care.",
      introDescription: "Consulting spaces and allied health services in a welcoming, professional environment.", introPrimaryCta: "Explore the Hub", introSecondaryCta: "Visit website",
      featureEyebrow: "Consulting & allied health · Skye", featureTitle: "Specialist Suites", featureAccent: "& Allied Health Hub", featureLead: "A professional space for better care.",
      featureParagraphs: ["Located in Skye, Melbourne’s south-east, Specialist Suites & Allied Health Hub brings together consulting spaces and allied health services in a welcoming, professional environment.", "Beside Skye East Medical Centre, the Hub offers six consulting suites and flexible sessions for specialists and allied health practitioners. The rooms support growing practices, while patients can access services including physiotherapy and dietetics in one convenient location."],
      featureSignoff: "Supporting practitioners. Connecting care. Serving our community.", featureCta: "Book a private tour", featureLocation: "221 Hall Road, Skye, Victoria",
      featureImage: { src: SPECIALIST_SUITES_IMAGE, alt: "Front of Specialist Suites & Allied Health Hub in Skye", label: "" }, featureImageNote: "",
      facts: [{ title: "Six consulting suites", detail: "Purpose-designed spaces" }, { title: "Flexible sessions", detail: "For growing practices" }, { title: "Allied health services", detail: "Care in one location" }],
      galleryEyebrow: "A look inside", galleryTitle: "Room to practise.", galleryDescription: "Explore real photos of the Hub’s consulting and treatment spaces. Visit the Specialist Suites website for current room details and availability.",
      galleryImages: SPECIALIST_SUITES_PHOTOS.slice(0, 3).map((image) => ({ ...image })), galleryDisclosure: "", amenities: [],
      exploreEyebrow: "Designed for care", exploreTitle: "A space that supports your work.", exploreDescription: "Settle into a professional setting built for practitioners, patients and everyday clinical flow.",
      exploreImage: { ...SPECIALIST_SUITES_PHOTOS[3] }, exploreCaption: "Care starts with the right space.",
      exploreItems: [{ title: "Consulting suites", detail: "Purpose-designed rooms" }, { title: "Flexible sessions", detail: "Options for your practice" }, { title: "Beside Skye East Medical", detail: "An established healthcare setting" }, { title: "Patient comfort", detail: "Welcoming shared spaces" }],
      exploreCta: "View all six suites", exploreUrl: `${SPECIALIST_SUITES_URL}suites`,
      planEyebrow: "See the space", planTitle: "Make room for", planTitleSecond: "better care.", planDescription: "Walk through the suites, shared areas and facilities with the Hub’s team.", planCta: "Book a private tour",
      planDetailsEyebrow: "The location", planDetailsTitle: "221 Hall Road", planDetailsSubtitle: "Skye, Victoria 3977", planDetailsDescription: "Beside Skye East Medical Centre in Melbourne’s south-east.",
    },
  },
};

const keys = ["airbnb", "specialistSuites"] as const;
const readText = (value: unknown, fallback: string) => typeof value === "string" ? value : fallback;
const readRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const readImage = (value: unknown, fallback: BusinessImage): BusinessImage => {
  const image = readRecord(value);
  return { src: readText(image.src, fallback.src), alt: readText(image.alt, fallback.alt), label: readText(image.label, fallback.label) };
};

export function normalizeOtherBusinesses(value: unknown): OtherBusinessesContent {
  const source = readRecord(value);
  const hubSource = readRecord(source.hub);
  const businessesSource = readRecord(source.businesses);
  const hub = Object.fromEntries(Object.entries(DEFAULT_OTHER_BUSINESSES.hub).map(([key, fallback]) => [key, readText(hubSource[key], fallback)])) as OtherBusinessesContent["hub"];
  const businesses = {} as OtherBusinessesContent["businesses"];
  for (const key of keys) {
    const defaults = DEFAULT_OTHER_BUSINESSES.businesses[key];
    const saved = readRecord(businessesSource[key]);
    const business = { ...defaults } as BusinessContent;
    for (const field of Object.keys(defaults) as Array<keyof BusinessContent>) {
      const fallback = defaults[field];
      const current = saved[field];
      if (typeof fallback === "string") (business as unknown as Record<string, unknown>)[field] = readText(current, fallback);
      else if (field === "cardImage" || field === "featureImage" || field === "exploreImage") (business as unknown as Record<string, unknown>)[field] = readImage(current, fallback as BusinessImage);
      else if (field === "galleryImages") business.galleryImages = defaults.galleryImages.map((image, index) => readImage(Array.isArray(current) ? current[index] : null, image));
      else if (field === "cardFacts" || field === "featureParagraphs" || field === "amenities") (business as unknown as Record<string, unknown>)[field] = (fallback as string[]).map((item, index) => readText(Array.isArray(current) ? current[index] : null, item));
      else if (field === "facts" || field === "exploreItems") (business as unknown as Record<string, unknown>)[field] = (fallback as BusinessFact[]).map((item, index) => {
        const row = readRecord(Array.isArray(current) ? current[index] : null);
        return { title: readText(row.title, item.title), detail: readText(row.detail, item.detail) };
      });
    }
    businesses[key] = business;
  }
  return { hub, businesses };
}

export function validateOtherBusinesses(content: OtherBusinessesContent) {
  const errors: string[] = [];
  const checkText = (label: string, value: string, limit: number, required = true) => {
    if (required && !value.trim()) errors.push(`${label} is required.`);
    if (value.length > limit) errors.push(`${label} must be ${limit} characters or fewer.`);
  };
  const checkUrl = (label: string, value: string, image = false) => {
    try {
      if (image && value.startsWith("/") && !value.startsWith("//")) return;
      const url = new URL(value);
      if (url.protocol !== "https:" || (image && url.hostname !== "a0.muscache.com" && !url.hostname.endsWith(".supabase.co"))) throw new Error();
    } catch { errors.push(`${label} must be ${image ? "a local image or an approved HTTPS image URL" : "an HTTPS URL"}.`); }
  };
  for (const [key, value] of Object.entries(content.hub)) checkText(`Listing ${key}`, value, key === "description" ? 500 : 100);
  for (const key of keys) {
    const business = content.businesses[key];
    for (const [field, value] of Object.entries(business)) {
      const label = `${business.name || key} ${field}`;
      if (typeof value === "string") checkText(label, value, /Url$/.test(field) || ["featureImageNote", "galleryDisclosure"].includes(field) ? 500 : /Description|Paragraph|Signoff|Caption/.test(field) ? 800 : 180, !["featureImageNote", "galleryDisclosure"].includes(field));
    }
    checkUrl(`${business.name} website`, business.externalUrl);
    checkUrl(`${business.name} action link`, business.actionUrl);
    checkUrl(`${business.name} explore link`, business.exploreUrl);
    for (const [label, image] of [["listing image", business.cardImage], ["feature image", business.featureImage], ["explore image", business.exploreImage], ...business.galleryImages.map((image, index) => [`gallery image ${index + 1}`, image] as const)] as Array<readonly [string, BusinessImage]>) {
      checkUrl(`${business.name} ${label}`, image.src, true);
      checkText(`${business.name} ${label} alt text`, image.alt, 240);
      checkText(`${business.name} ${label} caption`, image.label, 100, false);
    }
    for (const [label, list] of [["card fact", business.cardFacts], ["feature paragraph", business.featureParagraphs], ["amenity", business.amenities]] as const) list.forEach((item, index) => checkText(`${business.name} ${label} ${index + 1}`, item, label === "feature paragraph" ? 800 : 140));
    for (const [label, list] of [["fact", business.facts], ["explore item", business.exploreItems]] as const) list.forEach((item, index) => { checkText(`${business.name} ${label} ${index + 1} title`, item.title, 120); checkText(`${business.name} ${label} ${index + 1} detail`, item.detail, 160); });
  }
  return errors;
}
