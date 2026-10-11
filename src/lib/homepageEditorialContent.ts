import { defaultHomepageFaqs } from "@/src/data/homepageFaqs";

export type EditorialCard = { title: string; description: string };
export type EditorialFaq = { question: string; answer: string };
export const HOMEPAGE_HIGHLIGHT_ICON_OPTIONS = [
  { id: "house", label: "Home" },
  { id: "calendar-days", label: "Calendar" },
  { id: "calendar-check", label: "Booking" },
  { id: "contact", label: "Support" },
  { id: "briefcase", label: "Business" },
  { id: "key", label: "Keys" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "map-pin", label: "Location" },
  { id: "shield-check", label: "Peace of mind" },
  { id: "heart-handshake", label: "Care" },
  { id: "bed-double", label: "Bedroom" },
  { id: "car-front", label: "Parking" },
  { id: "coffee", label: "Coffee" },
  { id: "utensils", label: "Kitchen" },
  { id: "bath", label: "Bathroom" },
  { id: "washing-machine", label: "Laundry" },
  { id: "air-vent", label: "Cooling" },
  { id: "sun", label: "Daylight" },
  { id: "moon", label: "Night" },
  { id: "trees", label: "Outdoors" },
  { id: "sparkles", label: "Cleanliness" },
  { id: "clock", label: "Flexible time" },
  { id: "users", label: "Guests" },
  { id: "luggage", label: "Travel" },
  { id: "plane", label: "Airport" },
  { id: "building", label: "Building" },
  { id: "phone", label: "Phone" },
  { id: "check-circle", label: "Confirmed" },
  { id: "star", label: "Favourite" },
  { id: "heart", label: "Comfort" },
  { id: "lock", label: "Privacy" },
  { id: "baby", label: "Family" },
  { id: "armchair", label: "Armchair" },
  { id: "sofa", label: "Living room" },
  { id: "door-open", label: "Private entrance" },
  { id: "refrigerator", label: "Fridge" },
  { id: "microwave", label: "Microwave" },
  { id: "chef-hat", label: "Cooking" },
  { id: "shower-head", label: "Shower" },
  { id: "heater", label: "Heating" },
  { id: "fan", label: "Fan" },
  { id: "thermometer", label: "Temperature" },
  { id: "lamp-desk", label: "Workspace" },
  { id: "laptop", label: "Remote work" },
  { id: "tv", label: "TV" },
  { id: "book-open", label: "Reading" },
  { id: "music", label: "Entertainment" },
  { id: "plug-zap", label: "Charging" },
  { id: "lightbulb", label: "Lighting" },
  { id: "flame", label: "Fireplace" },
  { id: "fire-extinguisher", label: "Fire safety" },
  { id: "fence", label: "Garden" },
  { id: "flower", label: "Flowers" },
  { id: "waves", label: "Water" },
  { id: "mountain", label: "Scenery" },
  { id: "cloud-sun", label: "Weather" },
  { id: "paw-print", label: "Pet friendly" },
  { id: "bike", label: "Cycling" },
  { id: "dumbbell", label: "Fitness" },
  { id: "circle-parking", label: "Parking space" },
  { id: "bus-front", label: "Bus" },
  { id: "train-front", label: "Train" },
  { id: "navigation", label: "Directions" },
  { id: "compass", label: "Explore" },
  { id: "globe", label: "International" },
  { id: "backpack", label: "Adventure" },
  { id: "camera", label: "Photos" },
  { id: "calendar-range", label: "Long stays" },
  { id: "alarm-clock", label: "Early arrival" },
  { id: "arrow-right-left", label: "Flexible plans" },
  { id: "clipboard-check", label: "Easy check-in" },
  { id: "concierge-bell", label: "Hospitality" },
  { id: "message-circle", label: "Messaging" },
  { id: "mail", label: "Email" },
  { id: "bell", label: "Notifications" },
  { id: "gift", label: "Welcome gift" },
  { id: "warehouse", label: "Storage" },
  { id: "wind", label: "Fresh air" },
] as const;
export type EditorialHighlightIcon = typeof HOMEPAGE_HIGHLIGHT_ICON_OPTIONS[number]["id"];
export type EditorialHighlight = EditorialCard & { icon: EditorialHighlightIcon };
export const isEditorialHighlightIcon = (value: unknown): value is EditorialHighlightIcon =>
  typeof value === "string" && HOMEPAGE_HIGHLIGHT_ICON_OPTIONS.some((option) => option.id === value);

