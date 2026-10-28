import { corporateBookingWording } from "@/src/lib/publicPageCopy";

export const GUEST_INFORMATION_PAGE_KEY = "guest-information";
export const GUEST_IMAGE_SLOTS = ["hero", "checkIn", "houseRules", "homeCare"] as const;
export type GuestImageSlot = typeof GUEST_IMAGE_SLOTS[number];
export type GuestPageImage = { mode: "automatic" | "custom" | "hidden"; src: string; storagePath: string; alt: string };
export type GuestInformationCard = { id: string; title: string; eyebrow: string; items: string[] };
export type GuestInformationContent = {
  heroKicker: string; title: string; titleAccent: string; description: string;
  promiseLabels: string[]; promiseText: string; jumpLabel: string;
  introKicker: string; introTitle: string; introText: string; homeCareCaption: string;
  images: Record<GuestImageSlot, GuestPageImage>;
  cards: GuestInformationCard[];
};

const automaticImage = (): GuestPageImage => ({ mode: "automatic", src: "", storagePath: "", alt: "" });
const hiddenImage = (): GuestPageImage => ({ mode: "hidden", src: "", storagePath: "", alt: "" });
export const DEFAULT_GUEST_INFORMATION: GuestInformationContent = {
  heroKicker: "The Serenity stay guide",
  title: "Guest Information", titleAccent: "& Stay Policies",
  description: "Everything you need for a smooth, comfortable, and well-managed stay.",
  promiseLabels: ["Comfort", "Convenience", "Professional stays"],
  promiseText: "A home away from home for business and beyond.", jumpLabel: "Explore the guide",
  introKicker: "At a glance", introTitle: "Feel at home, from arrival to departure.",
  introText: "This guide covers the essentials. Your booking confirmation and the details for your specific home provide the terms that apply to your stay.",
  homeCareCaption: "A brighter tomorrow begins at home.",
  images: { hero: automaticImage(), checkIn: automaticImage(), houseRules: automaticImage(), homeCare: hiddenImage() },
  cards: [
    { id: "terms", title: "Terms & Conditions", eyebrow: "Important information for your stay", items: [
      "All reservations are subject to confirmation and acceptance.",
      "The lead guest must ensure all booking details are accurate.",
      "Only registered guests may stay at the property unless approved in advance.",
      "Guests are expected to comply with house rules and local regulations.",
      "Serenity Corporate Bookings may refuse or cancel bookings that do not comply with property policies.",
      "Check-in and check-out times must be observed unless arranged in advance.",
    ] },
    { id: "privacy", title: "Privacy Policy", eyebrow: "Your privacy matters", items: [
      "Guest information is collected only for reservation management, guest communication, payment processing, and legal obligations.",
      "Personal information is handled with care and kept confidential.",
      "Information is not sold to third parties.",
      "Details may be shared with trusted service providers only when needed to complete a booking or meet legal requirements.",
      "Guests may ask how their information is used.",
    ] },
    { id: "cancellations", title: "Cancellation Policy", eyebrow: "Flexible, fair and transparent", items: [
      "Contact Serenity to request a cancellation or amendment.",
      "For direct bookings, free cancellation is available through 11:59 pm Melbourne time on the deadline shown before payment. The default is seven days before check-in and can vary by house.",
      "After the free cancellation deadline, the house's stated flat cancellation fee is retained and the remaining booking price is refunded. Your booking keeps the fee shown when you paid.",
      "Approved corporate or partner bookings may have separately agreed terms.",
      "Any applicable refund is returned to the original payment method.",
    ] },
    { id: "self-check-in", title: "Self Check-In", eyebrow: "A convenient and secure arrival", items: [
      "Where offered, self check-in is available using a secure key safe or lockbox.",
      "Access instructions are shared with confirmed guests before arrival.",
      "Keep access details confidential and do not share them outside your travelling party.",
      "Return keys as instructed at check-out.",
      "Our team is available if you need help with your arrival.",
    ] },
    { id: "house-rules", title: "House Rules", eyebrow: "A welcoming home for every guest", items: [
      "No parties, events, or excessive noise.",
      "Please respect neighbours and the property's quiet hours.",
      "No smoking inside the property.",
      "Loss, damage, or breakage beyond normal wear and tear may be charged to the guest.",
      "Report accidental damage promptly so we can assist.",
      "Only registered guests may stay unless prior approval is given.",
      "Leave the home in a tidy and respectful condition.",
    ] },
    { id: "home-care", title: "Care for the Home & Environment", eyebrow: "Small actions make a big difference", items: [
      "Help us conserve water and electricity during your stay.",
      "Switch off lights, air-conditioning, heating, televisions, and appliances when not in use.",
      "Avoid unnecessary water use wherever possible.",
      "Keep doors and windows closed when heating or cooling is operating.",
      "Use bins appropriately and recycle where available.",
      "Mindful everyday actions help maintain a comfortable, sustainable stay for everyone.",
    ] },
  ],
};

