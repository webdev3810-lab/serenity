/* Supabase rows are intentionally mapped at this boundary because this project
   keeps the public Property shape independent from the database column names. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { properties as fallbackProperties, type Property, type PropertyDatePrice, type PropertyReview } from "@/src/data/properties";
import { isSupabaseConfigured } from "@/src/lib/supabase/config";
import { createSupabasePublicClient } from "@/src/lib/supabase/server";
import { DEFAULT_CONTACT_SETTINGS, DEFAULT_PROMO_SETTINGS, normalizeContactSettings, type ContactSettings, type PromoSettings } from "@/src/lib/siteSettings";
import type { Database } from "@/src/lib/supabase/types";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { HERO_MEDIA_BUCKET } from "@/src/lib/heroMedia";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";
import { getPromotionStatus, normalizePromotionRow } from "@/src/lib/promotions";

type ContentRow = Record<string, any>;

function describeSupabaseError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: "",
      details: error.stack ?? "",
      hint: "",
    };
  }

  if (!error || typeof error !== "object") return String(error);

  const value = error as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };

  return {
    message: value.message ?? (Object.keys(value).length === 0 ? "Empty error object (network or fetch failure)" : "Unknown Supabase error"),
    code: value.code ?? "",
    details: value.details ?? "",
    hint: value.hint ?? "",
  };
}

function isSupabaseUnavailableError(error: unknown) {
  const description = describeSupabaseError(error);
  const text = typeof description === "string"
    ? description
    : `${description.message} ${description.details}`;

  if (typeof error === "object" && error !== null && Object.keys(error).length === 0) {
    return true;
  }

  return /fetch failed|econnrefused|enotfound|eacces|networkerror|empty error/i.test(text);
}

function logSupabaseLoadFailure(message: string, error: unknown) {
  // Public pages intentionally have local fallbacks. A temporarily blocked
  // local network must not surface as a console error or break the homepage.
  if (!isSupabaseUnavailableError(error)) {
    console.error(message, describeSupabaseError(error));
  }
}

// Local preview is intentionally the safe default. Switch to CONTENT_SOURCE=supabase
// only after the Supabase content has been populated and published.
export const contentSource = process.env.CONTENT_SOURCE === "supabase" ? "supabase" : "local";
export const isLocalContentPreview = contentSource === "local";

const storageUrl = (path: string) => {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/property-images/${path.split("/").map(encodeURIComponent).join("/")}` : path;
};

const publicLocalProperties = fallbackProperties.map((property) => {
  const images = property.images.filter((image) => isApprovedHomepageMediaSource(image.src));
  return {
    ...property,
    images,
    featuredImage: isApprovedHomepageMediaSource(property.featuredImage) ? property.featuredImage : images[0]?.src ?? "",
  };
});

function mapProperty(row: ContentRow, images: ContentRow[], amenities: ContentRow[], reviews: ContentRow[] = [], datePrices: ContentRow[] = [], categories: ContentRow[] = []): Property {
  const categoryState = new Map(categories.filter((category) => category.property_id === row.id).map((category) => [String(category.category), category]));
  const orderedImages = images
    .filter((image) => image.property_id === row.id)
    .filter((image) => image.is_visible !== false && image.is_placeholder !== true)
    .filter((image) => {
      const state = categoryState.get(String(image.category ?? "other"));
      return state?.is_visible !== false && state?.no_photo_available !== true;
    })
    .sort((a, b) => Number(b.is_cover === true) - Number(a.is_cover === true) || Number(a.display_order ?? 0) - Number(b.display_order ?? 0))
    .map((image) => ({
      src: image.storage_path ? storageUrl(image.storage_path) : image.external_url ?? "",
      alt: String(image.alt_text ?? `${row.name} property photo`),
      category: String(image.category ?? "other"),
      categoryLabel: String(image.category_label ?? "Other"),
      categoryDescription: String(categoryState.get(String(image.category ?? "other"))?.category_description ?? image.category_description ?? ""),
      categoryOrder: Number(categoryState.get(String(image.category ?? "other"))?.display_order ?? 0),
      isCover: image.is_cover === true,
      isVisible: image.is_visible !== false,
    }))
    .filter((image) => isApprovedHomepageMediaSource(image.src));
  const safeImages = orderedImages;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    propertyType: row.property_type,
    location: row.location,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    maxGuests: row.max_guests,
    bedrooms: row.bedrooms,
    beds: row.beds,
    bathrooms: Number(row.bathrooms),
    bedArrangements: Array.isArray(row.bed_arrangements) ? row.bed_arrangements : [],
    amenities: amenities.filter((amenity) => amenity.property_id === row.id).sort((a, b) => a.display_order - b.display_order).map((amenity) => amenity.name),
    checkIn: `After ${row.check_in_time}`,
    checkout: `Before ${row.checkout_time}`,
    petPolicy: row.pet_policy,
    parkingType: row.parking_type,
    nightlyPrice: Number(row.nightly_price),
    datePrices: datePrices
      .filter((price) => price.property_id === row.id)
      .filter((price) => price.is_active !== false)
      .sort((a, b) => String(a.price_date).localeCompare(String(b.price_date)))
      .map((price): PropertyDatePrice => ({ date: String(price.price_date), nightlyPrice: Number(price.nightly_price), label: String(price.label ?? ""), active: true })),
    cleaningFee: Number(row.cleaning_fee),
    petFee: Number(row.pet_fee),
    extraGuestFee: Number(row.extra_guest_fee),
    extraGuestThreshold: row.extra_guest_threshold,
    minimumStay: row.minimum_stay,
    maximumStay: Number(row.maximum_stay ?? 90),
    minimumGuests: Number(row.minimum_guests ?? 1),
    maximumAdults: Number(row.maximum_adults ?? row.max_guests),
    maximumChildren: Number(row.maximum_children ?? row.max_guests),
    maximumInfants: Number(row.maximum_infants ?? 2),
    maximumPets: Number(row.maximum_pets ?? 2),
    minimumAdvanceNoticeDays: Number(row.minimum_advance_notice_days ?? 0),
    maximumAdvanceBookingDays: Number(row.maximum_advance_booking_days ?? 365),
    sameDayBookingAllowed: row.same_day_booking_allowed !== false,
    weekendBookingAllowed: row.weekend_booking_allowed !== false,
    instantBookingEnabled: row.instant_booking_enabled !== false,
    bookingRequestRequired: row.booking_request_required === true,
    petsAllowed: row.pets_allowed !== false,
    corporateBookingAllowed: row.corporate_booking_allowed !== false,
    minimumCorporateStay: Number(row.minimum_corporate_stay ?? 7),
    minimumCorporateHouses: Number(row.minimum_corporate_houses ?? 1),
    maximumCorporateHouses: Number(row.maximum_corporate_houses ?? 3),
    adjacentHousesAllowed: row.adjacent_houses_allowed !== false,
    longTermStaysAllowed: row.long_term_stays_allowed !== false,
    corporateDiscount: Number(row.corporate_discount ?? 0),
    corporateApprovalRequired: row.corporate_approval_required === true,
    corporateDepositRequired: row.corporate_deposit_required === true,
    corporateOnlinePayment: row.corporate_online_payment !== false,
    gstInvoiceAvailable: row.gst_invoice_available !== false,
    corporateInstructions: String(row.corporate_instructions ?? ""),
    weeklyDiscount: Number(row.weekly_discount),
    monthlyDiscount: Number(row.monthly_discount),
    listingTitle: String(row.listing_title ?? ""),
    kitchenFacilities: String(row.kitchen_facilities ?? ""),
    laundryFacilities: String(row.laundry_facilities ?? ""),
    wifiInformation: String(row.wifi_information ?? ""),
    workspaceInformation: String(row.workspace_information ?? ""),
    heatingCooling: String(row.heating_cooling ?? ""),
    selfCheckInDetails: String(row.self_check_in_details ?? ""),
    safetyInformation: String(row.safety_information ?? ""),
    cancellationPolicy: String(row.cancellation_policy ?? ""),
    corporateInformation: String(row.corporate_information ?? ""),
    images: safeImages,
    featuredImage: safeImages.find((image) => image.isCover)?.src ?? safeImages[0]?.src ?? "",
    unavailableDates: row.unavailable_dates ?? [],
    houseRules: row.house_rules ?? [],
    nearbyLocations: row.nearby_locations ?? [],
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    published: Boolean(row.published),
    featured: Boolean(row.featured),
    displayOrder: Number(row.display_order),
    listingDetails: (row.listing_details ?? {}) as Record<string, unknown>,
    reviews: reviews
      .filter((review) => review.property_id === row.id && review.published !== false && Number(review.rating) === 5)
      .sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0))
      .map((review): PropertyReview => ({
        id: String(review.id),
        reviewerName: String(review.reviewer_name ?? "Guest"),
        reviewText: String(review.review_text ?? ""),
        rating: 5,
        reviewDate: review.review_date ? String(review.review_date) : null,
        reviewDateLabel: review.review_date_label ? String(review.review_date_label) : null,
        source: String(review.source ?? "Airbnb"),
        displayOrder: Number(review.display_order ?? 0),
        published: review.published !== false,
      })),
  };
}

async function queryPublicProperties() {
  const supabase = createSupabasePublicClient();
  const { data: rows, error } = await supabase.from("properties").select("*").eq("published", true).order("display_order");
  if (error) throw error;
  const ids = (rows ?? []).map((row) => row.id);
  if (!ids.length) return [];
  const [{ data: images, error: imagesError }, { data: amenities, error: amenitiesError }, { data: reviews, error: reviewsError }, { data: datePrices, error: datePricesError }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase.from("property_images").select("*").in("property_id", ids).order("display_order"),
    supabase.from("amenities").select("*").in("property_id", ids).order("display_order"),
    supabase.from("property_reviews").select("*").in("property_id", ids).eq("published", true).eq("rating", 5).order("display_order"),
    supabase.from("property_date_prices").select("*").in("property_id", ids).order("price_date"),
    supabase.from("property_photo_categories").select("*").in("property_id", ids).order("display_order"),
  ]);
  if (imagesError) throw imagesError;
  if (amenitiesError) throw amenitiesError;
  if (reviewsError) throw reviewsError;
  if (datePricesError) throw datePricesError;

  // Category metadata is optional. A missing/stale PostgREST schema cache
  // must not prevent published properties and their images from rendering.
  if (categoriesError) {
    console.warn("Unable to load public property photo categories", describeSupabaseError(categoriesError));
  }

  return (rows ?? []).map((row) => mapProperty(row, images ?? [], amenities ?? [], reviews ?? [], datePrices ?? [], categories ?? []));
}

export async function getPublicProperties(): Promise<Property[]> {
  if (isLocalContentPreview || !isSupabaseConfigured) return publicLocalProperties;
  try {
    const remoteProperties = await queryPublicProperties();
    return remoteProperties.length ? remoteProperties : publicLocalProperties;
  } catch (error) {
    logSupabaseLoadFailure("Unable to load public properties from Supabase", error);
    return publicLocalProperties;
  }
}

export async function getPublicPropertyBySlug(slug: string): Promise<Property | undefined> {
  const localPublicProperty = publicLocalProperties.find((property) => property.slug === slug);
  if (isLocalContentPreview || !isSupabaseConfigured) return localPublicProperty;
  try {
    const supabase = createSupabasePublicClient();
    const { data: row, error } = await supabase.from("properties").select("*").eq("slug", slug).eq("published", true).maybeSingle();
    if (error) throw error;
    // Supabase is the source of truth in public mode. If an editor unpublishes
    // or removes a listing, do not silently render the bundled preview record.
    if (!row) return undefined;
    const [{ data: images, error: imagesError }, { data: amenities, error: amenitiesError }, { data: reviews, error: reviewsError }, { data: categories, error: categoriesError }] = await Promise.all([
      supabase.from("property_images").select("*").eq("property_id", row.id).eq("is_visible", true).eq("is_placeholder", false).order("display_order"),
      supabase.from("amenities").select("*").eq("property_id", row.id).order("display_order"),
      supabase.from("property_reviews").select("*").eq("property_id", row.id).eq("published", true).eq("rating", 5).order("display_order"),
      supabase.from("property_photo_categories").select("*").eq("property_id", row.id).order("display_order"),
    ]);
    if (imagesError) throw imagesError;
    if (amenitiesError) throw amenitiesError;
    if (reviewsError) throw reviewsError;
    if (categoriesError) {
      console.warn("Unable to load public property photo categories", describeSupabaseError(categoriesError));
    }
    const { data: datePrices } = await supabase.from("property_date_prices").select("*").eq("property_id", row.id).order("price_date");
    return mapProperty(row, images ?? [], amenities ?? [], reviews ?? [], datePrices ?? [], categories ?? []);
  } catch (error) {
    logSupabaseLoadFailure("Unable to load public property from Supabase", error);
    return localPublicProperty;
  }
}

export async function getHomepageContent() {
  if (isLocalContentPreview || !isSupabaseConfigured) return null;
  try {
    const supabase = createSupabasePublicClient();
    const { data } = await supabase.from("homepage_content").select("content").eq("page_key", "home").eq("published", true).maybeSingle();
    return (data as { content?: Record<string, unknown> } | null)?.content ?? null;
  } catch {
    return null;
  }
}

export type HomepageHeroMedia = Database["public"]["Tables"]["homepage_hero_media"]["Row"];

export async function getHomepageHeroMedia(): Promise<HomepageHeroMedia[]> {
  if (isLocalContentPreview || !isSupabaseConfigured) return [];
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("homepage_hero_media")
      .select("id, storage_path, public_url, media_type, mime_type, file_size, alt_text, caption, display_order, active, created_at, updated_at")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as HomepageHeroMedia[];
    if (!rows.length) return rows;
    const adminSupabase = createSupabaseAdminClient();
    const { data: signedUrls, error: signedUrlError } = await adminSupabase.storage.from(HERO_MEDIA_BUCKET).createSignedUrls(rows.map((row) => row.storage_path), 3600);
    if (signedUrlError) throw signedUrlError;
    const signedByPath = new Map((signedUrls ?? []).map((item) => [item.path, item.signedUrl]));
    return rows.map((row) => ({ ...row, public_url: signedByPath.get(row.storage_path) ?? row.public_url }));
  } catch (error) {
    // The fallback keeps existing deployments safe until migration 0007 is pushed.
    logSupabaseLoadFailure("Unable to load homepage hero media from Supabase", error);
    return [];
  }
}

export async function getPublicPromoSettings(): Promise<PromoSettings> {
  const noActivePromotion = { ...DEFAULT_PROMO_SETTINGS, code: "", status: "disabled", headerVisible: false } satisfies PromoSettings;
  if (!isSupabaseConfigured) return noActivePromotion;

  try {
    const supabase = createSupabasePublicClient();
    const { data: promotions, error: promotionError } = await supabase
      .from("promotions")
      .select("*")
      .eq("active", true)
      .eq("published", true)
      .order("created_at", { ascending: false });
    if (promotionError || !promotions) return noActivePromotion;
    const records = promotions.map((row) => normalizePromotionRow(row as Record<string, unknown>));
    const promotion = records.find((row) => getPromotionStatus(row) === "active" && row.header_visible);
    if (!promotion) return noActivePromotion;
    const remaining = promotion.max_redemptions === null ? null : Math.max(0, promotion.max_redemptions - promotion.successful_redemptions - promotion.reserved_redemptions);
    return {
      id: promotion.id,
      name: promotion.name,
      status: "active",
      badge: promotion.badge_text,
      message: promotion.message,
      mobileMessage: promotion.mobile_message,
      code: promotion.code,
      endsAt: promotion.ends_at ?? "",
      discountType: promotion.discount_type,
      discountValue: promotion.discount_value,
      startsAt: promotion.starts_at ?? "",
      maxRedemptions: promotion.max_redemptions,
      successfulRedemptions: promotion.successful_redemptions,
      reservedRedemptions: promotion.reserved_redemptions,
      remainingRedemptions: remaining,
      headerVisible: true,
    };
  } catch {
    return noActivePromotion;
  }
}

export async function getPublicContactSettings(): Promise<ContactSettings> {
  if (!isSupabaseConfigured) return DEFAULT_CONTACT_SETTINGS;

  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "site")
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw error;
    return normalizeContactSettings(data?.value);
  } catch {
    // Contact settings are optional CMS content. A missing row, an RLS/cache
    // mismatch, or a temporary public read failure should use the safe public
    // defaults without turning the shared root layout into a console error.
    return DEFAULT_CONTACT_SETTINGS;
  }
}