export type EditorialHomepageContent = {
  editorial_hero_eyebrow: string;
  editorial_hero_heading: string;
  editorial_hero_description: string;
  editorial_hero_primary_label: string;
  editorial_hero_secondary_label: string;
  editorial_highlights: EditorialHighlight[];
  editorial_intro_heading: string;
  editorial_intro_link_label: string;
  editorial_intro_statement_one: string;
  editorial_intro_statement_two: string;
  editorial_services_heading: string;
  editorial_services_description: string;
  editorial_services: EditorialCard[];
  editorial_faq_eyebrow: string;
  faq_heading: string;
  faq_description: string;
  faqs: EditorialFaq[];
  editorial_faq_contact_prompt: string;
  editorial_faq_contact_label: string;
  editorial_social_heading: string;
  editorial_social_houses_label: string;
  editorial_social_story_label: string;
  editorial_social_contact_label: string;
};

export const defaultEditorialHomepageContent: EditorialHomepageContent = {
  editorial_hero_eyebrow: "Serenity on the Rocks · Pakenham",
  editorial_hero_heading: "Whole-Home Stays.\nSimple Direct\nBooking.",
  editorial_hero_description: "Fully furnished private homes for relocations, home renovations, business travel and partner-booked stays.",
  editorial_hero_primary_label: "Check Availability",
  editorial_hero_secondary_label: "Partner Booking",
  editorial_highlights: [
    { icon: "house", title: "Move-in ready", description: "Furnished homes with the everyday essentials in place." },
    { icon: "calendar-days", title: "Flexible stays", description: "Stay a few weeks or settle in for longer." },
    { icon: "calendar-check", title: "Book direct", description: "Check available dates and arrange your stay with us." },
    { icon: "contact", title: "Personal support", description: "One responsive team, from enquiry to checkout." },
  ],
  editorial_intro_heading: "The tailored stay",
  editorial_intro_link_label: "View all houses",
  editorial_intro_statement_one: "Three private homes, considered down to the everyday details.",
  editorial_intro_statement_two: "Stay independently or reserve the houses together for family, work, relocation and longer visits.",
  editorial_services_heading: "Stay services",
  editorial_services_description: "The finishing touches for an easy arrival and a settled stay.",
  editorial_services: [
    { title: "Private whole homes", description: "Space to cook, work, rest and live at your own pace." },
    { title: "Corporate stays", description: "Flexible arrangements for project teams and relocations." },
    { title: "Local support", description: "One responsive point of contact from enquiry to checkout." },
  ],
  editorial_faq_eyebrow: "FAQs · Before you arrive",
  faq_heading: "Good to know before arrival.",
  faq_description: "Clear answers for families, business travellers, contractors, and longer-stay guests.",
  faqs: defaultHomepageFaqs.map((faq) => ({ ...faq })),
  editorial_faq_contact_prompt: "Have another question?",
  editorial_faq_contact_label: "Talk to our team",
  editorial_social_heading: "Your next stay starts here",
  editorial_social_houses_label: "Explore our homes",
  editorial_social_story_label: "Our story",
  editorial_social_contact_label: "Get in touch",
};

export function normalizeEditorialHomepageContent(value: unknown): EditorialHomepageContent {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const defaults = defaultEditorialHomepageContent;
  const normalized = { ...defaults };
  for (const key of Object.keys(defaults) as Array<keyof EditorialHomepageContent>) {
    if (key === "editorial_highlights" || key === "editorial_services" || key === "faqs") continue;
    if (typeof source[key] === "string") (normalized as unknown as Record<string, unknown>)[key] = source[key];
  }
  const storedHighlights = Array.isArray(source.editorial_highlights) ? source.editorial_highlights : [];
  normalized.editorial_highlights = defaults.editorial_highlights.map((fallback, index) => {
    const entry = storedHighlights[index];
    const card = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    return {
      icon: isEditorialHighlightIcon(card.icon) ? card.icon : fallback.icon,
      title: typeof card.title === "string" ? card.title : fallback.title,
      description: typeof card.description === "string" ? card.description : fallback.description,
    };
  });
  const storedServices = Array.isArray(source.editorial_services) ? source.editorial_services : [];
  normalized.editorial_services = defaults.editorial_services.map((fallback, index) => {
      const entry = storedServices[index];
      const card = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
      return {
        title: typeof card.title === "string" ? card.title : fallback.title,
        description: typeof card.description === "string" ? card.description : fallback.description,
      };
    });
  if (Array.isArray(source.faqs)) {
    normalized.faqs = source.faqs.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const faq = entry as Record<string, unknown>;
      return typeof faq.question === "string" && typeof faq.answer === "string"
        ? [{ question: faq.question, answer: faq.answer }]
        : [];
    });
  }
  return normalized;
}
