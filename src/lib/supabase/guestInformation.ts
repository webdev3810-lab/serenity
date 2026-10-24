import "server-only";

import { DEFAULT_GUEST_INFORMATION, GUEST_IMAGE_SLOTS, GUEST_INFORMATION_PAGE_KEY, isGuestStoragePath, normalizeGuestInformation, type GuestInformationContent } from "@/src/lib/guestInformation";
import { HERO_MEDIA_BUCKET } from "@/src/lib/heroMedia";
import { createSupabaseAdminClient } from "./admin";
import { isSupabaseConfigured } from "./config";
import { createSupabasePublicClient } from "./server";
import { getHomepageHeroMedia, getPublicPropertyBySlug } from "./content";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";
import type { PropertyImage } from "@/src/data/properties";

export async function getGuestAutomaticImages(): Promise<Partial<Record<typeof GUEST_IMAGE_SLOTS[number], PropertyImage>>> {
  const [property, heroMedia] = await Promise.all([getPublicPropertyBySlug("serenity-7"), getHomepageHeroMedia()]);
  const photos = property?.images.filter((image) => image.src && image.isVisible !== false) ?? [];
  const find = (pattern: RegExp) => photos.find((image) => pattern.test(`${image.alt} ${image.category ?? ""} ${image.categoryLabel ?? ""}`));
  const homeHero = heroMedia.find((media) => media.media_type === "image" && isApprovedHomepageMediaSource(media.public_url));
  return {
    hero: { src: "/guest-information-hero.jpg", alt: "Illustrative furnished living room with a navy sofa and warm natural light" },
    checkIn: homeHero ? { src: homeHero.public_url, alt: homeHero.alt_text || "Serenity furnished homes in Pakenham" } : find(/exterior|entry|front/i) ?? photos[0],
    houseRules: { src: "/guest-house-rules-photo.jpg", alt: "Illustrative twin-bedroom with neatly made beds and soft daylight" },
  };
}

export async function guestImagePreviews(content: GuestInformationContent) {
  const previews: Partial<Record<typeof GUEST_IMAGE_SLOTS[number], string>> = {};
  const uploaded = GUEST_IMAGE_SLOTS.filter((slot) => isGuestStoragePath(content.images[slot].storagePath));
  if (uploaded.length) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage.from(HERO_MEDIA_BUCKET).createSignedUrls(uploaded.map((slot) => content.images[slot].storagePath), 3600);
    if (error) throw error;
    uploaded.forEach((slot, index) => { if (data?.[index]?.signedUrl) previews[slot] = data[index].signedUrl; });
  }
  return previews;
}

export async function getGuestInformationContent() {
  let content = structuredClone(DEFAULT_GUEST_INFORMATION);
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await createSupabasePublicClient().from("homepage_content").select("content").eq("page_key", GUEST_INFORMATION_PAGE_KEY).eq("published", true).maybeSingle();
      if (!error && data) content = normalizeGuestInformation(data.content);
    } catch { /* Keep the existing guide available during a connection outage. */ }
  }
  let previews = {} as Awaited<ReturnType<typeof guestImagePreviews>>;
  try { previews = await guestImagePreviews(content); } catch { /* Automatic house photos remain available as a fallback. */ }
  return { content, previews };
}
