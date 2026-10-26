export const PUBLIC_PAGE_MEDIA = {
  aboutHero: { page: "About", label: "Hero photo", src: "/about-serenity-interior-v1.jpg", alt: "Sunlit dining and living area in a furnished home" },
  corporateHero: { page: "Corporate Stays", label: "Hero photo", src: "/corporate-hero-interior.jpg", alt: "Furnished home interior with lounge, kitchen and garden patio" },
  corporateInsurance: { page: "Corporate Stays", label: "Insurance accommodation photo", src: "/corporate-insurance-illustration.jpg", alt: "Family arriving at temporary accommodation" },
  corporateWork: { page: "Corporate Stays", label: "Corporate stays photo", src: "/corporate-stays-illustration.jpg", alt: "Business traveller working in a furnished home" },
  contactHero: { page: "Contact", label: "Hero photo", src: "/contact-welcome-interior.jpg", alt: "Furnished living room with a cream sofa and natural light" },
  howHero: { page: "How It Works", label: "Hero photo", src: "/how-it-works-hero.jpg", alt: "Sunlit furnished living and dining room" },
  howArrival: { page: "How It Works", label: "Arrival photo", src: "/how-it-works-arrival.jpg", alt: "Furnished home entry with a suitcase ready for arrival" },
  howClosing: { page: "How It Works", label: "Closing photo", src: "/how-it-works-settle-in-v1.jpg", alt: "Furnished home entry opening into a living and dining area" },
} as const;

export type PublicPageMediaKey = keyof typeof PUBLIC_PAGE_MEDIA;
export type PublicPageMediaItem = { src: string; alt: string };
export type PublicPageMedia = Record<PublicPageMediaKey, PublicPageMediaItem>;

export const defaultPublicPageMedia = (): PublicPageMedia => Object.fromEntries(
  Object.entries(PUBLIC_PAGE_MEDIA).map(([key, item]) => [key, { src: item.src, alt: item.alt }]),
) as PublicPageMedia;

const validMediaSource = (value: string) => {
  if (/^\/[a-z0-9][a-z0-9/_-]*\.(?:jpg|jpeg|png|webp|avif)$/i.test(value)) return true;
  try {
    const url = new URL(value);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return Boolean(supabaseUrl && url.origin === new URL(supabaseUrl).origin && url.pathname.startsWith("/storage/v1/object/public/property-images/page-media/"));
  } catch {
    return false;
  }
};

export function normalizePublicPageMedia(value: unknown): PublicPageMedia {
  const defaults = defaultPublicPageMedia();
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
  const raw = value as Record<string, unknown>;
  for (const key of Object.keys(PUBLIC_PAGE_MEDIA) as PublicPageMediaKey[]) {
    const item = raw[key];
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const candidate = item as Record<string, unknown>;
    const src = typeof candidate.src === "string" ? candidate.src.trim() : "";
    const alt = typeof candidate.alt === "string" ? candidate.alt.trim() : "";
    if (validMediaSource(src)) defaults[key] = { src, alt: alt.slice(0, 180) || defaults[key].alt };
  }
  return defaults;
}
