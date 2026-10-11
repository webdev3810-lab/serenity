"use client";
import { normalizeRooms, type RoomArrangement } from "@/src/lib/rooms";

/* The CMS reads flexible Supabase rows, so the boundary is intentionally defensive. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { defaultEditorialHomepageContent, type EditorialHomepageContent } from "@/src/lib/homepageEditorialContent";
import { AU_LOCALE,AU_TIME_ZONE } from "@/src/lib/localization";
import { DEFAULT_CONTACT_SETTINGS_RECORD } from "@/src/lib/siteSettings";
import {
BarChart3
} from "lucide-react";



export type Row = Record<string, any>;
export type AdminRole = "admin" | "editor" | "super_admin";
export type AdminTab = "overview" | "homepage" | "houses" | "reviews" | "bookings" | "payments" | "receipts" | "calendar" | "partners" | "enquiries" | "contacts" | "users" | "settings";
export type Tab = AdminTab;
export type HomepageSectionKey = "hero" | "houses" | "intro" | "services" | "faqs" | "social";
export type AdminNavItem = { id: Tab; label: string; description: string; icon: typeof BarChart3 };
export type HomepageFaq = { question: string; answer: string };
export type BedArrangement = RoomArrangement;
export type HomepageDraft = EditorialHomepageContent;
export type AdminUser = { user_id: string; email: string; username?: string; role: AdminRole; active: boolean; created_at: string };

export const emptyProperty = (): Row => ({
  name: "",
  slug: "",
  property_type: "Entire furnished house",
  location: "Pakenham, Victoria, Australia",
  short_description: "",
  full_description: "",
  max_guests: 1,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  bed_arrangements: [{ room: "Bedroom 1", beds: "" }],
  check_in_time: "3:00 PM",
  checkout_time: "11:00 AM",
  pet_policy: "",
  parking_type: "",
  nightly_price: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  extra_guest_fee: 0,
  extra_guest_threshold: 1,
  date_prices: [],
  minimum_stay: 1,
  maximum_stay: 90,
  minimum_guests: 1,
  maximum_adults: 1,
  maximum_children: 1,
  maximum_infants: 2,
  maximum_pets: 2,
  minimum_advance_notice_days: 0,
  maximum_advance_booking_days: 365,
  same_day_booking_allowed: true,
  weekend_booking_allowed: true,
  instant_booking_enabled: true,
  booking_request_required: false,
  pets_allowed: true,
  corporate_booking_allowed: true,
  minimum_corporate_stay: 7,
  minimum_corporate_houses: 1,
  maximum_corporate_houses: 3,
  adjacent_houses_allowed: true,
  long_term_stays_allowed: true,
  corporate_discount: 0,
  corporate_approval_required: false,
  corporate_deposit_required: false,
  corporate_online_payment: true,
  gst_invoice_available: true,
  corporate_instructions: "Corporate stays are welcome. Contact Serenity for multi-house availability, GST invoices, and project-team arrangements.",
  weekly_discount: 0,
  monthly_discount: 0,
  house_rules: [],
  nearby_locations: [],
  unavailable_dates: [],
  latitude: -38.07,
  longitude: 145.48,
  published: false,
  featured: false,
  display_order: 0,
  listing_details: {},
  listing_title: "",
  kitchen_facilities: "",
  laundry_facilities: "",
  wifi_information: "",
  workspace_information: "",
  heating_cooling: "",
  self_check_in_details: "",
  safety_information: "",
  cancellation_policy: "",
  corporate_information: "",
  reviews: [],
});

export const emptyHomepage = (): HomepageDraft => ({
  ...defaultEditorialHomepageContent,
  editorial_highlights: defaultEditorialHomepageContent.editorial_highlights.map((item) => ({ ...item })),
  editorial_services: defaultEditorialHomepageContent.editorial_services.map((item) => ({ ...item })),
  faqs: defaultEditorialHomepageContent.faqs.map((faq) => ({ ...faq })),
});

export const emptySettings = () => ({
  ...DEFAULT_CONTACT_SETTINGS_RECORD,
  locale: "en-AU",
  timezone: "Australia/Melbourne",
  currency: "AUD",
});

export const normalizeAdminSettings = (value: unknown): Record<string, string> => {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const defaults = emptySettings();
  const normalized: Record<string, string> = {
    ...defaults,
    ...Object.fromEntries(Object.entries(raw).map(([key, item]) => [key, String(item ?? "")])),
    contact_email: String(raw.contact_email ?? raw.booking_enquiry_email ?? defaults.contact_email),
    phone_number: String(raw.phone_number ?? raw.phone ?? defaults.phone_number),
    public_address: String(raw.public_address ?? raw.address ?? defaults.public_address),
  };
  // Migrate legacy aliases into the canonical admin-field names when the existing
  // JSONB row is next saved from the new editor.
  delete normalized.phone;
  delete normalized.address;
  delete normalized.promo_badge;
  delete normalized.promo_message;
  delete normalized.promo_mobile_message;
  delete normalized.promo_code;
  delete normalized.promo_ends_at;
  return normalized;
};

export const asList = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
export const asBeds = normalizeRooms;
export const asDatePrices = (value: unknown): Row[] => Array.isArray(value) ? value.map((item) => ({ id: item?.id ? String(item.id) : undefined, property_id: item?.property_id ? String(item.property_id) : undefined, price_date: String(item?.price_date ?? item?.date ?? ""), nightly_price: Number(item?.nightly_price ?? item?.nightlyPrice ?? 0), label: String(item?.label ?? ""), is_active: item?.is_active !== false })).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.price_date) && item.nightly_price >= 0).sort((a, b) => a.price_date.localeCompare(b.price_date)) : [];
export const formatDate = (value: unknown) => value ? new Intl.DateTimeFormat(AU_LOCALE, { dateStyle: "medium", timeZone: AU_TIME_ZONE }).format(new Date(String(value))) : "—";
export const formatMelbourneDateTime = (value: Date) => new Intl.DateTimeFormat(AU_LOCALE, { dateStyle: "medium", timeStyle: "short", timeZone: AU_TIME_ZONE }).format(value);
export const formatMelbourneCompactDateTime = (value: Date) => new Intl.DateTimeFormat(AU_LOCALE, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: AU_TIME_ZONE }).format(value);
export const propertyImageSource = (image: Row) => {
  const storagePath = String(image.storage_path ?? "").trim();
  if (storagePath) return `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/property-images/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
  return String(image.external_url ?? "").trim();
};

export const normalizeProperty = (property: Row): Row => ({ ...emptyProperty(), ...property, date_prices: asDatePrices(property.date_prices), bed_arrangements: asBeds(property.bed_arrangements), amenities: asList(property.amenities), house_rules: asList(property.house_rules), nearby_locations: asList(property.nearby_locations) });