export const GUEST_TEXT_LIMITS = {
  heroKicker: 80, title: 80, titleAccent: 80, description: 300, promiseText: 300,
  jumpLabel: 60, introKicker: 80, introTitle: 160, introText: 600, homeCareCaption: 160,
} as const;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function normalizeGuestInformation(value: unknown): GuestInformationContent {
  const source = record(value);
  const result = structuredClone(DEFAULT_GUEST_INFORMATION);
  for (const key of Object.keys(GUEST_TEXT_LIMITS) as (keyof typeof GUEST_TEXT_LIMITS)[]) {
    if (typeof source[key] === "string") result[key] = source[key];
  }
  if (Array.isArray(source.promiseLabels)) result.promiseLabels = source.promiseLabels.filter((item): item is string => typeof item === "string");
  const cards = Array.isArray(source.cards) ? source.cards.map(record) : [];
  result.cards = result.cards.map((fallback) => {
    const saved = cards.find((card) => card.id === fallback.id);
    return saved ? {
      id: fallback.id,
      title: typeof saved.title === "string" ? saved.title : fallback.title,
      eyebrow: typeof saved.eyebrow === "string" ? saved.eyebrow : fallback.eyebrow,
      items: Array.isArray(saved.items) ? saved.items.filter((item): item is string => typeof item === "string").map(corporateBookingWording) : fallback.items,
    } : fallback;
  });
  const images = record(source.images);
  for (const slot of GUEST_IMAGE_SLOTS) {
    const image = record(images[slot]);
    const fallback = result.images[slot];
    result.images[slot] = {
      mode: image.mode === "custom" || image.mode === "hidden" || image.mode === "automatic" ? image.mode : fallback.mode,
      src: typeof image.src === "string" ? image.src : "",
      storagePath: typeof image.storagePath === "string" ? image.storagePath : "",
      alt: typeof image.alt === "string" ? image.alt : "",
    };
  }
  return result;
}

export function isGuestImageSource(src: string) {
  if (src.startsWith("/") && !src.startsWith("//") && !src.includes("\\") && !src.includes("..")) return true;
  try {
    const url = new URL(src);
    const project = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return Boolean(project && url.origin === new URL(project).origin && url.pathname.startsWith("/storage/v1/object/public/property-images/"));
  } catch { return false; }
}

export function isGuestStoragePath(path: string) {
  return /^guest-information\/[a-zA-Z0-9-]+\/[a-zA-Z0-9.-]+$/.test(path) && !path.includes("..");
}

export function validateGuestInformation(content: GuestInformationContent): string[] {
  const errors: string[] = [];
  for (const [key, limit] of Object.entries(GUEST_TEXT_LIMITS)) {
    if (content[key as keyof typeof GUEST_TEXT_LIMITS].length > limit) errors.push(`${key} must be ${limit} characters or fewer.`);
  }
  if (!content.title.trim()) errors.push("Enter a page title.");
  if (!content.introTitle.trim()) errors.push("Enter an introduction heading.");
  if (content.promiseLabels.length !== 3 || content.promiseLabels.some((label) => !label.trim() || label.length > 60)) errors.push("Enter three stay promise labels, up to 60 characters each.");
  for (const card of content.cards) {
    if (!card.title.trim() || card.title.length > 100 || card.eyebrow.length > 160) errors.push(`Check the heading and subtitle for ${card.id}.`);
    if (!card.items.length || card.items.length > 20 || card.items.some((item) => !item.trim() || item.length > 600)) errors.push(`${card.title || card.id} needs 1–20 points, up to 600 characters each.`);
  }
  for (const slot of GUEST_IMAGE_SLOTS) {
    const image = content.images[slot];
    if (image.alt.length > 180) errors.push(`${slot} image description must be 180 characters or fewer.`);
    if (image.storagePath && !isGuestStoragePath(image.storagePath)) errors.push(`Invalid ${slot} upload path.`);
    if (image.src && !isGuestImageSource(image.src)) errors.push(`Choose a house photo or upload an image for ${slot}.`);
    if (image.mode === "custom" && !image.storagePath && !image.src) errors.push(`Choose an image for ${slot}.`);
    if (image.storagePath && image.src) errors.push(`Choose only one image source for ${slot}.`);
  }
  return errors;
}
