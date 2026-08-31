"use client";

/* The CMS reads flexible Supabase rows, so the boundary is intentionally defensive. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Filter,
  GripVertical,
  Globe2,
  Home,
  Images,
  LoaderCircle,
  Mail,
  MessageSquare,
  Menu,
  Plus,
  Save,
  Search,
  Settings,
  Star,
  Tag,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { AdminThemeToggle, useAdminTheme } from "@/src/components/AdminTheme";
import HomepageHeroMediaEditor from "@/src/components/HomepageHeroMediaEditor";
import HomepageIntroImageEditor from "@/src/components/HomepageIntroImageEditor";
import CalendarSyncManager from "@/src/components/CalendarSyncManager";
import PropertyPhotoManager from "@/src/components/PropertyPhotoManager";
import AdminPromotions from "@/src/components/AdminPromotions";
import AdminReservationsManager from "@/src/components/AdminReservationsManager";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { CMS_LIMITS, trimCmsText, validateCmsContent } from "@/src/lib/cmsValidation";
import { defaultHomepageFaqs } from "@/src/data/homepageFaqs";
import { AU_LOCALE, AU_TIME_ZONE } from "@/src/lib/localization";
import { DEFAULT_CONTACT_SETTINGS_RECORD } from "@/src/lib/siteSettings";
import { addDays, formatAud, formatDateAu, nightsBetween, todayIso } from "@/src/lib/booking";

type Row = Record<string, any>;
type AdminRole = "admin" | "editor" | "super_admin";
export type AdminTab = "overview" | "homepage" | "houses" | "reviews" | "promotions" | "bookings" | "calendar" | "enquiries" | "contacts" | "users" | "settings";
type Tab = AdminTab;
type HomepageSectionKey = "hero" | "intro" | "search" | "featured" | "benefits" | "corporate" | "location" | "faqs" | "cta";
type AdminNavItem = { id: Tab; label: string; description: string; icon: typeof BarChart3 };
type Benefit = { title: string; description: string };
type HomepageFaq = { question: string; answer: string };
type BedArrangement = { room: string; beds: string };
type HomepageDraft = {
  hero_heading: string;
  hero_subtitle: string;
  hero_image_caption: string;
  hero_cta_label: string;
  hero_cta_href: string;
  intro_eyebrow: string;
  intro_heading: string;
  intro_lead: string;
  intro_body: string;
  intro_cta_label: string;
  intro_cta_href: string;
  intro_art_label: string;
  intro_art_heading: string;
  intro_art_card: string;
  intro_image_1: string;
  intro_image_1_path: string;
  intro_image_2: string;
  intro_image_2_path: string;
  featured_heading: string;
  featured_description: string;
  section_heading: string;
  section_description: string;
  benefits_heading: string;
  benefits_description: string;
  discount_heading: string;
  discount_description: string;
  corporate_heading: string;
  corporate_description: string;
  corporate_cta_label: string;
  corporate_cta_href: string;
  location_heading: string;
  location_description: string;
  benefits: Benefit[];
  faq_heading: string;
  faq_description: string;
  faqs: HomepageFaq[];
  final_cta_heading: string;
  final_cta_description: string;
  final_cta_primary_label: string;
  final_cta_primary_href: string;
  final_cta_secondary_label: string;
  final_cta_secondary_href: string;
};
type AdminUser = { user_id: string; email: string; role: AdminRole; active: boolean; created_at: string };

const emptyProperty = (): Row => ({
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

const emptyHomepage = (): HomepageDraft => ({
  hero_heading: "",
  hero_subtitle: "",
  hero_image_caption: "",
  hero_cta_label: "Browse Houses",
  hero_cta_href: "/houses",
  intro_eyebrow: "Serenity On The Rocks",
  intro_heading: "A premium stay in Pakenham.",
  intro_lead: "With 8 years of hosting experience and Superhost recognition, Serenity offers what standard accommodation cannot: a fully personalised home built around how you live.",
  intro_body: "Every guest has their own space and enjoys a beautifully furnished, peaceful home just a 5-minute walk from Pakenham Train Station. Whether your stay needs corporate convenience, support through relocations, or simply an environment where you can finally relax, comfort comes quickly when you have the whole house to yourself.",
  intro_cta_label: "Learn more about Serenity",
  intro_cta_href: "/about",
  intro_art_label: "Serenity stays",
  intro_art_heading: "Space to settle in.",
  intro_art_card: "Private homes, thoughtfully prepared.",
  intro_image_1: "",
  intro_image_1_path: "",
  intro_image_2: "",
  intro_image_2_path: "",
  featured_heading: "Featured Serenity Houses",
  featured_description: "Explore our turn-key furnished private houses in Pakenham, Victoria.",
  section_heading: "",
  section_description: "",
  benefits_heading: "Everything included for your stay",
  benefits_description: "Turn-key whole-house accommodation equipped for immediate comfort.",
  discount_heading: "",
  discount_description: "",
  corporate_heading: "",
  corporate_description: "",
  corporate_cta_label: "Explore Corporate Stays",
  corporate_cta_href: "/corporate-stays",
  location_heading: "Pakenham Victoria Accommodation Area",
  location_description: "Explore the local area and plan your stay with confidence.",
  benefits: [],
  faq_heading: "Good to know before arrival.",
  faq_description: "Clear answers for families, business travellers, contractors, and longer-stay guests.",
  faqs: defaultHomepageFaqs.map((faq) => ({ ...faq })),
  final_cta_heading: "Find a comfortable house for your next stay.",
  final_cta_description: "Choose your dates, compare the three Serenity houses, and book direct in Australian Dollars.",
  final_cta_primary_label: "Search availability",
  final_cta_primary_href: "/houses",
  final_cta_secondary_label: "Contact Serenity",
  final_cta_secondary_href: "/contact",
});

const emptySettings = () => ({
  ...DEFAULT_CONTACT_SETTINGS_RECORD,
  locale: "en-AU",
  timezone: "Australia/Melbourne",
  currency: "AUD",
});

const normalizeAdminSettings = (value: unknown): Record<string, string> => {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const defaults = emptySettings();
  const normalized: Record<string, string> = {
    ...defaults,
    ...Object.fromEntries(Object.entries(raw).map(([key, item]) => [key, String(item ?? "")])),
    contact_email: String(raw.contact_email ?? raw.booking_enquiry_email ?? defaults.contact_email),
    phone_number: String(raw.phone_number ?? raw.phone ?? defaults.phone_number),
    public_address: String(raw.public_address ?? raw.address ?? defaults.public_address),
  };
  // Migrate legacy aliases into the canonical field names when the existing
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

const asList = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
const asBeds = (value: unknown): BedArrangement[] => Array.isArray(value) ? value.map((item) => ({ room: String(item?.room ?? ""), beds: String(item?.beds ?? "") })) : [];
const asDatePrices = (value: unknown): Row[] => Array.isArray(value) ? value.map((item) => ({ id: item?.id ? String(item.id) : undefined, property_id: item?.property_id ? String(item.property_id) : undefined, price_date: String(item?.price_date ?? item?.date ?? ""), nightly_price: Number(item?.nightly_price ?? item?.nightlyPrice ?? 0), label: String(item?.label ?? ""), is_active: item?.is_active !== false })).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.price_date) && item.nightly_price >= 0).sort((a, b) => a.price_date.localeCompare(b.price_date)) : [];
const formatDate = (value: unknown) => value ? new Intl.DateTimeFormat(AU_LOCALE, { dateStyle: "medium", timeZone: AU_TIME_ZONE }).format(new Date(String(value))) : "—";
const formatMelbourneDateTime = (value: Date) => new Intl.DateTimeFormat(AU_LOCALE, { dateStyle: "medium", timeStyle: "short", timeZone: AU_TIME_ZONE }).format(value);
const formatMelbourneCompactDateTime = (value: Date) => new Intl.DateTimeFormat(AU_LOCALE, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: AU_TIME_ZONE }).format(value);
const propertyImageSource = (image: Row) => {
  const storagePath = String(image.storage_path ?? "").trim();
  if (storagePath) return `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/property-images/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
  return String(image.external_url ?? "").trim();
};

export function SupabaseAdminDashboardV2({ email, role, initialTab = "overview", initialHouseId = "", initialNewHouse = false }: { email: string; role: AdminRole; initialTab?: Tab; initialHouseId?: string; initialNewHouse?: boolean }) {
  const supabase = useMemo(() => createSupabaseBrowserClient() as any, []);
  const router = useRouter();
  const { theme } = useAdminTheme();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [properties, setProperties] = useState<Row[]>([]);
  const [images, setImages] = useState<Row[]>([]);
  const [reviews, setReviews] = useState<Row[]>([]);
  const [bookings, setBookings] = useState<Row[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<Row[]>([]);
  const [calendarConnections, setCalendarConnections] = useState<Row[]>([]);
  const [enquiries, setEnquiries] = useState<Row[]>([]);
  const [contactMessages, setContactMessages] = useState<Row[]>([]);
  const [contactMessagesUnavailable, setContactMessagesUnavailable] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = useState(initialHouseId);
  const [draft, setDraft] = useState<Row>(emptyProperty());
  const [homepage, setHomepage] = useState<HomepageDraft>(emptyHomepage());
  const [homepageSource, setHomepageSource] = useState<Row>({});
  const [homepagePublished, setHomepagePublished] = useState(false);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>(emptySettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [melbourneNow, setMelbourneNow] = useState<Date | null>(null);
  const hasLoadedRef = useRef(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileDrawerOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileDrawerOpen]);

  useEffect(() => {
    const updateMelbourneTime = () => setMelbourneNow(new Date());
    updateMelbourneTime();
    const interval = window.setInterval(updateMelbourneTime, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileMenuOpen]);

  const notify = (text: string) => {
    setMessage(text);
    setError("");
    window.setTimeout(() => setMessage(""), 4000);
  };

  const validateOnServer = async (scope: "property" | "homepage" | "settings", payload: Record<string, unknown>) => {
    const localErrors = validateCmsContent(scope, payload);
    if (localErrors.length) throw new Error(localErrors.join(" "));
    const response = await fetch("/api/admin/cms/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope, payload }) });
    const data = await response.json();
    if (!response.ok || data.valid === false) throw new Error((data.errors ?? [data.error ?? "Content validation failed."]).join(" "));
  };

  const load = async () => {
    const initialLoad = !hasLoadedRef.current;
    if (initialLoad) setLoading(true);
    setError("");
    const [propertyResult, imageResult, amenityResult, reviewResult, datePriceResult, bookingResult, calendarResult, calendarConnectionResult, enquiryResult, contactMessageResult, homepageResult, settingsResult] = await Promise.all([
      supabase.from("properties").select("*").order("display_order"),
      supabase.from("property_images").select("*").order("display_order"),
      supabase.from("amenities").select("*").order("display_order").limit(500),
      supabase.from("property_reviews").select("*").order("display_order"),
      supabase.from("property_date_prices").select("*").order("price_date"),
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("calendar_events").select("*").order("start_date", { ascending: true }),
      supabase.from("calendar_connections").select("id, property_id, platform, connection_type, is_enabled, last_synced_at, last_attempt_at, last_success_at, last_error, last_imported_event_count, sync_frequency_minutes, sync_status").order("platform", { ascending: true }),
      supabase.from("enquiries").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
      supabase.from("homepage_content").select("content, published").eq("page_key", "home").maybeSingle(),
      supabase.from("site_settings").select("key, value").eq("key", "site").maybeSingle(),
    ]);
    const firstError = [propertyResult, imageResult, amenityResult, reviewResult, datePriceResult, bookingResult, calendarResult, calendarConnectionResult, enquiryResult, settingsResult].find((result) => result.error)?.error;
    if (firstError) setError(firstError.message || "Could not load CMS data.");
    const amenities = (amenityResult.data ?? []) as Row[];
    const datePrices = (datePriceResult.data ?? []) as Row[];
    const nextReviews = reviewResult.error ? [] : (reviewResult.data ?? []) as Row[];
    const nextProperties: Row[] = ((propertyResult.data ?? []) as Row[]).map((property) => ({
      ...property,
      amenities: amenities.filter((item) => item.property_id === property.id).sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0)).map((item) => item.name),
      date_prices: asDatePrices(datePrices.filter((item) => item.property_id === property.id)),
      reviews: nextReviews.filter((review) => review.property_id === property.id).sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0)),
    }));
    setProperties(nextProperties);
    setImages((imageResult.data ?? []) as Row[]);
    setReviews(nextReviews);
    setBookings((bookingResult.data ?? []) as Row[]);
    setCalendarEvents((calendarResult.data ?? []) as Row[]);
    setCalendarConnections((calendarConnectionResult.data ?? []) as Row[]);
    setEnquiries((enquiryResult.data ?? []) as Row[]);
    setContactMessages((contactMessageResult.data ?? []) as Row[]);
    setContactMessagesUnavailable(Boolean(contactMessageResult.error));
    const content = (homepageResult.data?.content ?? {}) as Row;
    const firstSection = Array.isArray(content.sections) && content.sections[0] && typeof content.sections[0] === "object" ? content.sections[0] : {};
    const homepageBenefits = Array.isArray(content.benefits)
      ? content.benefits
        .filter((item: unknown) => item && typeof item === "object")
        .map((item: any) => ({ title: String(item.title ?? ""), description: String(item.description ?? item.text ?? "") }))
      : Array.isArray(content.sections)
        ? content.sections
          .filter((item: unknown) => item && typeof item === "object")
          .map((item: any) => ({ title: String(item.title ?? ""), description: String(item.description ?? item.text ?? "") }))
        : [];
    const homepageFaqs: HomepageFaq[] = Array.isArray(content.faqs)
      ? content.faqs
        .filter((item: unknown) => item && typeof item === "object")
        .map((item: any) => ({ question: String(item.question ?? ""), answer: String(item.answer ?? "") }))
      : defaultHomepageFaqs.map((faq) => ({ ...faq }));
    setHomepageSource(content);
    setHomepage({
      hero_heading: String(content.hero_heading ?? ""), hero_subtitle: String(content.hero_subtitle ?? ""), hero_image_caption: String(content.hero_image_caption ?? ""), hero_cta_label: String(content.hero_cta_label ?? "Browse Houses"), hero_cta_href: String(content.hero_cta_href ?? "/houses"),
      intro_eyebrow: String(content.intro_eyebrow ?? "Serenity On The Rocks"), intro_heading: String(content.intro_heading ?? "A premium stay in Pakenham."), intro_lead: String(content.intro_lead ?? "With 8 years of hosting experience and Superhost recognition, Serenity offers what standard accommodation cannot: a fully personalised home built around how you live."), intro_body: String(content.intro_body ?? "Every guest has their own space and enjoys a beautifully furnished, peaceful home just a 5-minute walk from Pakenham Train Station. Whether your stay needs corporate convenience, support through relocations, or simply an environment where you can finally relax, comfort comes quickly when you have the whole house to yourself."), intro_cta_label: String(content.intro_cta_label ?? "Learn more about Serenity"), intro_cta_href: String(content.intro_cta_href ?? "/about"), intro_art_label: String(content.intro_art_label ?? "Serenity stays"), intro_art_heading: String(content.intro_art_heading ?? "Space to settle in."), intro_art_card: String(content.intro_art_card ?? "Private homes, thoughtfully prepared."), intro_image_1: String(content.intro_image_1 ?? ""), intro_image_1_path: String(content.intro_image_1_path ?? ""), intro_image_2: String(content.intro_image_2 ?? ""), intro_image_2_path: String(content.intro_image_2_path ?? ""),
      featured_heading: String(content.featured_heading ?? "Featured Serenity Houses"), featured_description: String(content.featured_description ?? "Explore our turn-key furnished private houses in Pakenham, Victoria."),
      section_heading: String(content.section_heading ?? firstSection.heading ?? ""), section_description: String(content.section_description ?? firstSection.description ?? ""),
      benefits_heading: String(content.benefits_heading ?? "Everything included for your stay"), benefits_description: String(content.benefits_description ?? "Turn-key whole-house accommodation equipped for immediate comfort."),
      discount_heading: String(content.discount_heading ?? ""), discount_description: String(content.discount_description ?? ""),
      corporate_heading: String(content.corporate_heading ?? ""), corporate_description: String(content.corporate_description ?? ""),
      corporate_cta_label: String(content.corporate_cta_label ?? "Explore Corporate Stays"), corporate_cta_href: String(content.corporate_cta_href ?? "/corporate-stays"),
      location_heading: String(content.location_heading ?? "Pakenham Victoria Accommodation Area"), location_description: String(content.location_description ?? "Explore the local area and plan your stay with confidence."),
      benefits: homepageBenefits,
      faq_heading: String(content.faq_heading ?? "Good to know before arrival."), faq_description: String(content.faq_description ?? "Clear answers for families, business travellers, contractors, and longer-stay guests."), faqs: homepageFaqs,
      final_cta_heading: String(content.final_cta_heading ?? "Find a comfortable house for your next stay."), final_cta_description: String(content.final_cta_description ?? "Choose your dates, compare the three Serenity houses, and book direct in Australian Dollars."),
      final_cta_primary_label: String(content.final_cta_primary_label ?? "Search availability"), final_cta_primary_href: String(content.final_cta_primary_href ?? "/houses"),
      final_cta_secondary_label: String(content.final_cta_secondary_label ?? "Contact Serenity"), final_cta_secondary_href: String(content.final_cta_secondary_href ?? "/contact"),
    });
    setHomepagePublished(Boolean(homepageResult.data?.published));
    setSiteSettings(normalizeAdminSettings(settingsResult.data?.value));
    if (role === "super_admin") {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setAdminUsers((data.users ?? []) as AdminUser[]);
      else setError(data.error || "Could not load admin users.");
    }
    setSelectedId((current) => current && nextProperties.some((property) => property.id === current) ? current : "");
    hasLoadedRef.current = true;
    setLoading(false);
  };

  /* The initial load intentionally runs after hydration in this client dashboard. */
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => { void load(); }, []);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  const editProperty = (property: Row) => { setSelectedId(property.id); setDraft({ ...emptyProperty(), ...property, date_prices: asDatePrices(property.date_prices), bed_arrangements: asBeds(property.bed_arrangements), amenities: asList(property.amenities), house_rules: asList(property.house_rules), nearby_locations: asList(property.nearby_locations) }); setTab("houses"); };
  const newProperty = () => { setSelectedId(""); setDraft(emptyProperty()); setTab("houses"); };

  const saveProperty = async (published: boolean) => {
    setSaving(true);
    const amenities = asList(draft.amenities).map((item) => item.trim()).filter(Boolean);
    const houseRules = asList(draft.house_rules).map((item) => item.trim()).filter(Boolean);
    const nearbyLocations = asList(draft.nearby_locations).map((item) => item.trim()).filter(Boolean);
    const datePrices = asDatePrices(draft.date_prices);
    const payload: Row = {
      ...draft,
      name: String(trimCmsText(draft.name)), slug: String(trimCmsText(draft.slug)).toLowerCase(), location: String(trimCmsText(draft.location)),
      short_description: String(trimCmsText(draft.short_description)), full_description: String(trimCmsText(draft.full_description)),
      pet_policy: String(trimCmsText(draft.pet_policy)), parking_type: String(trimCmsText(draft.parking_type)),
      listing_title: String(trimCmsText(draft.listing_title)), kitchen_facilities: String(trimCmsText(draft.kitchen_facilities)),
      laundry_facilities: String(trimCmsText(draft.laundry_facilities)), wifi_information: String(trimCmsText(draft.wifi_information)),
      workspace_information: String(trimCmsText(draft.workspace_information)), heating_cooling: String(trimCmsText(draft.heating_cooling)),
      self_check_in_details: String(trimCmsText(draft.self_check_in_details)), safety_information: String(trimCmsText(draft.safety_information)),
      cancellation_policy: String(trimCmsText(draft.cancellation_policy)), corporate_information: String(trimCmsText(draft.corporate_information)),
      bed_arrangements: asBeds(draft.bed_arrangements), house_rules: houseRules, nearby_locations: nearbyLocations, published,
    };
    for (const key of ["id", "created_at", "updated_at", "amenities", "reviews", "date_prices"]) delete payload[key];
    try {
      await validateOnServer("property", { ...payload, amenities, available_property_count: properties.length || 1 });
      const result = selectedId ? await supabase.from("properties").update(payload).eq("id", selectedId).select("*").single() : await supabase.from("properties").insert(payload).select("*").single();
      if (result.error) throw result.error;
      const propertyId = result.data?.id ?? selectedId;
      if (propertyId) {
        if (datePrices.length) {
          const saveDatePrices = await supabase.from("property_date_prices").upsert(datePrices.map((price) => ({ property_id: propertyId, price_date: price.price_date, nightly_price: price.nightly_price, label: price.label, is_active: price.is_active !== false })), { onConflict: "property_id,price_date" });
          if (saveDatePrices.error) throw saveDatePrices.error;
        }
        const remove = await supabase.from("amenities").delete().eq("property_id", propertyId);
        if (remove.error) throw remove.error;
        if (amenities.length) {
          const insert = await supabase.from("amenities").insert(amenities.map((name, index) => ({ property_id: propertyId, name, display_order: index + 1 })));
          if (insert.error) throw insert.error;
        }
      }
      notify(published ? "House published." : "House draft saved.");
      await load();
      if (propertyId) setSelectedId(propertyId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save house content.");
    } finally { setSaving(false); }
  };

  const deleteProperty = async () => {
    if (!selectedId || !window.confirm("Delete this house and all of its images? This cannot be undone.")) return;
    setSaving(true);
    try {
      const paths = images.filter((image) => image.property_id === selectedId && image.storage_path).map((image) => image.storage_path);
      if (paths.length) await supabase.storage.from("property-images").remove(paths);
      const result = await supabase.from("properties").delete().eq("id", selectedId);
      if (result.error) throw result.error;
      setDraft(emptyProperty()); setSelectedId(""); notify("House deleted."); await load();
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Could not delete house."); } finally { setSaving(false); }
  };

  const saveHomepageSection = async (section: HomepageSectionKey, published: boolean) => {
    setSaving(true);
    const sectionFields: Record<HomepageSectionKey, string[]> = {
      hero: ["hero_heading", "hero_subtitle", "hero_cta_label", "hero_cta_href", "hero_image_caption"],
      intro: ["intro_eyebrow", "intro_heading", "intro_lead", "intro_body", "intro_cta_label", "intro_cta_href", "intro_art_label", "intro_art_heading", "intro_art_card", "intro_image_1", "intro_image_1_path", "intro_image_2", "intro_image_2_path"],
      search: [],
      featured: ["featured_heading", "featured_description"],
      benefits: ["benefits_heading", "benefits_description", "benefits"],
      corporate: ["corporate_heading", "corporate_description", "corporate_cta_label", "corporate_cta_href"],
      location: ["location_heading", "location_description"],
      faqs: ["faq_heading", "faq_description", "faqs"],
      cta: ["final_cta_heading", "final_cta_description", "final_cta_primary_label", "final_cta_primary_href", "final_cta_secondary_label", "final_cta_secondary_href"],
    };
    const content: Row = { ...homepageSource };
    for (const key of sectionFields[section]) {
      content[key] = key === "benefits"
        ? homepage.benefits.map((benefit) => ({ title: benefit.title.trim(), description: benefit.description.trim() }))
        : key === "faqs"
          ? homepage.faqs.map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }))
        : String(homepage[key as keyof HomepageDraft] ?? "").trim();
    }

    try {
      await validateOnServer("homepage", content);
      const result = await supabase.from("homepage_content").upsert({ page_key: "home", content, published }, { onConflict: "page_key" });
      if (result.error) throw result.error;
      if (section === "hero" && published) {
        const mediaResponse = await fetch("/api/admin/hero-media/publish", { method: "POST" });
        const mediaResult = await mediaResponse.json();
        if (!mediaResponse.ok) throw new Error(mediaResult.error || "Hero content was saved, but the images could not be published.");
      }
      setHomepageSource(content);
      setHomepagePublished(published);
      notify(published ? `${section[0].toUpperCase()}${section.slice(1)} section published.` : `${section[0].toUpperCase()}${section.slice(1)} section saved as a draft.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this homepage section.");
      throw saveError;
    } finally { setSaving(false); }
  };

  const toggleFeaturedProperty = async (property: Row) => {
    setSaving(true);
    try {
      const result = await supabase.from("properties").update({ featured: !property.featured }).eq("id", property.id);
      if (result.error) throw result.error;
      notify(property.featured ? `${property.name} removed from featured houses.` : `${property.name} added to featured houses.`);
      await load();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Could not update featured houses.");
    } finally { setSaving(false); }
  };

  const createReview = async (review: Row) => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(review) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create the review.");
      notify("Review added.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not create the review.");
      throw saveError;
    } finally { setSaving(false); }
  };

  const updateReview = async (reviewId: string, review: Row) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(review) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update the review.");
      notify("Review saved.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update the review.");
      throw saveError;
    } finally { setSaving(false); }
  };

  const deleteReview = async (reviewId: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete the review.");
      notify("Review deleted.");
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete the review.");
      throw deleteError;
    } finally { setSaving(false); }
  };

  const saveSettings = async () => {
    setSaving(true);
    const cleaned = Object.fromEntries(Object.entries(siteSettings).map(([key, value]) => [key, String(trimCmsText(value))]));
    try {
      await validateOnServer("settings", cleaned);
      const result = await supabase.from("site_settings").upsert({ key: "site", value: cleaned, is_public: true }, { onConflict: "key" });
      if (result.error) throw result.error;
      setSiteSettings(cleaned); notify("Site settings saved.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save site settings."); } finally { setSaving(false); }
  };

  const setEnquiryStatus = async (enquiry: Row, status: string) => {
    const result = await supabase.from("enquiries").update({ status }).eq("id", enquiry.id);
    if (result.error) setError(result.error.message); else { notify("Enquiry status updated."); await load(); }
  };

  const setEnquiryNotes = async (enquiry: Row, internalNotes: string) => {
    const result = await supabase.from("enquiries").update({ internal_notes: internalNotes.slice(0, CMS_LIMITS.admin_notes) }).eq("id", enquiry.id);
    if (result.error) setError(result.error.message); else { notify("Enquiry notes saved."); setEnquiries((current) => current.map((item) => item.id === enquiry.id ? { ...item, internal_notes: internalNotes.slice(0, CMS_LIMITS.admin_notes) } : item)); }
  };

  const setContactStatus = async (contactMessage: Row, status: string) => {
    const result = await supabase.from("contact_messages").update({ status }).eq("id", contactMessage.id);
    if (result.error) setError(result.error.message); else { notify("Contact message status updated."); await load(); }
  };

  const setContactNotes = async (contactMessage: Row, internalNotes: string) => {
    const notes = internalNotes.slice(0, CMS_LIMITS.admin_notes);
    const result = await supabase.from("contact_messages").update({ internal_notes: notes }).eq("id", contactMessage.id);
    if (result.error) setError(result.error.message); else { notify("Contact message notes saved."); setContactMessages((current) => current.map((item) => item.id === contactMessage.id ? { ...item, internal_notes: notes } : item)); }
  };

  const convertEnquiry = async (enquiry: Row) => {
    if (!window.confirm("Convert this approved corporate enquiry into bookings for every selected house?")) return;
    try {
      const response = await fetch(`/api/admin/enquiries/${enquiry.id}/convert`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not convert enquiry.");
      notify("Corporate enquiry converted into bookings.");
      await load();
    } catch (convertError) { setError(convertError instanceof Error ? convertError.message : "Could not convert enquiry."); }
  };

  const createAdminUser = async (newEmail: string, newRole: AdminRole) => {
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: newEmail, role: newRole }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not invite admin user.");
    notify("Invitation sent."); await load();
  };

  const updateAdminUser = async (userId: string, changes: { role?: AdminRole; active?: boolean }) => {
    const response = await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not update admin user.");
    notify("Admin user updated."); await load();
  };

  const deleteAdminUser = async (userId: string) => {
    const response = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not remove admin user.");
    notify("Admin user removed."); await load();
  };

  const navItems: AdminNavItem[] = [
    { id: "overview", label: "Dashboard", description: "At a glance", icon: BarChart3 },
    { id: "homepage", label: "Homepage CMS", description: "Edit landing content", icon: Home },
    { id: "houses", label: "Houses", description: "Content, pricing, photos", icon: Building2 },
    { id: "reviews", label: "Reviews", description: "Guest feedback", icon: Star },
    { id: "promotions", label: "Promotions", description: "Voucher campaigns", icon: Tag },
    { id: "bookings", label: "Bookings", description: "Reservations and status", icon: CalendarDays },
    { id: "calendar", label: "Calendar sync", description: "External availability", icon: CalendarRange },
    { id: "enquiries", label: "Enquiries", description: "Corporate requests", icon: MessageSquare },
    { id: "contacts", label: "Contacts", description: "Customer messages", icon: Mail },
    ...(role === "super_admin" ? [{ id: "users" as Tab, label: "Admin users", description: "Access and roles", icon: UsersRound }] : []),
    { id: "settings", label: "Site settings", description: "Locale and contact", icon: Settings },
  ];

  const activeNavItem = navItems.find((item) => item.id === tab) ?? navItems[0];
  const handleNavigation = (id: Tab) => {
    setMobileDrawerOpen(false);
    if (initialHouseId || initialNewHouse) {
      router.push(id === "overview" ? "/admin" : `/admin?tab=${id}`);
      return;
    }
    setTab(id);
    router.replace(id === "overview" ? "/admin" : `/admin?tab=${id}`, { scroll: false });
  };

  const logout = async () => { await supabase.auth.signOut(); router.replace("/admin/login"); };

  return (
    <main className={`admin-shell admin-theme-${theme}`}>
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-header-site-brand" aria-label="Serenity on the Rocks">
            <span className="admin-header-site-mark" aria-hidden="true">S</span>
            <span className="admin-header-site-copy">
              <strong>Serenity on the Rocks</strong>
              <small>Admin workspace</small>
            </span>
          </div>
          <div className="admin-header-brand">
            <button type="button" className="admin-mobile-menu" aria-label="Open admin navigation" aria-controls="admin-sidebar" aria-expanded={mobileDrawerOpen} onClick={() => { setSidebarCollapsed(false); setMobileDrawerOpen(true); }}><Menu size={21} /></button>
            <div className="admin-header-context"><p className="admin-header-brand-name">Serenity on the Rocks</p><h1>{activeNavItem.label}</h1><p className="admin-header-description">{activeNavItem.description}</p></div>
          </div>
          <div className="admin-header-actions">
            <div className="admin-datetime" aria-label="Current date and time in Melbourne, Australia">
              <Clock3 className="admin-datetime-icon" size={16} aria-hidden="true" />
              <span className="admin-datetime-copy">
                <span className="admin-datetime-label">Melbourne time</span>
                <time className="admin-datetime-full" dateTime={melbourneNow?.toISOString()}>{melbourneNow ? formatMelbourneDateTime(melbourneNow) : "Loading…"}</time>
                <time className="admin-datetime-compact" dateTime={melbourneNow?.toISOString()}>{melbourneNow ? formatMelbourneCompactDateTime(melbourneNow) : "Loading…"}</time>
              </span>
            </div>
            <div className="admin-profile-menu" ref={profileMenuRef}>
              <button type="button" className="admin-profile-trigger" aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((current) => !current)}>
                <span className="admin-profile-trigger-avatar" aria-hidden="true">{email.trim().charAt(0).toUpperCase() || "S"}</span>
                <span className="admin-profile-trigger-copy">
                  <strong>Serenity admin</strong>
                  <small>{role.replace("_", " ")}</small>
                </span>
                <ChevronDown className="admin-profile-trigger-chevron" size={16} aria-hidden="true" />
              </button>
              {profileMenuOpen && (
                <div className="admin-profile-dropdown" role="menu" aria-label="Profile menu">
                  <div className="admin-profile-dropdown-intro">
                    <span className="admin-profile-dropdown-label">Signed in as</span>
                    <strong>{email}</strong>
                    <span>{role.replace("_", " ")}</span>
                  </div>
                  <div className="admin-profile-dropdown-row">
                    <Clock3 size={16} aria-hidden="true" />
                    <span><small>Melbourne time</small><time dateTime={melbourneNow?.toISOString()}>{melbourneNow ? formatMelbourneDateTime(melbourneNow) : "Loading…"}</time></span>
                  </div>
                  <div className="admin-profile-dropdown-row admin-profile-theme-row">
                    <span><small>Theme</small><strong>{theme === "light" ? "Day mode" : "Night mode"}</strong></span>
                    <AdminThemeToggle />
                  </div>
                  <button type="button" className="admin-profile-logout" role="menuitem" onClick={() => { setProfileMenuOpen(false); void logout(); }}>Log out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className={`admin-layout ${sidebarCollapsed ? "is-collapsed" : ""} ${mobileDrawerOpen ? "mobile-open" : ""}`}>
        <button type="button" className="admin-sidebar-backdrop" aria-label="Close admin navigation" onClick={() => setMobileDrawerOpen(false)} />
        <div className="admin-sidebar-frame">
          <aside id="admin-sidebar" className="admin-sidebar" aria-label="Admin navigation">
            <div className="admin-sidebar-top">
              <button type="button" className="admin-sidebar-close" aria-label="Close admin navigation" onClick={() => setMobileDrawerOpen(false)}><X size={19} /></button>
            </div>
            <SidebarProfile email={email} role={role} collapsed={sidebarCollapsed} />
            <AdminNavigation items={navItems} active={tab} collapsed={sidebarCollapsed} onSelect={handleNavigation} />
          </aside>
          <button type="button" className="admin-sidebar-toggle" aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setSidebarCollapsed((current) => !current)}>{sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button>
        </div>
        <section className="admin-content" aria-busy={loading}>
          {message && <div className="admin-notice is-success" role="status"><CheckCircle2 size={18} />{message}</div>}
          {error && <div className="admin-notice is-error" role="alert"><X size={18} />{error}</div>}
          {loading ? <div className="card admin-loading-state" role="status"><LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> <span>Loading your CMS workspace…</span></div> : tab === "overview" ? <Overview properties={properties} enquiries={enquiries} bookings={bookings} calendarEvents={calendarEvents} calendarConnections={calendarConnections} onNavigate={handleNavigation} /> : tab === "homepage" ? <HomepageSectionsEditor homepage={homepage} setHomepage={setHomepage} published={homepagePublished} saveSection={saveHomepageSection} saving={saving} properties={properties} toggleFeatured={toggleFeaturedProperty} onError={setError} /> : tab === "houses" ? <HouseEditor properties={properties} draft={draft} setDraft={setDraft} selectedId={selectedId} editProperty={editProperty} newProperty={newProperty} saveProperty={saveProperty} deleteProperty={deleteProperty} saving={saving} images={images} reload={load} notify={notify} onError={setError} initialNewHouse={initialNewHouse} isDetailPage={Boolean(initialHouseId || initialNewHouse)} openHouse={(propertyId: string) => router.push(`/admin/houses/${propertyId}`)} openNewHouse={() => router.push("/admin/houses/new")} onBackToHouses={() => router.push("/admin?tab=houses")} /> : tab === "reviews" ? <ReviewManager properties={properties} reviews={reviews} createReview={createReview} updateReview={updateReview} deleteReview={deleteReview} /> : tab === "promotions" ? <AdminPromotions properties={properties as unknown as Array<{ id: string; name: string }>} /> : tab === "bookings" ? <AdminReservationsManager bookings={bookings} enquiries={enquiries} calendarEvents={calendarEvents} properties={properties} reload={load} notify={notify} onError={setError} convertEnquiry={convertEnquiry} updateEnquiryStatus={setEnquiryStatus} openCalendar={() => handleNavigation("calendar")} /> : tab === "calendar" ? <CalendarSyncManager /> : tab === "enquiries" ? <EnquiryManager enquiries={enquiries} updateStatus={setEnquiryStatus} updateNotes={setEnquiryNotes} convert={convertEnquiry} /> : tab === "contacts" ? <ContactManager contacts={contactMessages} unavailable={contactMessagesUnavailable} updateStatus={setContactStatus} updateNotes={setContactNotes} /> : tab === "users" && role === "super_admin" ? <AdminUserManager users={adminUsers} currentUserEmail={email} createUser={createAdminUser} updateUser={updateAdminUser} deleteUser={deleteAdminUser} /> : <SettingsPanel email={email} settings={siteSettings} setSettings={setSiteSettings} save={saveSettings} saving={saving} />}
        </section>
      </div>
    </main>
  );
}

function SidebarProfile({ email, role, collapsed }: { email: string; role: AdminRole; collapsed: boolean }) {
  const initial = email.trim().charAt(0).toUpperCase() || "S";
  const roleLabel = role.replace("_", " ");

  return (
    <div
      className="admin-sidebar-profile"
      title={collapsed ? `${email} · ${roleLabel}` : undefined}
    >
      <span className="admin-avatar" aria-hidden="true">{initial}</span>
      <span className="admin-profile-copy">
        <span className="admin-profile-name">Serenity admin</span>
        <span className="admin-profile-email">{email}</span>
        <span className="admin-profile-role">{roleLabel}</span>
      </span>
    </div>
  );
}

function AdminNavigation({ items, active, collapsed, onSelect }: { items: AdminNavItem[]; active: Tab; collapsed: boolean; onSelect: (id: Tab) => void }) {
  const groups = [
    { label: "Workspace", items: items.filter((item) => item.id === "overview") },
    { label: "Content", items: items.filter((item) => ["homepage", "houses", "reviews", "promotions"].includes(item.id)) },
    { label: "Operations", items: items.filter((item) => ["bookings", "calendar", "enquiries", "contacts"].includes(item.id)) },
    { label: "Administration", items: items.filter((item) => ["users", "settings"].includes(item.id)) },
  ];

  return (
    <nav className="admin-nav-list" aria-label="Admin sections">
      {groups.filter((group) => group.items.length > 0).map((group) => (
        <div className="admin-nav-group" key={group.label}>
          <p className="admin-nav-group-label">{group.label}</p>
          <div className="admin-nav-group-items">
            {group.items.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                aria-current={active === id ? "page" : undefined}
                onClick={() => onSelect(id)}
                className={`admin-nav-item ${active === id ? "is-active" : ""}`}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="admin-nav-copy">
                  <span className="admin-nav-label">{label}</span>
                  <span className="admin-nav-description">{description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

type OverviewPeriod = "today" | "week" | "month" | "year" | "custom";
type OverviewRange = { start: string; end: string };
type OverviewChartPoint = { label: string; value: number; detail?: string };

const OVERVIEW_ACTIVE_BOOKING_STATUSES = ["pending_payment", "confirmed", "corporate", "checked_in"];
const OVERVIEW_BOOKING_STATUSES = ["pending_payment", "confirmed", "corporate", "checked_in", "checked_out", "cancelled", "expired"];

const dateOnly = (value: unknown) => String(value ?? "").slice(0, 10);
const dateInOverviewRange = (value: unknown, range: OverviewRange) => {
  const date = dateOnly(value);
  return Boolean(date) && date >= range.start && date <= range.end;
};
const rangesOverlap = (start: string, end: string, rangeStart: string, rangeEndExclusive: string) => Boolean(start && end) && start < rangeEndExclusive && end > rangeStart;
const isOverviewActiveBooking = (booking: Row) => OVERVIEW_ACTIVE_BOOKING_STATUSES.includes(String(booking.booking_status ?? "").toLowerCase());
const overviewBookingType = (booking: Row) => String(booking.booking_type ?? (String(booking.booking_status ?? "").toLowerCase() === "corporate" ? "corporate" : "standard")).toLowerCase();
const overviewStatusLabel = (status: string) => status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function startOfMonthIso(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function endOfMonthIso(value: string) {
  const [year, month] = value.slice(0, 7).split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function overviewRange(period: OverviewPeriod, customStart: string, customEnd: string): OverviewRange {
  const today = todayIso();
  if (period === "today") return { start: today, end: today };
  if (period === "week") {
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    const start = addDays(today, weekday === 0 ? -6 : 1 - weekday);
    return { start, end: addDays(start, 6) };
  }
  if (period === "year") return { start: `${today.slice(0, 4)}-01-01`, end: `${today.slice(0, 4)}-12-31` };
  if (period === "custom") {
    const start = customStart || startOfMonthIso(today);
    const end = customEnd || today;
    return start <= end ? { start, end } : { start: end, end: start };
  }
  return { start: startOfMonthIso(today), end: endOfMonthIso(today) };
}

function overviewRangeLabel(range: OverviewRange) {
  return range.start === range.end ? formatDateAu(range.start) : `${formatDateAu(range.start)} – ${formatDateAu(range.end)}`;
}

function createOverviewBuckets(range: OverviewRange) {
  const days = nightsBetween(range.start, addDays(range.end, 1));
  if (days <= 31) {
    return Array.from({ length: days }, (_, index) => {
      const date = addDays(range.start, index);
      return { start: date, end: date, label: new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)) };
    });
  }
  const buckets: Array<{ start: string; end: string; label: string }> = [];
  let cursor = startOfMonthIso(range.start);
  while (cursor <= range.end) {
    const monthEnd = endOfMonthIso(cursor);
    const start = cursor < range.start ? range.start : cursor;
    const end = monthEnd > range.end ? range.end : monthEnd;
    buckets.push({ start, end, label: new Intl.DateTimeFormat("en-AU", { month: "short", year: range.start.slice(0, 4) === range.end.slice(0, 4) ? undefined : "numeric", timeZone: "UTC" }).format(new Date(`${cursor}T00:00:00Z`)) });
    cursor = addDays(monthEnd, 1);
  }
  return buckets;
}

function Overview({ properties, enquiries, bookings, calendarEvents, calendarConnections, onNavigate }: { properties: Row[]; enquiries: Row[]; bookings: Row[]; calendarEvents: Row[]; calendarConnections: Row[]; onNavigate: (tab: Tab) => void }) {
  const today = todayIso();
  const [period, setPeriod] = useState<OverviewPeriod>("month");
  const [customStart, setCustomStart] = useState(startOfMonthIso(today));
  const [customEnd, setCustomEnd] = useState(today);
  const [houseFilter, setHouseFilter] = useState("all");
  const [bookingTypeFilter, setBookingTypeFilter] = useState("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const range = useMemo(() => overviewRange(period, customStart, customEnd), [period, customStart, customEnd]);
  const rangeLabel = overviewRangeLabel(range);
  const activeProperties = useMemo(() => properties.filter((property) => property.published === true), [properties]);
  const propertyNames = useMemo(() => new Map(properties.map((property) => [String(property.id), String(property.name || "Serenity house")])), [properties]);
  const filteredBookings = useMemo(() => bookings.filter((booking) => dateInOverviewRange(booking.check_in, range)
    && (houseFilter === "all" || String(booking.property_id) === houseFilter)
    && (bookingTypeFilter === "all" || overviewBookingType(booking) === bookingTypeFilter)
    && (bookingStatusFilter === "all" || String(booking.booking_status ?? "") === bookingStatusFilter)), [bookings, range, houseFilter, bookingTypeFilter, bookingStatusFilter]);
  const filteredEnquiries = useMemo(() => enquiries.filter((enquiry) => dateInOverviewRange(enquiry.created_at ?? enquiry.arrival, range)), [enquiries, range]);
  const activeFilteredBookings = useMemo(() => filteredBookings.filter(isOverviewActiveBooking), [filteredBookings]);
  const upcomingArrivals = useMemo(() => activeFilteredBookings.filter((booking) => dateOnly(booking.check_in) >= today).sort((a, b) => dateOnly(a.check_in).localeCompare(dateOnly(b.check_in))), [activeFilteredBookings, today]);
  const upcomingBlocks = useMemo(() => calendarEvents.filter((event) => event.status === "active" && event.is_blocking !== false && dateOnly(event.end_date) > today && dateOnly(event.start_date) <= range.end).sort((a, b) => dateOnly(a.start_date).localeCompare(dateOnly(b.start_date))), [calendarEvents, today, range.end]);
  const calendarWarnings = useMemo(() => calendarConnections.filter((connection) => Boolean(connection.last_error) || ["error", "conflict"].includes(String(connection.sync_status ?? ""))), [calendarConnections]);
  const currentOccupiedIds = useMemo(() => new Set(bookings.filter(isOverviewActiveBooking).filter((booking) => rangesOverlap(dateOnly(booking.check_in), dateOnly(booking.checkout), today, addDays(today, 1))).map((booking) => String(booking.property_id))), [bookings, today]);
  const currentBlockedIds = useMemo(() => new Set(upcomingBlocks.filter((event) => rangesOverlap(dateOnly(event.start_date), dateOnly(event.end_date), today, addDays(today, 1))).map((event) => String(event.property_id))), [upcomingBlocks, today]);
  const selectedActiveProperties = activeProperties.filter((property) => houseFilter === "all" || String(property.id) === houseFilter);
  const currentOccupiedCount = selectedActiveProperties.filter((property) => currentOccupiedIds.has(String(property.id))).length;
  const currentBlockedCount = selectedActiveProperties.filter((property) => currentBlockedIds.has(String(property.id))).length;
  const availableHouseCount = selectedActiveProperties.filter((property) => !currentOccupiedIds.has(String(property.id)) && !currentBlockedIds.has(String(property.id))).length;
  const paidRevenue = filteredBookings.filter((booking) => String(booking.payment_status ?? "").toLowerCase() === "paid").reduce((sum, booking) => sum + Number(booking.total ?? 0), 0);
  const pendingPaymentBookings = filteredBookings.filter((booking) => String(booking.payment_status ?? "").toLowerCase() === "pending");
  const pendingPaymentValue = pendingPaymentBookings.reduce((sum, booking) => sum + Number(booking.total ?? 0), 0);
  const pendingBookings = filteredBookings.filter((booking) => String(booking.booking_status ?? "").toLowerCase() === "pending_payment");
  const pendingEnquiries = filteredEnquiries.filter((enquiry) => ["new", "pending_approval"].includes(String(enquiry.status ?? "").toLowerCase()));
  const todayCheckIns = activeFilteredBookings.filter((booking) => dateOnly(booking.check_in) === today);
  const todayCheckouts = activeFilteredBookings.filter((booking) => dateOnly(booking.checkout) === today);
  const hasActionAlerts = pendingBookings.length > 0 || pendingPaymentBookings.length > 0 || pendingEnquiries.length > 0 || calendarWarnings.length > 0;
  const buckets = useMemo(() => createOverviewBuckets(range), [range]);
  const bookingSeries: OverviewChartPoint[] = buckets.map((bucket) => ({ label: bucket.label, value: filteredBookings.filter((booking) => dateInOverviewRange(booking.check_in, bucket)).length }));
  const resetFilters = () => { setPeriod("month"); setCustomStart(startOfMonthIso(today)); setCustomEnd(today); setHouseFilter("all"); setBookingTypeFilter("all"); setBookingStatusFilter("all"); };

  return <>
    <PageHeader eyebrow="Dashboard" title="Dashboard" description="The essential booking, payment, and availability information for today." action={<button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => onNavigate("houses")}><Building2 size={16} /> Manage houses</button>} />
    <section className="admin-overview-filters card" aria-label="Overview filters">
      <div className="admin-overview-filter-heading"><div><p className="admin-section-kicker">Filters</p><h2>Refine the overview</h2><p>Stay dates use Melbourne time. Revenue is shown in AUD.</p></div><Filter size={18} aria-hidden="true" /></div>
      <div className="admin-overview-filter-grid">
        <label>Stay date range<select className="field mt-1" value={period} onChange={(event) => setPeriod(event.target.value as OverviewPeriod)}><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Custom date range</option></select></label>
        {period === "custom" && <><label>From<input className="field mt-1" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label><label>To<input className="field mt-1" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label></>}
        <label>House<select className="field mt-1" value={houseFilter} onChange={(event) => setHouseFilter(event.target.value)}><option value="all">All houses</option>{properties.map((property) => <option key={String(property.id)} value={String(property.id)}>{String(property.name)}</option>)}</select></label>
        <label>Booking type<select className="field mt-1" value={bookingTypeFilter} onChange={(event) => setBookingTypeFilter(event.target.value)}><option value="all">All booking types</option><option value="standard">Standard</option><option value="corporate">Corporate</option><option value="admin">Admin</option></select></label>
        <label>Booking status<select className="field mt-1" value={bookingStatusFilter} onChange={(event) => setBookingStatusFilter(event.target.value)}><option value="all">All booking statuses</option>{OVERVIEW_BOOKING_STATUSES.map((status) => <option key={status} value={status}>{overviewStatusLabel(status)}</option>)}</select></label>
      </div>
      <div className="admin-overview-filter-footer"><p>Showing stay dates from <strong>{rangeLabel}</strong>.</p><button type="button" className="btn-outline-dark min-h-9 px-3 text-xs" onClick={resetFilters}>Reset filters</button></div>
    </section>

    <section className="admin-overview-summary mt-5">
      <OverviewSectionHeading eyebrow="At a glance" title="What needs your attention" description={`Live booking and availability information for ${rangeLabel}.`} actionLabel="View all bookings" onAction={() => onNavigate("bookings")} />
      <div className="admin-overview-metrics grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Upcoming bookings" value={upcomingArrivals.length} detail={`Next arrivals · ${rangeLabel}`} onClick={() => onNavigate("bookings")} />
        <Metric label="Pending requests" value={pendingBookings.length + pendingEnquiries.length} detail={`${pendingBookings.length} booking${pendingBookings.length === 1 ? "" : "s"} · ${pendingEnquiries.length} enquir${pendingEnquiries.length === 1 ? "y" : "ies"}`} onClick={() => onNavigate(pendingBookings.length > 0 ? "bookings" : "enquiries")} />
        <Metric label="Today’s check-ins" value={todayCheckIns.length} detail="Active arrivals today" onClick={() => onNavigate("bookings")} />
        <Metric label="Today’s check-outs" value={todayCheckouts.length} detail="Departures today" onClick={() => onNavigate("bookings")} />
        <Metric label="Available houses" value={availableHouseCount} detail={`${currentOccupiedCount} occupied · ${currentBlockedCount} blocked today · ${upcomingBlocks.length} upcoming blocks`} onClick={() => onNavigate("calendar")} />
        <Metric label="Revenue collected" value={formatAud(paidRevenue)} detail={`${pendingPaymentBookings.length} pending payment${pendingPaymentBookings.length === 1 ? "" : "s"} · ${formatAud(pendingPaymentValue)}`} onClick={() => onNavigate("bookings")} />
      </div>
    </section>

    <section className="admin-overview-section"><OverviewSectionHeading eyebrow="Booking activity" title="Upcoming booking activity" description="A short view of live arrivals in the selected stay-date range." actionLabel="View all bookings" onAction={() => onNavigate("bookings")} /><div className="admin-overview-chart-grid"><OverviewChartCard title="Bookings over time" description="Bookings grouped by check-in date." points={bookingSeries} emptyLabel="No bookings in this range." onOpen={() => onNavigate("bookings")} /></div><div className="admin-overview-table-grid mt-4"><OverviewBookingTable title="Upcoming bookings" items={upcomingArrivals.slice(0, 6)} dateField="check_in" emptyLabel="No upcoming bookings in this range." propertyNames={propertyNames} onOpen={() => onNavigate("bookings")} /></div></section>

    <section className="admin-overview-section"><OverviewSectionHeading eyebrow="Action required" title={hasActionAlerts ? "Review these items" : "Nothing needs your attention"} description="Pending requests, payment issues, and calendar warnings appear here when they need action." actionLabel="View calendar alerts" onAction={() => onNavigate("calendar")} /><div className="admin-overview-panel">{hasActionAlerts ? <div className="admin-overview-record-list">
      {pendingBookings.length > 0 && <button type="button" onClick={() => onNavigate("bookings")}><span className="admin-overview-record-main"><strong>{pendingBookings.length} pending booking{pendingBookings.length === 1 ? "" : "s"}</strong><span>Review dates, guest details, and confirmation status.</span></span><span className="admin-status-badge" data-tone="warning">View bookings</span></button>}
      {pendingPaymentBookings.length > 0 && <button type="button" onClick={() => onNavigate("bookings")}><span className="admin-overview-record-main"><strong>{pendingPaymentBookings.length} pending payment{pendingPaymentBookings.length === 1 ? "" : "s"}</strong><span>{formatAud(pendingPaymentValue)} is awaiting payment.</span></span><span className="admin-status-badge" data-tone="warning">View payments</span></button>}
       {pendingEnquiries.length > 0 && <button type="button" onClick={() => onNavigate("enquiries")}><span className="admin-overview-record-main"><strong>{pendingEnquiries.length === 1 ? "1 enquiry waiting" : `${pendingEnquiries.length} enquiries waiting`}</strong><span>New or pending corporate requests need a response.</span></span><span className="admin-status-badge" data-tone="info">View enquiries</span></button>}
      {calendarWarnings.length > 0 && <button type="button" onClick={() => onNavigate("calendar")}><span className="admin-overview-record-main"><strong>{calendarWarnings.length} calendar warning{calendarWarnings.length === 1 ? "" : "s"}</strong><span>Sync errors or conflicts may affect availability.</span></span><span className="admin-status-badge" data-tone="danger">View calendar</span></button>}
    </div> : <OverviewEmptyState title="No action required" description="There are no pending requests or calendar warnings in the current view." onOpen={() => onNavigate("calendar")} actionLabel="View calendar" />}</div></section>
  </>;
}

function formatOverviewDate(value: unknown) {
  const date = dateOnly(value);
  return date ? formatDateAu(date) : "Date not supplied";
}

function OverviewSectionHeading({ eyebrow, title, description, actionLabel, onAction }: { eyebrow: string; title: string; description: string; actionLabel: string; onAction: () => void }) {
  return <div className="admin-overview-section-heading"><div><p className="admin-section-kicker">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div><button type="button" className="btn-outline-dark min-h-9 shrink-0 px-3 text-xs" onClick={onAction}>{actionLabel}</button></div>;
}

function OverviewChartCard({ title, description, points, emptyLabel, valueFormatter = (value: number) => String(value), onOpen }: { title: string; description: string; points: OverviewChartPoint[]; emptyLabel: string; valueFormatter?: (value: number) => string; onOpen: () => void }) {
  const max = Math.max(...points.map((point) => point.value), 0);
  const hasData = points.some((point) => point.value > 0);
  return <section className="admin-overview-panel admin-overview-chart-card"><div className="admin-overview-panel-heading"><div><p className="admin-section-kicker">Data visualisation</p><h3>{title}</h3><p>{description}</p></div><button type="button" className="admin-overview-text-action" onClick={onOpen}>Open records</button></div>{hasData ? <><div className="admin-overview-bars" role="img" aria-label={`${title}: ${points.filter((point) => point.value > 0).map((point) => `${point.label} ${valueFormatter(point.value)}`).join(", ")}`}><div className="admin-overview-bar-grid" aria-hidden="true"><span /><span /><span /><span /></div>{points.map((point) => <div className="admin-overview-bar-item" key={point.label}><div className="admin-overview-bar-track"><span className="admin-overview-bar-fill" style={{ height: `${Math.max(5, (point.value / max) * 100)}%` }} /></div><strong>{point.label}</strong><small>{valueFormatter(point.value)}</small></div>)}</div><details className="admin-overview-data-details"><summary>View data table</summary><table className="admin-overview-data-table"><thead><tr><th>Period</th><th>Value</th></tr></thead><tbody>{points.map((point) => <tr key={`table-${point.label}`}><td>{point.label}</td><td>{valueFormatter(point.value)}</td></tr>)}</tbody></table></details></> : <OverviewEmptyState title={emptyLabel} description="Adjust the date or booking filters to see live records." onOpen={onOpen} actionLabel="Open records" />}</section>;
}

function OverviewBookingTable({ title, items, dateField, emptyLabel, propertyNames, onOpen }: { title: string; items: Row[]; dateField: "check_in" | "checkout"; emptyLabel: string; propertyNames: Map<string, string>; onOpen: () => void }) {
  return <section className="admin-overview-panel"><div className="admin-overview-panel-heading"><div><p className="admin-section-kicker">Live records</p><h3>{title}</h3></div><button type="button" className="admin-overview-text-action" onClick={onOpen}>Open bookings</button></div>{items.length ? <div className="admin-overview-record-list">{items.map((booking) => <button type="button" key={String(booking.id)} onClick={onOpen}><span className="admin-overview-record-main"><strong>{String(booking.reference || "Booking")}</strong><span>{propertyNames.get(String(booking.property_id)) ?? "Serenity house"}</span></span><span className="admin-overview-record-side"><span>{formatOverviewDate(booking[dateField])}</span><small>{overviewStatusLabel(overviewBookingType(booking))}</small></span></button>)}</div> : <OverviewEmptyState title={emptyLabel} description="No active booking records match the selected range." onOpen={onOpen} actionLabel="Open bookings" />}</section>;
}

function OverviewEmptyState({ title, description, onOpen, actionLabel }: { title: string; description: string; onOpen: () => void; actionLabel: string }) {
  return <div className="admin-overview-empty"><p>{title}</p><span>{description}</span><button type="button" className="admin-overview-text-action" onClick={onOpen}>{actionLabel}</button></div>;
}

function LegacyHouseEditor({ draft, setDraft, selectedId }: any) {
  const [preview, setPreview] = useState(false);
  const field = (key: string, value: unknown) => setDraft((current: Row) => ({ ...current, [key]: value }));
  return <><section className="card grid gap-5 bg-white p-5 sm:p-7 md:grid-cols-2"><div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE1DD] pb-5"><div><p className="text-sm font-bold text-stone-900">{selectedId ? "Editing selected house" : "New house draft"}</p><p className="mt-1 text-xs text-stone-500">All house sections save together from the action bar below.</p></div><StatusBadge label={draft.published ? "Published" : "Draft"} tone={draft.published ? "success" : "neutral"} /></div><CharacterField label="Property name" value={draft.name} onChange={(value) => field("name", value)} limit={CMS_LIMITS.property_name} /><CharacterField label="Slug" value={draft.slug} onChange={(value) => field("slug", value)} limit={80} help="Lowercase URL name, for example serenity-7." /><CharacterField label="Location" value={draft.location} onChange={(value) => field("location", value)} limit={CMS_LIMITS.nearby_location} /><CharacterField label="Property type" value={draft.property_type} onChange={(value) => field("property_type", value)} limit={80} /><CharacterField label="Short description" value={draft.short_description} onChange={(value) => field("short_description", value)} limit={CMS_LIMITS.property_short_description} textarea /><CharacterField label="Full description" value={draft.full_description} onChange={(value) => field("full_description", value)} limit={CMS_LIMITS.property_full_description} textarea /><NumberField label="Nightly price (AUD)" value={draft.nightly_price} onChange={(value) => field("nightly_price", value)} /><NumberField label="Cleaning fee" value={draft.cleaning_fee} onChange={(value) => field("cleaning_fee", value)} /><NumberField label="Pet fee" value={draft.pet_fee} onChange={(value) => field("pet_fee", value)} /><NumberField label="Extra guest fee" value={draft.extra_guest_fee} onChange={(value) => field("extra_guest_fee", value)} /><NumberField label="Maximum guests" value={draft.max_guests} onChange={(value) => field("max_guests", value)} /><NumberField label="Bedrooms" value={draft.bedrooms} onChange={(value) => field("bedrooms", value)} /><NumberField label="Beds" value={draft.beds} onChange={(value) => field("beds", value)} /><NumberField label="Bathrooms" value={draft.bathrooms} onChange={(value) => field("bathrooms", value)} /><NumberField label="Minimum stay (nights)" value={draft.minimum_stay} onChange={(value) => field("minimum_stay", value)} /><CharacterField label="Check-in time" value={draft.check_in_time} onChange={(value) => field("check_in_time", value)} limit={30} /><CharacterField label="Checkout time" value={draft.checkout_time} onChange={(value) => field("checkout_time", value)} limit={30} /><CharacterField label="Pet policy" value={draft.pet_policy} onChange={(value) => field("pet_policy", value)} limit={CMS_LIMITS.house_rule} /><CharacterField label="Parking details" value={draft.parking_type} onChange={(value) => field("parking_type", value)} limit={CMS_LIMITS.nearby_location} /><RepeatableList label="Amenities" items={asList(draft.amenities)} onChange={(items) => field("amenities", items)} limit={CMS_LIMITS.amenity} help="Add one amenity per row." /><RepeatableList label="House rules" items={asList(draft.house_rules)} onChange={(items) => field("house_rules", items)} limit={CMS_LIMITS.house_rule} help="Keep each rule clear and guest-friendly." /><RepeatableList label="Nearby locations" items={asList(draft.nearby_locations)} onChange={(items) => field("nearby_locations", items)} limit={CMS_LIMITS.nearby_location} help="Add nearby places guests may find useful." /><BedEditor items={asBeds(draft.bed_arrangements)} onChange={(items) => field("bed_arrangements", items)} /><div className="md:col-span-2 grid gap-3 rounded-none bg-[#F7F4F1] p-4 sm:grid-cols-2"><Toggle label="Published on public website" checked={Boolean(draft.published)} onChange={(checked) => field("published", checked)} /><Toggle label="Featured house" checked={Boolean(draft.featured)} onChange={(checked) => field("featured", checked)} /></div><div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#EAE1DD] pt-5"><p className="text-sm text-stone-600">Use Preview below to check the current house summary.</p><button type="button" className="btn-outline-dark inline-flex items-center gap-2" onClick={() => setPreview((current) => !current)}><Eye size={16} /> {preview ? "Hide preview" : "Preview"}</button></div></section>{preview && <HousePreview draft={draft} />}</>;
}

function HouseEditor(props: any) {
  const [query, setQuery] = useState("");
  const creatingNew = Boolean(props.initialNewHouse);
  const matchingProperties = props.properties.filter((property: Row) => String(property.name ?? "").toLowerCase().includes(query.toLowerCase()) || String(property.location ?? "").toLowerCase().includes(query.toLowerCase()));
  const selectedProperty = props.properties.find((property: Row) => String(property.id) === String(props.selectedId));
  const handleSelect = (property: Row) => { props.openHouse(String(property.id)); };
  const handleNew = () => { props.openNewHouse(); };
  const handleBack = () => { if (window.confirm("Are you sure you want to leave this house? Any unsaved changes will be lost.")) props.onBackToHouses(); };
  const handleCancel = () => {
    if (!window.confirm("Are you sure you want to cancel? Any unsaved changes will be lost.")) return;
    if (creatingNew && !props.selectedId) return props.onBackToHouses();
    if (selectedProperty) props.editProperty(selectedProperty);
    else props.onBackToHouses();
  };
  const handleSave = () => {
    if (!window.confirm("Are you sure you want to save these house changes?")) return;
    void props.saveProperty(Boolean(props.draft.published));
  };
  const showEditor = Boolean(props.selectedId) || creatingNew;
  const bookingErrors = getBookingRuleErrors(props.draft, props.properties.length);
  const isDetailPage = Boolean(props.isDetailPage);

  return <div className="grid gap-6">
    {!isDetailPage && <><PageHeader eyebrow="Houses" title="Choose a house to manage" description="Start with a house card, then open its dedicated detail page to edit the listing." action={<button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={handleNew}><Plus size={16} /> New house</button>} />
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B6B55]">Your houses</p><h2 className="mt-1 text-xl font-extrabold text-[#2D2622]">Select a property</h2><p className="mt-1 text-sm text-stone-600">Choose a card to open its details.</p></div><div className="relative w-full max-w-xs"><Search className="admin-search-icon" size={18} aria-hidden="true" /><input className="field admin-search-input" placeholder="Search houses" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
      {matchingProperties.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{matchingProperties.map((property: Row) => <HouseSelectorCard key={String(property.id)} property={property} images={props.images} selected={String(props.selectedId) === String(property.id)} onSelect={() => handleSelect(property)} />)}</div> : <div className="rounded-2xl border border-dashed border-[#B99D88] bg-[#F7F4F1] p-8 text-center text-sm text-stone-600">No houses match your search.</div>}
    </section></>}
    {isDetailPage && showEditor ? <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D8CCC4] bg-[#F7F4F1] p-4 sm:p-5"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B6B55]">{creatingNew && !props.selectedId ? "New house" : "Selected house"}</p><h2 className="mt-1 truncate text-xl font-extrabold text-[#2D2622]">{creatingNew && !props.selectedId ? "Create a new furnished house" : selectedProperty?.name || "House details"}</h2><p className="mt-1 text-sm text-stone-600">{creatingNew && !props.selectedId ? "Add the core listing details, then save a draft or publish it." : "Update the sections below without losing your place."}</p></div><button type="button" className="btn-outline-dark inline-flex min-h-10 items-center gap-2" onClick={handleBack}><ChevronLeft size={16} /> Back to houses</button></div>
      {props.selectedId && <section className="card overflow-hidden bg-white"><div className="border-b border-[#EAE1DD] px-5 py-4 sm:px-7"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B6B55]">Media</p><h2 className="mt-1 text-xl font-extrabold">Property gallery</h2><p className="mt-1 text-sm text-stone-600">Upload, organise, and publish photos for the selected house.</p></div><div className="p-5 sm:p-7"><PropertyPhotoManager properties={props.properties} selectedId={props.selectedId} setSelectedId={props.setSelectedId} onSelectProperty={handleSelect} images={props.images} reload={props.reload} notify={props.notify} onError={props.onError} embedded showHeader={false} showPropertySelector={false} /></div></section>}
      <LegacyHouseEditor draft={props.draft} setDraft={props.setDraft} selectedId={props.selectedId} />
      <HouseDetailsEditor draft={props.draft} setDraft={props.setDraft} />
      <BookingRulesEditor draft={props.draft} setDraft={props.setDraft} propertyCount={props.properties.length} />
      <HouseEditorActionBar draft={props.draft} saving={props.saving} invalid={bookingErrors.length > 0} onSave={handleSave} onCancel={handleCancel} onDelete={props.selectedId ? () => void props.deleteProperty() : undefined} />
    </> : isDetailPage ? <div className="rounded-2xl border border-dashed border-[#B99D88] bg-white p-8 text-center"><Building2 className="mx-auto text-[#8B6B55]" size={28} aria-hidden="true" /><h3 className="mt-3 text-lg font-extrabold text-[#2D2622]">House not found</h3><p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-stone-600">Return to Houses and choose a published or draft house from the list.</p><button type="button" className="btn-outline-dark mt-4" onClick={props.onBackToHouses}>Back to houses</button></div> : null}
  </div>;
}

function HouseSelectorCard({ property, images, selected, onSelect }: { property: Row; images: Row[]; selected: boolean; onSelect: () => void }) {
  const propertyImages = images.filter((image) => String(image.property_id) === String(property.id));
  const coverImage = propertyImages.find((image) => image.is_cover === true && image.is_visible !== false) ?? propertyImages.find((image) => image.is_visible !== false && String(image.category ?? "") !== "unsorted") ?? propertyImages[0];
  const imageSource = coverImage ? propertyImageSource(coverImage) : "";
  const status = property.published ? "Published" : "Draft";
  return <button type="button" onClick={onSelect} aria-pressed={selected} className={`group overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B6B55] focus-visible:ring-offset-2 ${selected ? "border-[#5A463A] ring-2 ring-[#B99D88]" : "border-[#D8CCC4] hover:border-[#B99D88]"}`}>
    <div className="relative h-44 overflow-hidden bg-[#EAE1DD] sm:h-52">{imageSource ? <Image src={imageSource} alt={String(coverImage?.alt_text || `${property.name} cover photo`)} fill loading="eager" sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" unoptimized={Boolean(coverImage?.external_url)} /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-[#8B6B55]"><Building2 size={28} aria-hidden="true" /><span className="text-xs font-bold uppercase tracking-[0.12em]">No cover photo</span></div>}<div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/45 to-transparent p-3"><span className="rounded-full bg-white/90 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#5A463A]">{status}</span>{selected && <span className="rounded-full bg-[#5A463A] px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-white">Selected</span>}</div></div>
    <div className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xl font-extrabold text-[#2D2622]">{property.name || "Unnamed house"}</h3><p className="mt-1 truncate text-sm text-stone-600">{property.location || "Pakenham, Victoria"}</p></div><ChevronRight className="mt-1 shrink-0 text-[#8B6B55] transition-transform group-hover:translate-x-1" size={18} aria-hidden="true" /></div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#EAE1DD] pt-3 text-xs font-semibold text-stone-600"><span>{Number(property.bedrooms ?? 0)} bedrooms</span><span>{Number(property.max_guests ?? 0)} guests</span><span>{Number(propertyImages.length)} photos</span></div><p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[#7A4E2D]">Open house details</p></div>
  </button>;
}

function getBookingRuleErrors(draft: Row, propertyCount: number) {
  const minimumStay = Number(draft.minimum_stay || 1);
  const maximumStay = Number(draft.maximum_stay || 0);
  const minimumGuests = Number(draft.minimum_guests || 1);
  const maximumGuests = Number(draft.maximum_guests || 0);
  const minimumCorporateStay = Number(draft.minimum_corporate_stay || 0);
  const minimumCorporateHouses = Number(draft.minimum_corporate_houses || 0);
  const maximumCorporateHouses = Number(draft.maximum_corporate_houses || 0);
  return [
    maximumStay < minimumStay ? "Maximum stay must be at least the minimum stay." : "",
    minimumGuests > maximumGuests ? "Minimum guests cannot exceed maximum guests." : "",
    minimumCorporateStay < minimumStay ? "Minimum corporate stay cannot be shorter than the minimum stay." : "",
    minimumCorporateHouses > maximumCorporateHouses ? "Minimum corporate houses cannot exceed the maximum." : "",
    minimumCorporateHouses > propertyCount ? "Minimum corporate houses cannot exceed the available house count." : "",
  ].filter(Boolean);
}

function HouseEditorActionBar({ draft, saving, invalid, onSave, onCancel, onDelete }: { draft: Row; saving: boolean; invalid: boolean; onSave: () => void; onCancel: () => void; onDelete?: () => void }) {
  return <div className="sticky bottom-4 z-30 rounded-2xl border border-[#B99D88] bg-white/95 p-3 shadow-[0_12px_35px_rgba(45,38,34,0.18)] backdrop-blur sm:p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-extrabold text-[#2D2622]">House changes</p><StatusBadge label={draft.published ? "Will be published" : "Will stay as draft"} tone={draft.published ? "success" : "neutral"} /></div><p className="mt-1 text-xs text-stone-600">Save all listing, guest, booking, and pricing changes together.</p>{invalid && <p className="mt-1 text-xs font-semibold text-[#8A3325]">Fix the booking rule messages above before saving.</p>}</div><div className="flex flex-wrap gap-2 sm:justify-end"><button type="button" className="btn-outline-dark min-h-11" onClick={onCancel} disabled={saving}>Cancel changes</button>{onDelete && <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-none border border-[#E7BDB4] px-4 py-2 text-sm font-bold text-[#8A3325] hover:bg-[#FFF6F3]" onClick={onDelete} disabled={saving}><Trash2 size={16} /> Delete house</button>}<button type="button" className="btn-primary inline-flex min-h-11 items-center gap-2" onClick={onSave} disabled={saving || invalid}><Save size={16} /> {saving ? "Saving…" : "Save changes"}</button></div></div>
  </div>;
}

function HouseDetailsEditor({ draft, setDraft }: { draft: Row; setDraft: (value: (current: Row) => Row) => void }) {
  const field = (key: string, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  return <section className="card grid gap-5 bg-white p-5 sm:p-7">
    <div className="border-b border-[#EAE1DD] pb-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B6B55]">Guest-facing details</p><h2 className="mt-2 text-2xl font-extrabold">Make each house easy to understand</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">These fields are optional. They let you update practical stay information without editing JSON or touching the image manager.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
      <CharacterField label="Listing title" value={draft.listing_title} onChange={(value) => field("listing_title", value)} limit={CMS_LIMITS.section_heading} />
      <CharacterField label="Kitchen facilities" value={draft.kitchen_facilities} onChange={(value) => field("kitchen_facilities", value)} limit={CMS_LIMITS.section_description} textarea />
      <CharacterField label="Laundry facilities" value={draft.laundry_facilities} onChange={(value) => field("laundry_facilities", value)} limit={CMS_LIMITS.section_description} textarea />
      <CharacterField label="Wi-Fi and connectivity" value={draft.wifi_information} onChange={(value) => field("wifi_information", value)} limit={CMS_LIMITS.section_description} textarea />
      <CharacterField label="Workspace" value={draft.workspace_information} onChange={(value) => field("workspace_information", value)} limit={CMS_LIMITS.section_description} textarea />
      <CharacterField label="Heating and cooling" value={draft.heating_cooling} onChange={(value) => field("heating_cooling", value)} limit={CMS_LIMITS.section_description} textarea />
      <CharacterField label="Self check-in details" value={draft.self_check_in_details} onChange={(value) => field("self_check_in_details", value)} limit={CMS_LIMITS.section_description} textarea />
      <CharacterField label="Safety information" value={draft.safety_information} onChange={(value) => field("safety_information", value)} limit={CMS_LIMITS.section_description} textarea />
      <CharacterField label="Cancellation policy" value={draft.cancellation_policy} onChange={(value) => field("cancellation_policy", value)} limit={CMS_LIMITS.section_description} textarea />
          <CharacterField label="Corporate information" value={draft.corporate_information} onChange={(value) => field("corporate_information", value)} limit={CMS_LIMITS.section_description} textarea />
        </div>
        <p className="border-t border-[#EAE1DD] pt-5 text-sm text-stone-600">These details will be saved with the rest of the house from the action bar below.</p>
      </section>;
}

function BookingRulesEditor({ draft, setDraft, propertyCount }: { draft: Row; setDraft: (value: (current: Row) => Row) => void; propertyCount: number }) {
  const field = (key: string, value: unknown) => setDraft((current) => ({ ...current, [key]: value }));
  const errors = getBookingRuleErrors(draft, propertyCount);
  return <section className="card grid gap-6 bg-white p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EAE1DD] pb-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B6B55]">Availability and booking rules</p><h2 className="mt-2 text-2xl font-extrabold">Control how guests can book this house</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">These rules are used by the public calendar and checked again on the server. Save them together with the rest of this house from the action bar below.</p></div><CalendarDays className="text-[#B99D88]" size={24} aria-hidden="true" /></div>{errors.length > 0 && <div className="admin-notice is-error" role="alert">{errors.join(" ")}</div>}<div className="grid gap-5 md:grid-cols-2"><div className="rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-4"><h3 className="text-base font-extrabold">Stay length</h3><p className="mt-1 text-sm text-stone-600">Separate the ordinary minimum stay from the maximum allowed stay.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><NumberField label="Minimum stay (nights)" value={draft.minimum_stay} onChange={(value) => field("minimum_stay", value)} /><NumberField label="Maximum stay (nights)" value={draft.maximum_stay} onChange={(value) => field("maximum_stay", value)} /></div></div><div className="rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-4"><h3 className="text-base font-extrabold">Guest limits</h3><p className="mt-1 text-sm text-stone-600">Set clear limits for each guest category instead of relying only on total capacity.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><NumberField label="Minimum guests" value={draft.minimum_guests} onChange={(value) => field("minimum_guests", value)} /><NumberField label="Maximum adults" value={draft.maximum_adults} onChange={(value) => field("maximum_adults", value)} /><NumberField label="Maximum children" value={draft.maximum_children} onChange={(value) => field("maximum_children", value)} /><NumberField label="Maximum infants" value={draft.maximum_infants} onChange={(value) => field("maximum_infants", value)} /><NumberField label="Maximum pets" value={draft.maximum_pets} onChange={(value) => field("maximum_pets", value)} /></div></div><div className="rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-4"><h3 className="text-base font-extrabold">Booking window</h3><p className="mt-1 text-sm text-stone-600">Use Australian local calendar dates for advance notice and planning.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><NumberField label="Minimum advance notice (days)" value={draft.minimum_advance_notice_days} onChange={(value) => field("minimum_advance_notice_days", value)} /><NumberField label="Maximum advance booking (days)" value={draft.maximum_advance_booking_days} onChange={(value) => field("maximum_advance_booking_days", value)} /></div></div><div className="rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-4"><h3 className="text-base font-extrabold">Corporate stays</h3><p className="mt-1 text-sm text-stone-600">“Minimum corporate houses” is separate from “Minimum stay (nights)”.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><NumberField label="Minimum corporate stay (nights)" value={draft.minimum_corporate_stay} onChange={(value) => field("minimum_corporate_stay", value)} /><NumberField label="Minimum corporate houses" value={draft.minimum_corporate_houses} onChange={(value) => field("minimum_corporate_houses", value)} /><NumberField label="Maximum corporate houses" value={draft.maximum_corporate_houses} onChange={(value) => field("maximum_corporate_houses", value)} /><NumberField label="Corporate discount (%)" value={draft.corporate_discount} onChange={(value) => field("corporate_discount", value)} /></div><p className="mt-3 text-xs text-stone-600">There are currently {propertyCount} houses in the workspace.</p></div></div><div className="grid gap-3 rounded-none border border-[#D8CCC4] p-4 sm:grid-cols-2 lg:grid-cols-3"><Toggle label="Allow same-day booking" checked={draft.same_day_booking_allowed !== false} onChange={(checked) => field("same_day_booking_allowed", checked)} /><Toggle label="Allow weekend bookings" checked={draft.weekend_booking_allowed !== false} onChange={(checked) => field("weekend_booking_allowed", checked)} /><Toggle label="Instant booking" checked={draft.instant_booking_enabled !== false} onChange={(checked) => field("instant_booking_enabled", checked)} /><Toggle label="Booking request required" checked={Boolean(draft.booking_request_required)} onChange={(checked) => field("booking_request_required", checked)} /><Toggle label="Allow pets" checked={draft.pets_allowed !== false} onChange={(checked) => field("pets_allowed", checked)} /><Toggle label="Allow corporate bookings" checked={draft.corporate_booking_allowed !== false} onChange={(checked) => field("corporate_booking_allowed", checked)} /><Toggle label="Adjacent houses allowed" checked={draft.adjacent_houses_allowed !== false} onChange={(checked) => field("adjacent_houses_allowed", checked)} /><Toggle label="Allow long-term stays" checked={draft.long_term_stays_allowed !== false} onChange={(checked) => field("long_term_stays_allowed", checked)} /><Toggle label="Corporate approval required" checked={Boolean(draft.corporate_approval_required)} onChange={(checked) => field("corporate_approval_required", checked)} /><Toggle label="Corporate deposit required" checked={Boolean(draft.corporate_deposit_required)} onChange={(checked) => field("corporate_deposit_required", checked)} /><Toggle label="Corporate online payment" checked={draft.corporate_online_payment !== false} onChange={(checked) => field("corporate_online_payment", checked)} /><Toggle label="GST invoice available" checked={draft.gst_invoice_available !== false} onChange={(checked) => field("gst_invoice_available", checked)} /></div><CharacterField label="Corporate booking instructions" value={draft.corporate_instructions} onChange={(value) => field("corporate_instructions", value)} limit={CMS_LIMITS.corporate_instructions} textarea /><DatePricingEditor datePrices={asDatePrices(draft.date_prices)} onChange={(prices) => field("date_prices", prices)} /><p className="border-t border-[#EAE1DD] pt-5 text-sm text-stone-600">These booking rules will be saved with the rest of the house from the action bar below.</p></section>;
}

function DatePricingEditor({ datePrices, onChange }: { datePrices: Row[]; onChange: (prices: Row[]) => void }) {
  const [date, setDate] = useState("");
  const [nightlyPrice, setNightlyPrice] = useState(0);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const addDatePrice = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError("Choose a valid date for the special rate."); return; }
    if (nightlyPrice <= 0) { setError("The dated nightly price must be greater than $0."); return; }
    const existing = datePrices.find((item) => item.price_date === date);
    const nextPrice = { ...existing, price_date: date, nightly_price: nightlyPrice, label: label.trim(), is_active: true };
    onChange([...datePrices.filter((item) => item.price_date !== date), nextPrice].sort((a, b) => a.price_date.localeCompare(b.price_date)));
    setDate(""); setNightlyPrice(0); setLabel(""); setError("");
  };
  const updatePrice = (priceDate: string, patch: Row) => onChange(datePrices.map((item) => item.price_date === priceDate ? { ...item, ...patch } : item));
  const formatPriceDate = (value: string) => {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  };
  return <div className="grid gap-4 rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-4">
    <div><h3 className="text-base font-extrabold">Dated nightly prices</h3><p className="mt-1 text-sm text-stone-600">Add or update a special AUD rate for one Melbourne calendar date. Inactive rates remain saved but are ignored by availability and checkout.</p></div>
    <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end">
      <label className="block text-sm font-bold">Date<input className="field mt-1" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <NumberField label="Nightly price (AUD)" value={nightlyPrice} onChange={setNightlyPrice} />
      <label className="block text-sm font-bold">Label (optional)<input className="field mt-1" maxLength={120} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Christmas rate" /></label>
      <button type="button" className="btn-primary min-h-11 justify-center" onClick={addDatePrice}><Plus size={16} /> Add or update</button>
    </div>
    {error && <p className="text-sm font-semibold text-[#8A3325]" role="alert">{error}</p>}
    {datePrices.length ? <div className="grid gap-2">{datePrices.map((price) => <div key={price.price_date} className="grid gap-3 rounded-none border border-[#D8CCC4] bg-white p-3 text-sm md:grid-cols-[auto_160px_1fr_auto] md:items-end">
      <div><p className="font-bold">{formatPriceDate(price.price_date)}</p><p className="text-xs text-stone-500">Australia/Melbourne</p></div>
      <NumberField label="AUD per night" value={Number(price.nightly_price)} onChange={(value) => updatePrice(price.price_date, { nightly_price: Math.max(0, value) })} />
      <label className="block text-sm font-bold">Label<input className="field mt-1" maxLength={120} value={String(price.label ?? "")} onChange={(event) => updatePrice(price.price_date, { label: event.target.value })} /></label>
      <label className="flex min-h-11 items-center gap-2 border border-[#D8CCC4] px-3 text-xs font-bold uppercase tracking-[0.08em]"><input type="checkbox" checked={price.is_active !== false} onChange={(event) => updatePrice(price.price_date, { is_active: event.target.checked })} /> {price.is_active !== false ? "Active" : "Inactive"}</label>
    </div>)}</div> : <p className="text-sm text-stone-500">No dated prices yet. The standard nightly rate is currently used for every date.</p>}
  </div>;
}

// Kept as a compatibility reference for any existing imports while the section editor is adopted.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function HomepageEditor({ homepage, setHomepage, published, save, saving }: { homepage: HomepageDraft; setHomepage: (value: HomepageDraft) => void; published: boolean; save: (published: boolean) => Promise<void>; saving: boolean }) {
  const [preview, setPreview] = useState(false);
  const update = (key: keyof HomepageDraft, value: unknown) => setHomepage({ ...homepage, [key]: value });
  const updateBenefit = (index: number, key: keyof Benefit, value: string) => setHomepage({ ...homepage, benefits: homepage.benefits.map((benefit, itemIndex) => itemIndex === index ? { ...benefit, [key]: value } : benefit) });
  return <><PageHeader eyebrow="Homepage CMS" title="Shape the first impression" description="Edit the homepage in plain language, preview it, then save a draft or publish it for guests." action={<StatusBadge label={published ? "Published" : "Draft"} tone={published ? "success" : "neutral"} />} /><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><form onSubmit={(event) => { event.preventDefault(); void save(false); }} className="card grid gap-5 bg-white p-5 sm:p-7"><FormGroup title="Hero section" description="Keep the main message short enough to wrap comfortably on mobile."><CharacterField label="Hero heading" value={homepage.hero_heading} onChange={(value) => update("hero_heading", value)} limit={CMS_LIMITS.hero_heading} /></FormGroup><FormGroup title="Featured section" description="Describe the main stay offer without editing JSON."><CharacterField label="Section heading" value={homepage.section_heading} onChange={(value) => update("section_heading", value)} limit={CMS_LIMITS.section_heading} /><CharacterField label="Section description" value={homepage.section_description} onChange={(value) => update("section_description", value)} limit={CMS_LIMITS.section_description} textarea /></FormGroup><FormGroup title="Discount content" description="Make weekly and monthly savings clear and trustworthy."><CharacterField label="Discount heading" value={homepage.discount_heading} onChange={(value) => update("discount_heading", value)} limit={CMS_LIMITS.discount_heading} /><CharacterField label="Discount description" value={homepage.discount_description} onChange={(value) => update("discount_description", value)} limit={CMS_LIMITS.discount_description} textarea /></FormGroup><FormGroup title="Corporate stays" description="Use a practical explanation for business travellers and project teams."><CharacterField label="Corporate heading" value={homepage.corporate_heading} onChange={(value) => update("corporate_heading", value)} limit={CMS_LIMITS.section_heading} /><CharacterField label="Corporate description" value={homepage.corporate_description} onChange={(value) => update("corporate_description", value)} limit={CMS_LIMITS.section_description} textarea /></FormGroup><FormGroup title="Benefits" description="Add, remove, or reorder the highlights shown to guests."><div className="grid gap-3">{homepage.benefits.map((benefit, index) => <div key={`benefit-${index}`} className="rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold">Benefit {index + 1}</p><div className="flex gap-1"><IconButton label="Move up" disabled={!index} onClick={() => setHomepage({ ...homepage, benefits: moveItem(homepage.benefits, index, -1) })} icon={<ChevronUp size={16} />} /><IconButton label="Move down" disabled={index === homepage.benefits.length - 1} onClick={() => setHomepage({ ...homepage, benefits: moveItem(homepage.benefits, index, 1) })} icon={<ChevronDown size={16} />} /><IconButton label="Remove benefit" onClick={() => setHomepage({ ...homepage, benefits: homepage.benefits.filter((_, itemIndex) => itemIndex !== index) })} icon={<Trash2 size={16} />} /></div></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><CharacterField label="Benefit title" value={benefit.title} onChange={(value) => updateBenefit(index, "title", value)} limit={CMS_LIMITS.benefit_title} /><CharacterField label="Benefit description" value={benefit.description} onChange={(value) => updateBenefit(index, "description", value)} limit={CMS_LIMITS.benefit_description} textarea /></div></div>)}<button type="button" className="btn-secondary inline-flex w-fit items-center gap-2" onClick={() => setHomepage({ ...homepage, benefits: [...homepage.benefits, { title: "", description: "" }] })}><Plus size={16} /> Add benefit</button></div></FormGroup><div className="flex flex-wrap gap-3 border-t border-[#EAE1DD] pt-5"><button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => void save(false)} disabled={saving}><Save size={16} /> Save draft</button><button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => void save(true)} disabled={saving}><Globe2 size={16} /> {saving ? "Saving…" : "Publish homepage"}</button><button type="button" className="btn-outline-dark inline-flex items-center gap-2" onClick={() => setPreview((current) => !current)}><Eye size={16} /> {preview ? "Hide preview" : "Preview"}</button></div></form>{preview && <HomepagePreview homepage={homepage} />}</div></>;
}

function HomepageSectionsEditor({ homepage, setHomepage, published, saveSection, saving, properties, toggleFeatured, onError }: { homepage: HomepageDraft; setHomepage: (value: HomepageDraft) => void; published: boolean; saveSection: (section: HomepageSectionKey, published: boolean) => Promise<void>; saving: boolean; properties: Row[]; toggleFeatured: (property: Row) => Promise<void>; onError: (message: string) => void }) {
  const [activeSection, setActiveSection] = useState<HomepageSectionKey>("hero");
  const [dirtySections, setDirtySections] = useState<Record<HomepageSectionKey, boolean>>({ hero: false, intro: false, search: false, featured: false, benefits: false, corporate: false, location: false, faqs: false, cta: false });
  const update = (key: keyof HomepageDraft, value: unknown, section: HomepageSectionKey) => {
    setHomepage({ ...homepage, [key]: value });
    setDirtySections((current) => ({ ...current, [section]: true }));
  };
  const updateBenefit = (index: number, key: keyof Benefit, value: string) => {
    setHomepage({ ...homepage, benefits: homepage.benefits.map((benefit, itemIndex) => itemIndex === index ? { ...benefit, [key]: value } : benefit) });
    setDirtySections((current) => ({ ...current, benefits: true }));
  };
  const updateFaq = (index: number, key: keyof HomepageFaq, value: string) => {
    setHomepage({ ...homepage, faqs: homepage.faqs.map((faq, itemIndex) => itemIndex === index ? { ...faq, [key]: value } : faq) });
    setDirtySections((current) => ({ ...current, faqs: true }));
  };
  const saveCurrent = async (shouldPublish: boolean) => {
    try {
      await saveSection(activeSection, shouldPublish);
      setDirtySections((current) => ({ ...current, [activeSection]: false }));
    } catch {
      // The parent displays the server error notification.
    }
  };
  const sectionMeta: Array<{ id: HomepageSectionKey; label: string; description: string }> = [
    { id: "hero", label: "Hero", description: "The first message and calls to action." },
    { id: "intro", label: "Intro", description: "The editorial welcome section beneath the hero." },
    { id: "search", label: "Search", description: "The date and guest search control." },
    { id: "featured", label: "Featured houses", description: "The featured property section and selection." },
    { id: "benefits", label: "Benefits", description: "Amenities and trust points shown to guests." },
    { id: "corporate", label: "Corporate stays", description: "The business accommodation call to action." },
    { id: "location", label: "Location", description: "The Pakenham area map section." },
    { id: "faqs", label: "FAQs", description: "Answers that help guests book with confidence." },
    { id: "cta", label: "Final CTA", description: "The final booking prompt at the foot of the homepage." },
  ];
  const activeMeta = sectionMeta.find((item) => item.id === activeSection) ?? sectionMeta[0];

  useEffect(() => {
    if (!Object.values(dirtySections).some(Boolean)) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirtySections]);

  return <>
    <PageHeader eyebrow="Homepage CMS" title="Edit the homepage section by section" description="Choose one area, update the plain-language fields, then save only that section." action={<StatusBadge label={published ? "Published" : "Draft"} tone={published ? "success" : "neutral"} />} />
    <div className="homepage-cms-grid">
      <div className="min-w-0">
        <nav className="homepage-cms-tabs" aria-label="Homepage sections">
          {sectionMeta.map((section) => <button key={section.id} type="button" className={`homepage-cms-tab ${activeSection === section.id ? "is-active" : ""}`} onClick={() => setActiveSection(section.id)}><span>{section.label}</span>{dirtySections[section.id] && <span className="homepage-cms-unsaved">Unsaved</span>}</button>)}
        </nav>
        <section className="card homepage-cms-panel bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EAE1DD] pb-5">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B6B55]">Homepage section</p><h2 className="mt-2 text-2xl font-extrabold">{activeMeta.label}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">{activeMeta.description}</p></div>
            {dirtySections[activeSection] ? <StatusBadge label="Unsaved changes" tone="danger" /> : <StatusBadge label={activeSection === "search" ? "Functional section" : "Saved"} tone="neutral" />}
          </div>
          {activeSection === "hero" && <div className="mt-6 grid gap-5"><FormGroup title="Hero message" description="Keep the homepage hero focused on the Serenity wordmark and location message."><CharacterField label="Hero headline" value={homepage.hero_heading} onChange={(value) => update("hero_heading", value, "hero")} limit={CMS_LIMITS.hero_heading} /><CharacterField label="Legacy image caption" value={homepage.hero_image_caption} onChange={(value) => update("hero_image_caption", value, "hero")} limit={CMS_LIMITS.hero_image_caption} help="Kept for existing homepage content; dedicated media captions are edited below." /></FormGroup><HomepageHeroMediaEditor onChange={() => setDirtySections((current) => ({ ...current, hero: true }))} /></div>}
           {activeSection === "intro" && <div className="mt-6 grid gap-5"><FormGroup title="Editorial intro copy" description="Edit the text shown in the welcome section below the hero."><CharacterField label="Eyebrow" value={homepage.intro_eyebrow} onChange={(value) => update("intro_eyebrow", value, "intro")} limit={CMS_LIMITS.intro_eyebrow} /><CharacterField label="Heading" value={homepage.intro_heading} onChange={(value) => update("intro_heading", value, "intro")} limit={CMS_LIMITS.intro_heading} /><CharacterField label="Lead paragraph" value={homepage.intro_lead} onChange={(value) => update("intro_lead", value, "intro")} limit={CMS_LIMITS.intro_lead} textarea /><CharacterField label="Supporting paragraph" value={homepage.intro_body} onChange={(value) => update("intro_body", value, "intro")} limit={CMS_LIMITS.intro_body} textarea /><div className="grid gap-4 sm:grid-cols-2"><CharacterField label="Button label" value={homepage.intro_cta_label} onChange={(value) => update("intro_cta_label", value, "intro")} limit={CMS_LIMITS.intro_cta_label} /><CharacterField label="Button link" value={homepage.intro_cta_href} onChange={(value) => update("intro_cta_href", value, "intro")} limit={CMS_LIMITS.intro_cta_href} help="Use an internal path such as /about or a full https:// URL." /></div></FormGroup><FormGroup title="Artwork labels" description="Change the small labels inside the editorial artwork on the left."><CharacterField label="Artwork label" value={homepage.intro_art_label} onChange={(value) => update("intro_art_label", value, "intro")} limit={CMS_LIMITS.intro_art_label} /><CharacterField label="Artwork heading" value={homepage.intro_art_heading} onChange={(value) => update("intro_art_heading", value, "intro")} limit={CMS_LIMITS.intro_art_heading} /><CharacterField label="Artwork card text" value={homepage.intro_art_card} onChange={(value) => update("intro_art_card", value, "intro")} limit={CMS_LIMITS.intro_art_card} /></FormGroup><HomepageIntroImageEditor firstImage={homepage.intro_image_1} firstPath={homepage.intro_image_1_path} secondImage={homepage.intro_image_2} secondPath={homepage.intro_image_2_path} onChange={(field, value, path) => { setHomepage({ ...homepage, [field]: value, [`${field}_path`]: path }); setDirtySections((current) => ({ ...current, intro: true })); }} onError={onError} /></div>}
           {activeSection === "search" && <div className="mt-6 rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-5"><Search size={22} className="text-[#B99D88]" /><h3 className="mt-3 text-lg font-extrabold">Guest search and booking dates</h3><p className="mt-2 text-sm leading-relaxed text-stone-600">This is the live booking search control. It uses Australia/Melbourne dates and does not currently have editable marketing copy. Booking behaviour remains unchanged.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-none bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-stone-500">Check-in</p><p className="mt-1 font-bold">Arrival date</p></div><div className="rounded-none bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-stone-500">Checkout</p><p className="mt-1 font-bold">Departure date</p></div><div className="rounded-none bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-stone-500">Guests</p><p className="mt-1 font-bold">Guest count</p></div></div></div>}
          {activeSection === "featured" && <div className="mt-6 grid gap-5"><FormGroup title="Featured houses heading" description="This heading introduces the homes guests can browse first."><CharacterField label="Section heading" value={homepage.featured_heading} onChange={(value) => update("featured_heading", value, "featured")} limit={CMS_LIMITS.section_heading} /><CharacterField label="Section description" value={homepage.featured_description} onChange={(value) => update("featured_description", value, "featured")} limit={CMS_LIMITS.section_description} textarea /></FormGroup><div className="rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-extrabold">Choose featured houses</h3><p className="mt-1 text-sm text-stone-600">Changes apply to the public property grid immediately after the house is saved.</p></div><Building2 className="text-[#B99D88]" size={22} /></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{properties.map((property) => <button key={property.id} type="button" aria-pressed={Boolean(property.featured)} disabled={saving} onClick={() => void toggleFeatured(property)} className={`rounded-none border p-4 text-left transition-colors ${property.featured ? "border-[#5A463A] bg-[#5A463A] text-white" : "border-[#D8CCC4] bg-white text-stone-800 hover:bg-[#EAE1DD]"}`}><span className="block text-sm font-extrabold">{property.name}</span><span className="mt-1 block text-xs opacity-80">{property.featured ? "Featured on homepage" : "Not featured"}</span></button>)}</div></div></div>}
          {activeSection === "benefits" && <div className="mt-6 grid gap-5"><FormGroup title="Benefits introduction" description="Explain the practical comforts included with a whole-house stay."><CharacterField label="Section heading" value={homepage.benefits_heading} onChange={(value) => update("benefits_heading", value, "benefits")} limit={CMS_LIMITS.section_heading} /><CharacterField label="Section description" value={homepage.benefits_description} onChange={(value) => update("benefits_description", value, "benefits")} limit={CMS_LIMITS.section_description} textarea /></FormGroup><div className="rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-extrabold">Amenity and trust cards</h3><p className="mt-1 text-sm text-stone-600">Add, remove, and reorder the cards used in the benefits row.</p></div><button type="button" className="btn-secondary inline-flex min-h-10 items-center gap-2 px-3 text-sm" onClick={() => { setHomepage({ ...homepage, benefits: [...homepage.benefits, { title: "", description: "" }] }); setDirtySections((current) => ({ ...current, benefits: true })); }}><Plus size={15} /> Add benefit</button></div><div className="mt-4 grid gap-3">{homepage.benefits.map((benefit, index) => <div key={`benefit-${index}`} className="rounded-none border border-[#D8CCC4] bg-white p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold">Benefit {index + 1}</p><div className="flex gap-1"><IconButton label="Move up" disabled={!index} onClick={() => { setHomepage({ ...homepage, benefits: moveItem(homepage.benefits, index, -1) }); setDirtySections((current) => ({ ...current, benefits: true })); }} icon={<ChevronUp size={15} />} /><IconButton label="Move down" disabled={index === homepage.benefits.length - 1} onClick={() => { setHomepage({ ...homepage, benefits: moveItem(homepage.benefits, index, 1) }); setDirtySections((current) => ({ ...current, benefits: true })); }} icon={<ChevronDown size={15} />} /><IconButton label="Remove benefit" onClick={() => { setHomepage({ ...homepage, benefits: homepage.benefits.filter((_, itemIndex) => itemIndex !== index) }); setDirtySections((current) => ({ ...current, benefits: true })); }} icon={<Trash2 size={15} />} /></div></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><CharacterField label="Benefit title" value={benefit.title} onChange={(value) => updateBenefit(index, "title", value)} limit={CMS_LIMITS.benefit_title} /><CharacterField label="Benefit description" value={benefit.description} onChange={(value) => updateBenefit(index, "description", value)} limit={CMS_LIMITS.benefit_description} textarea /></div></div>)}</div>{!homepage.benefits.length && <EmptyState icon={Star} title="No benefit cards yet" description="Add the first trust point for guests." compact />}</div></div>}
          {activeSection === "corporate" && <div className="mt-6 grid gap-5"><FormGroup title="Corporate stays call to action" description="Explain how furnished houses support business travellers, contractors, and project teams."><CharacterField label="Section heading" value={homepage.corporate_heading} onChange={(value) => update("corporate_heading", value, "corporate")} limit={CMS_LIMITS.section_heading} /><CharacterField label="Section description" value={homepage.corporate_description} onChange={(value) => update("corporate_description", value, "corporate")} limit={CMS_LIMITS.section_description} textarea /><div className="grid gap-4 sm:grid-cols-2"><CharacterField label="Button label" value={homepage.corporate_cta_label} onChange={(value) => update("corporate_cta_label", value, "corporate")} limit={CMS_LIMITS.button_label} /><CharacterField label="Button link" value={homepage.corporate_cta_href} onChange={(value) => update("corporate_cta_href", value, "corporate")} limit={120} /></div></FormGroup></div>}
          {activeSection === "location" && <div className="mt-6 grid gap-5"><FormGroup title="Location section" description="Introduce the Pakenham area map shown near the bottom of the homepage."><CharacterField label="Section heading" value={homepage.location_heading} onChange={(value) => update("location_heading", value, "location")} limit={CMS_LIMITS.section_heading} /><CharacterField label="Section description" value={homepage.location_description} onChange={(value) => update("location_description", value, "location")} limit={CMS_LIMITS.section_description} textarea /></FormGroup></div>}
          {activeSection === "faqs" && <div className="mt-6 grid gap-5"><FormGroup title="Frequently asked questions" description="Answer the questions guests commonly have before they choose dates and book."><CharacterField label="FAQ section heading" value={homepage.faq_heading} onChange={(value) => update("faq_heading", value, "faqs")} limit={CMS_LIMITS.section_heading} /><CharacterField label="FAQ supporting text" value={homepage.faq_description} onChange={(value) => update("faq_description", value, "faqs")} limit={CMS_LIMITS.section_description} textarea /></FormGroup><div className="rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-extrabold">Guest questions</h3><p className="mt-1 text-sm text-stone-600">Keep answers plain, useful, and specific to the Serenity houses.</p></div><button type="button" className="btn-secondary inline-flex min-h-10 items-center gap-2 px-3 text-sm" onClick={() => { setHomepage({ ...homepage, faqs: [...homepage.faqs, { question: "", answer: "" }] }); setDirtySections((current) => ({ ...current, faqs: true })); }}><Plus size={15} /> Add question</button></div><div className="mt-4 grid gap-3">{homepage.faqs.map((faq, index) => <div key={`faq-${index}`} className="rounded-none border border-[#D8CCC4] bg-white p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold">Question {index + 1}</p><div className="flex gap-1"><IconButton label="Move up" disabled={!index} onClick={() => { setHomepage({ ...homepage, faqs: moveItem(homepage.faqs, index, -1) }); setDirtySections((current) => ({ ...current, faqs: true })); }} icon={<ChevronUp size={15} />} /><IconButton label="Move down" disabled={index === homepage.faqs.length - 1} onClick={() => { setHomepage({ ...homepage, faqs: moveItem(homepage.faqs, index, 1) }); setDirtySections((current) => ({ ...current, faqs: true })); }} icon={<ChevronDown size={15} />} /><IconButton label="Remove question" onClick={() => { setHomepage({ ...homepage, faqs: homepage.faqs.filter((_, itemIndex) => itemIndex !== index) }); setDirtySections((current) => ({ ...current, faqs: true })); }} icon={<Trash2 size={15} />} /></div></div><div className="mt-3 grid gap-3"><CharacterField label="Question" value={faq.question} onChange={(value) => updateFaq(index, "question", value)} limit={140} /><CharacterField label="Answer" value={faq.answer} onChange={(value) => updateFaq(index, "answer", value)} limit={700} textarea /></div></div>)}</div>{!homepage.faqs.length && <EmptyState icon={MessageSquare} title="No FAQs yet" description="Add the first answer guests should see before booking." compact />}</div></div>}
          {activeSection === "cta" && <div className="mt-6 grid gap-5"><FormGroup title="Final booking prompt" description="Give guests a clear next step after they have read about the houses, location, and policies."><CharacterField label="CTA heading" value={homepage.final_cta_heading} onChange={(value) => update("final_cta_heading", value, "cta")} limit={CMS_LIMITS.section_heading} /><CharacterField label="CTA supporting text" value={homepage.final_cta_description} onChange={(value) => update("final_cta_description", value, "cta")} limit={CMS_LIMITS.section_description} textarea /><div className="grid gap-4 sm:grid-cols-2"><CharacterField label="Primary button label" value={homepage.final_cta_primary_label} onChange={(value) => update("final_cta_primary_label", value, "cta")} limit={CMS_LIMITS.button_label} /><CharacterField label="Button link" value={homepage.final_cta_primary_href} onChange={(value) => update("final_cta_primary_href", value, "cta")} limit={120} /><CharacterField label="Secondary button label" value={homepage.final_cta_secondary_label} onChange={(value) => update("final_cta_secondary_label", value, "cta")} limit={CMS_LIMITS.button_label} /><CharacterField label="Button link" value={homepage.final_cta_secondary_href} onChange={(value) => update("final_cta_secondary_href", value, "cta")} limit={120} /></div></FormGroup></div>}
          <div className="homepage-cms-savebar"><div><p className="text-sm font-bold">{dirtySections[activeSection] ? "Unsaved changes" : activeSection === "search" ? "No copy to save" : "Section saved"}</p><p className="text-xs text-stone-600">{activeSection === "search" ? "Search behaviour is controlled by the booking flow." : "Save a draft first, or publish this homepage content when it is ready."}</p></div><div className="flex flex-wrap gap-2">{activeSection !== "search" && <><button type="button" className="btn-secondary inline-flex min-h-10 items-center gap-2 px-3 text-sm" disabled={saving || !dirtySections[activeSection]} onClick={() => void saveCurrent(false)}><Save size={15} /> Save draft</button><button type="button" className="btn-primary inline-flex min-h-10 items-center gap-2 px-3 text-sm" disabled={saving || !dirtySections[activeSection]} onClick={() => void saveCurrent(true)}><Globe2 size={15} /> {saving ? "Saving…" : "Save and publish"}</button></>}</div></div>
        </section>
      </div>
    </div>
  </>;
}

/*
function HeroGalleryEditor({ homepage, setHomepage, images, properties, markDirty }: { homepage: HomepageDraft; setHomepage: (value: HomepageDraft) => void; images: Row[]; properties: Row[]; markDirty: () => void }) {
  const [selectedImageId, setSelectedImageId] = useState("");
  const propertyNames = new Map(properties.map((property) => [String(property.id), String(property.name ?? "Serenity house")]));
  const selectedIds = new Set(homepage.hero_gallery.map((image) => image.image_id || image.id));
  const availableImages = images.filter((image) => {
    const id = String(image.id ?? "");
    return id && !selectedIds.has(id) && Boolean(adminImageUrl(image));
  });

  const updateGallery = (heroGallery: HomepageHeroImage[]) => {
    setHomepage({ ...homepage, hero_gallery: heroGallery });
    markDirty();
  };

  const addImage = (imageId: string) => {
    const image = images.find((item) => String(item.id) === imageId);
    if (!image) return;
    const src = adminImageUrl(image);
    if (!src || selectedIds.has(imageId)) return;
    const propertyName = propertyNames.get(String(image.property_id)) ?? "Serenity house";
    updateGallery([...homepage.hero_gallery, {
      id: imageId,
      image_id: imageId,
      property_id: String(image.property_id ?? ""),
      src,
      alt: String(image.alt_text ?? `${propertyName} accommodation photo`),
      enabled: true,
    }]);
    setSelectedImageId("");
  };

  const updateImage = (id: string, updates: Partial<HomepageHeroImage>) => updateGallery(homepage.hero_gallery.map((image) => image.id === id ? { ...image, ...updates } : image));
  const moveImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= homepage.hero_gallery.length) return;
    const next = [...homepage.hero_gallery];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    updateGallery(next);
  };

  return <section className="rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-extrabold">Hero photo gallery</h3><p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600">Choose existing property photos for the cinematic hero. The first enabled photo is featured, and removing a photo here never deletes the original image record.</p></div><span className="rounded-none bg-[#EAE1DD] px-3 py-1 text-xs font-bold text-[#5A463A]">{homepage.hero_gallery.length} selected</span></div><label className="mt-5 block text-sm font-bold">Add an existing property photo<select className="field mt-1" value={selectedImageId} onChange={(event) => { setSelectedImageId(event.target.value); if (event.target.value) addImage(event.target.value); }}><option value="">Choose a photo…</option>{availableImages.map((image) => <option key={image.id} value={image.id}>{propertyNames.get(String(image.property_id)) ?? "Serenity house"} · {image.alt_text || "Photo"}</option>)}</select></label>{homepage.hero_gallery.length ? <div className="mt-5 grid gap-3">{homepage.hero_gallery.map((image, index) => <article key={image.id} className={`grid gap-4 rounded-none border p-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto] ${image.enabled ? "border-[#D8CCC4] bg-white" : "border-[#D8CCC4] bg-[#EAE1DD]/60"}`}><div className="relative h-28 overflow-hidden rounded-none bg-[#DED2CB]"><Image src={image.src} alt="" fill sizes="128px" className={`object-cover ${image.enabled ? "" : "opacity-55 grayscale"}`} unoptimized={image.src.includes("a0.muscache.com")} referrerPolicy="no-referrer" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-none bg-[#5A463A] px-2 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-white">{index === 0 ? "Featured first" : `Position ${index + 1}`}</span><span className="text-xs text-stone-500">{propertyNames.get(image.property_id) ?? "Serenity house"}</span></div><div className="mt-2"><CharacterField label="Alt text" value={image.alt} onChange={(value) => updateImage(image.id, { alt: value })} limit={CMS_LIMITS.hero_alt_text} /></div><label className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-stone-700"><input type="checkbox" checked={image.enabled} onChange={(event) => updateImage(image.id, { enabled: event.target.checked })} /> Use on public homepage</label></div><div className="flex items-start gap-1 sm:flex-col"><IconButton label="Move photo up" disabled={!index} onClick={() => moveImage(index, -1)} icon={<ChevronUp size={15} />} /><IconButton label="Move photo down" disabled={index === homepage.hero_gallery.length - 1} onClick={() => moveImage(index, 1)} icon={<ChevronDown size={15} />} /><button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-none border border-[#E7BDB4] px-3 text-xs font-bold text-[#8A3325]" onClick={() => updateGallery(homepage.hero_gallery.filter((item) => item.id !== image.id))}><Trash2 size={15} /> Remove</button></div></article>)}</div> : <div className="mt-5 rounded-none border border-dashed border-[#B99D88] bg-white p-5 text-sm text-stone-600">No hero photos selected yet. Add existing property photos above to build the homepage gallery.</div>}<p className="mt-4 text-xs leading-relaxed text-stone-500">Use a useful description such as “Serenity 11 living room with natural light”, not just “image”. The public gallery loads only enabled images and preloads the first one.</p></section>;
}
*/

function ReviewManager({ properties, reviews, createReview, updateReview, deleteReview }: { properties: Row[]; reviews: Row[]; createReview: (review: Row) => Promise<void>; updateReview: (reviewId: string, review: Row) => Promise<void>; deleteReview: (reviewId: string) => Promise<void> }) {
  const [propertyId, setPropertyId] = useState(String(properties[0]?.id ?? ""));
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const selectedPropertyId = propertyId || String(properties[0]?.id ?? "");
  const selectedReviews = reviews.filter((review) => review.property_id === selectedPropertyId).sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0));
  const filteredReviews = selectedReviews.filter((review) => `${review.reviewer_name} ${review.review_text}`.toLowerCase().includes(query.toLowerCase()));
  const startNew = () => { setEditingId(""); setDraft({ property_id: selectedPropertyId, reviewer_name: "", review_text: "", review_date: "", review_date_label: "", display_order: selectedReviews.length + 1, published: true, rating: 5, source: "Manual" }); setLocalError(""); };
  const startEdit = (review: Row) => { setEditingId(String(review.id)); setDraft({ ...review, review_date: review.review_date ? String(review.review_date).slice(0, 10) : "", review_date_label: String(review.review_date_label ?? ""), display_order: Number(review.display_order ?? 0), published: Boolean(review.published), rating: 5 }); setLocalError(""); };
  const update = (key: string, value: unknown) => setDraft((current) => current ? { ...current, [key]: value } : current);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    const reviewerName = String(draft.reviewer_name ?? "").trim();
    const reviewText = String(draft.review_text ?? "").trim();
    const reviewDate = String(draft.review_date ?? "");
    const displayOrder = Number(draft.display_order ?? 0);
    const browserErrors = [
      !reviewerName ? "Reviewer name is required." : reviewerName.length > CMS_LIMITS.reviewer_name ? `Reviewer name must be ${CMS_LIMITS.reviewer_name} characters or fewer.` : "",
      !reviewText ? "Review text is required." : reviewText.length > CMS_LIMITS.review_text ? `Review text must be ${CMS_LIMITS.review_text} characters or fewer.` : "",
      String(draft.review_date_label ?? "").trim().length > CMS_LIMITS.review_date_label ? `Date label must be ${CMS_LIMITS.review_date_label} characters or fewer.` : "",
      reviewDate && !/^\d{4}-\d{2}-\d{2}$/.test(reviewDate) ? "Review date must use YYYY-MM-DD format." : "",
      !Number.isInteger(displayOrder) || displayOrder < 0 ? "Display order must be a whole number of zero or more." : "",
    ].filter(Boolean);
    if (browserErrors.length) { setLocalError(browserErrors.join(" ")); return; }
    setLocalError(""); setBusy(true);
    try { const payload = { ...draft, property_id: selectedPropertyId, reviewer_name: reviewerName, review_text: reviewText, rating: 5, display_order: displayOrder }; if (editingId) await updateReview(editingId, payload); else await createReview(payload); setDraft(null); setEditingId(""); } catch (saveError) { setLocalError(saveError instanceof Error ? saveError.message : "Could not save review."); } finally { setBusy(false); }
  };
  const remove = async (review: Row) => { if (!window.confirm(`Delete the review from ${review.reviewer_name || "this guest"}? This cannot be undone.`)) return; setBusy(true); setLocalError(""); try { await deleteReview(String(review.id)); if (editingId === review.id) { setDraft(null); setEditingId(""); } } catch (deleteError) { setLocalError(deleteError instanceof Error ? deleteError.message : "Could not delete review."); } finally { setBusy(false); } };
  return <><PageHeader eyebrow="Reviews" title="Manage guest reviews" description="Edit five-star guest feedback for each Serenity house. Imported source details stay protected while display content remains easy to update." action={<button type="button" className="btn-primary inline-flex items-center gap-2" onClick={startNew}><Plus size={16} /> Add review</button>} />{localError && <div className="admin-notice is-error" role="alert"><X size={18} />{localError}</div>}<div className="mb-5 grid gap-4 rounded-none border border-[#D8CCC4] bg-white p-4 md:grid-cols-[220px_minmax(0,1fr)]"><label className="block text-sm font-bold">House<select className="field mt-1" value={propertyId} onChange={(event) => { setPropertyId(event.target.value); setDraft(null); setEditingId(""); }}><option value="">Select a house</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label><label className="block text-sm font-bold">Search reviews<input className="field mt-1" placeholder="Reviewer name or review text" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>{draft && <form onSubmit={save} className="card mb-6 grid gap-5 bg-white p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EAE1DD] pb-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B6B55]">{editingId ? "Edit review" : "New review"}</p><h2 className="mt-1 text-xl font-extrabold">Five-star guest feedback</h2><p className="mt-1 text-sm text-stone-600">The rating is locked to five stars to preserve the imported review rule.</p></div><ReviewStars /></div><div className="grid gap-4 md:grid-cols-2"><CharacterField label="Reviewer name" value={draft.reviewer_name} onChange={(value) => update("reviewer_name", value)} limit={CMS_LIMITS.reviewer_name} /><CharacterField label="Review date" value={draft.review_date} onChange={(value) => update("review_date", value)} type="date" /><CharacterField label="Date label" value={draft.review_date_label} onChange={(value) => update("review_date_label", value)} limit={CMS_LIMITS.review_date_label} help="Optional display text, such as March 2025." /><NumberField label="Display order" value={draft.display_order} onChange={(value) => update("display_order", value)} /><label className="block text-sm font-bold">Source<input className="field mt-1" value={draft.source || "Imported"} readOnly aria-readonly="true" /></label><label className="flex items-center gap-3 self-end text-sm font-bold"><input type="checkbox" checked={Boolean(draft.published)} onChange={(event) => update("published", event.target.checked)} className="h-4 w-4 accent-[#5A463A]" /> Published on public website</label></div><CharacterField label="Review text" value={draft.review_text} onChange={(value) => update("review_text", value)} limit={CMS_LIMITS.review_text} textarea /><div className="flex flex-wrap gap-3 border-t border-[#EAE1DD] pt-4"><button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={busy}><Save size={16} />{busy ? "Saving…" : editingId ? "Save review" : "Add review"}</button><button type="button" className="btn-outline-dark" onClick={() => { setDraft(null); setEditingId(""); }}>Cancel</button></div></form>}{!propertyId ? <EmptyState icon={Building2} title="Select a house" description="Choose Serenity 7, Serenity 9, or Serenity 11 to manage its reviews." /> : !filteredReviews.length ? <div className="card bg-white"><EmptyState icon={Star} title={query ? "No reviews match" : "No reviews for this house"} description={query ? "Try a different reviewer name or phrase." : "Add the first five-star review for this house."} /></div> : <div className="grid gap-4 lg:grid-cols-2">{filteredReviews.map((review) => <article key={review.id} className="card flex min-w-0 flex-col bg-white p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-lg font-extrabold">{review.reviewer_name}</p><p className="mt-1 text-xs text-stone-500">{review.review_date_label || (review.review_date ? formatDate(review.review_date) : "Date not supplied")}</p></div><ReviewStars /></div><div className="mt-4 flex flex-wrap items-center gap-2"><StatusBadge label={review.published ? "Published" : "Draft"} tone={review.published ? "success" : "neutral"} /><span className="rounded-none border border-[#D8CCC4] bg-[#F7F4F1] px-2.5 py-1 text-xs font-bold text-stone-600">Order {review.display_order ?? 0}</span></div><p className="mt-4 min-w-0 whitespace-pre-line break-words text-sm leading-relaxed text-stone-700">{review.review_text}</p><div className="mt-auto flex flex-wrap gap-2 border-t border-[#EAE1DD] pt-4"><button type="button" className="btn-outline-dark min-h-10 px-3 text-sm" onClick={() => startEdit(review)}>Edit</button><button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-none border border-[#E7BDB4] px-3 text-sm font-bold text-[#8A3325]" disabled={busy} onClick={() => void remove(review)}><Trash2 size={15} /> Delete</button></div></article>)}</div>}</>;
}

function ReviewStars() { return <span className="flex shrink-0 gap-0.5 text-amber-400" aria-label="5 out of 5 stars">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill="currentColor" aria-hidden="true" />)}</span>; }

// Kept as a compatibility reference for older dashboard imports.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ImageManager({ properties, selectedId, setSelectedId, images, upload, deleteImage, updateImageAlt, reorderImage }: any) {
  return <><PageHeader eyebrow="Images" title="Keep property media polished" description="Upload compressed WebP images, update alt text, and reorder the gallery without editing URLs." /><div className="mb-5 flex flex-wrap gap-2">{properties.map((property: Row) => <button key={property.id} type="button" onClick={() => setSelectedId(property.id)} className={`rounded-none border px-4 py-2 text-sm font-bold ${selectedId === property.id ? "border-[#5A463A] bg-[#5A463A] text-white" : "border-[#D8CCC4] bg-white hover:bg-[#F7F4F1]"}`}>{property.name}</button>)}</div>{selectedId ? <div className="card bg-white p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Gallery</h2><p className="mt-1 text-sm text-stone-600">Maximum 5 MB. Images are resized to a 2,400 px long edge and uploaded as WebP.</p></div><label className="btn-primary inline-flex min-h-11 cursor-pointer items-center gap-2"><Plus size={16} /> Upload image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={upload} /></label></div>{images.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{images.map((image: Row, index: number) => <div key={image.id} className="overflow-hidden rounded-none border border-[#D8CCC4] bg-white"><div className="relative h-44 bg-[#F7F4F1]">{image.storage_path ? <Image src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${image.storage_path}`} alt={image.alt_text || "Property photo"} fill sizes="(max-width: 768px) 50vw, 280px" className="object-cover" /> : image.external_url ? <Image src={image.external_url} alt={image.alt_text || "Property photo"} width={800} height={500} sizes="(max-width: 768px) 50vw, 280px" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-stone-500">No preview available</div>}</div><div className="space-y-3 p-4"><CharacterField label="Alt text" value={image.alt_text} onChange={(value) => updateImageAlt(image, value)} limit={220} /><div className="flex flex-wrap gap-2"><IconButton label="Move up" disabled={!index} onClick={() => reorderImage(image, -1)} icon={<ChevronUp size={16} />} /><IconButton label="Move down" disabled={index === images.length - 1} onClick={() => reorderImage(image, 1)} icon={<ChevronDown size={16} />} /><button type="button" onClick={() => deleteImage(image)} className="inline-flex min-h-10 items-center gap-2 rounded-none border border-[#E7BDB4] px-3 text-xs font-bold text-[#8A3325]"><Trash2 size={15} /> Delete</button></div></div></div>)}</div> : <EmptyState icon={Images} title="No images yet" description="Upload the first optimised property image to begin the gallery." />}</div> : <EmptyState icon={Images} title="Select a house" description="Choose a house above to manage its image gallery." />}</>;
}

function EnquiryManager({ enquiries, updateStatus, updateNotes, convert }: { enquiries: Row[]; updateStatus: (enquiry: Row, status: string) => void; updateNotes: (enquiry: Row, notes: string) => void; convert: (enquiry: Row) => void }) {
  const [query, setQuery] = useState("");
  const filtered = enquiries.filter((item) => `${item.company_name} ${item.contact_name} ${item.email}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <PageHeader eyebrow="Enquiries" title="Corporate enquiries" description="Respond to companies and project teams with a clear view of each request." />
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-xl"><Search className="admin-search-icon" size={18} aria-hidden="true" /><input className="field admin-search-input" placeholder="Search company, contact, or email" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <p className="text-sm text-stone-600">{filtered.length} {filtered.length === 1 ? "enquiry" : "enquiries"}</p>
    </div>
    <div className="card admin-table-shell overflow-x-auto bg-white">
      <table className="admin-responsive-table w-full min-w-[1040px] text-left text-sm">
        <thead><tr className="border-b border-[#EAE1DD] text-xs uppercase tracking-wider text-stone-500"><th className="p-3">Company</th><th className="p-3">Contact</th><th className="p-3">Dates</th><th className="p-3">Status</th><th className="p-3">Internal notes</th><th className="p-3">Update</th></tr></thead>
        <tbody>{filtered.map((enquiry) => <tr key={String(enquiry.id)} className="border-b border-[#F0EAE5] align-top">
          <td data-label="Company" className="p-3 font-bold">{enquiry.company_name}<br /><span className="text-xs font-normal text-stone-500">{enquiry.houses_needed || 1} house(s)</span></td>
          <td data-label="Contact" className="p-3">{enquiry.contact_name}<br /><span className="break-all text-xs text-stone-500">{enquiry.email}</span></td>
          <td data-label="Dates" className="p-3">{formatDate(enquiry.arrival)} – {formatDate(enquiry.departure)}</td>
          <td data-label="Status" className="p-3"><StatusBadge label={String(enquiry.status || "new")} tone={enquiry.status === "approved" || enquiry.status === "converted" ? "success" : enquiry.status === "declined" ? "danger" : "neutral"} /></td>
          <td data-label="Internal notes" className="p-3"><textarea className="field min-h-20 min-w-52 text-sm" defaultValue={String(enquiry.internal_notes || "")} maxLength={CMS_LIMITS.admin_notes} placeholder="Add an internal note" onBlur={(event) => { if (event.target.value !== String(enquiry.internal_notes || "")) updateNotes(enquiry, event.target.value); }} /></td>
          <td data-label="Update" className="p-3"><div className="flex min-w-44 flex-col gap-2"><select className="field py-2 text-sm" value={String(enquiry.status || "new")} onChange={(event) => updateStatus(enquiry, event.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="pending_approval">Pending approval</option><option value="approved">Approved</option><option value="declined">Declined</option><option value="converted">Converted</option></select>{enquiry.status === "approved" && <button type="button" className="btn-primary min-h-9 px-3 text-xs" onClick={() => convert(enquiry)}>Convert to bookings</button>}</div></td>
        </tr>)}</tbody>
      </table>
      {!filtered.length && <EmptyState icon={MessageSquare} title="No enquiries found" description="New corporate enquiries will appear here." compact />}
    </div>
  </>;
}

function ContactManager({ contacts, unavailable, updateStatus, updateNotes }: { contacts: Row[]; unavailable: boolean; updateStatus: (contact: Row, status: string) => void; updateNotes: (contact: Row, notes: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = contacts.filter((item) => `${item.first_name} ${item.last_name} ${item.email} ${item.phone} ${item.message}`.toLowerCase().includes(query.toLowerCase()));

  return <>
    <PageHeader eyebrow="Contacts" title="Customer contact messages" description="Messages sent from the public Contact page. Corporate stay requests remain in the separate Enquiries workspace." />
    {unavailable && <div className="admin-notice is-error mb-4" role="alert"><X size={18} />Contact messages are not connected yet. Apply the contact messages migration, then refresh this page.</div>}
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-xl"><Search className="admin-search-icon" size={18} aria-hidden="true" /><input className="field admin-search-input" placeholder="Search name, email, phone, or message" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <p className="text-sm text-stone-600">{filtered.length} {filtered.length === 1 ? "message" : "messages"}</p>
    </div>
    <div className="card admin-table-shell overflow-x-auto bg-white">
      <table className="admin-responsive-table w-full min-w-[1180px] text-left text-sm">
        <thead><tr className="border-b border-[#EAE1DD] text-xs uppercase tracking-wider text-stone-500"><th className="p-3">Customer</th><th className="p-3">Message</th><th className="p-3">Request</th><th className="p-3">Received</th><th className="p-3">Status</th><th className="p-3">Internal notes</th><th className="p-3">Update</th></tr></thead>
        <tbody>{filtered.map((contact) => <tr key={String(contact.id)} className="border-b border-[#F0EAE5] align-top">
          <td data-label="Customer" className="p-3"><p className="font-bold">{contact.first_name} {contact.last_name}</p><a className="mt-1 block break-all text-xs text-[#7A4E2D] hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a>{contact.phone && <a className="mt-1 block text-xs text-stone-500 hover:underline" href={`tel:${contact.phone}`}>{contact.phone}</a>}</td>
          <td data-label="Message" className="max-w-sm p-3"><p className="whitespace-pre-line break-words text-sm leading-relaxed text-stone-700">{contact.message}</p></td>
          <td data-label="Request" className="p-3 text-stone-600"><p>{contact.project_type || "Not specified"}</p><p className="mt-1 text-xs">{contact.preferred_house || "House not specified"}</p></td>
          <td data-label="Received" className="whitespace-nowrap p-3 text-stone-600">{formatDate(contact.created_at)}</td>
          <td data-label="Status" className="p-3"><StatusBadge label={String(contact.status || "new")} tone={contact.status === "closed" ? "success" : contact.status === "spam" ? "danger" : "neutral"} /></td>
          <td data-label="Internal notes" className="p-3"><textarea className="field min-h-20 min-w-52 text-sm" defaultValue={String(contact.internal_notes || "")} maxLength={CMS_LIMITS.admin_notes} placeholder="Add an internal note" onBlur={(event) => { if (event.target.value !== String(contact.internal_notes || "")) updateNotes(contact, event.target.value); }} /></td>
          <td data-label="Update" className="p-3"><select className="field min-w-36 py-2 text-sm" value={String(contact.status || "new")} onChange={(event) => updateStatus(contact, event.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option><option value="spam">Spam</option></select></td>
        </tr>)}</tbody>
      </table>
      {!filtered.length && <EmptyState icon={Mail} title={query ? "No messages found" : "No customer messages"} description={query ? "Try a different name, email address, or phrase." : "Messages sent from the public Contact page will appear here."} compact />}
    </div>
  </>;
}

function AdminUserManager({ users, currentUserEmail, createUser, updateUser, deleteUser }: { users: AdminUser[]; currentUserEmail: string; createUser: (email: string, role: AdminRole) => Promise<void>; updateUser: (userId: string, changes: { role?: AdminRole; active?: boolean }) => Promise<void>; deleteUser: (userId: string) => Promise<void> }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("admin");
  const [busy, setBusy] = useState("");
  const [localError, setLocalError] = useState("");
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setLocalError(""); setBusy("invite"); try { await createUser(inviteEmail.trim(), inviteRole); setInviteEmail(""); } catch (submitError) { setLocalError(submitError instanceof Error ? submitError.message : "Could not invite admin user."); } finally { setBusy(""); } };
  const change = async (user: AdminUser, changes: { role?: AdminRole; active?: boolean }) => { setLocalError(""); setBusy(user.user_id); try { await updateUser(user.user_id, changes); } catch (changeError) { setLocalError(changeError instanceof Error ? changeError.message : "Could not update user."); } finally { setBusy(""); } };
  const remove = async (user: AdminUser) => { if (!window.confirm(`Remove ${user.email} permanently?`)) return; setLocalError(""); setBusy(user.user_id); try { await deleteUser(user.user_id); } catch (removeError) { setLocalError(removeError instanceof Error ? removeError.message : "Could not remove user."); } finally { setBusy(""); } };
  return <>
    <PageHeader eyebrow="Admin users" title="Manage team access" description="Only super admins can invite, change roles, deactivate, or remove admin users." />
    {localError && <div className="admin-notice is-error" role="alert">{localError}</div>}
    <form onSubmit={submit} className="card mb-6 grid gap-4 bg-white p-5 sm:grid-cols-[1fr_180px_auto] sm:items-end"><CharacterField label="Invite by email" value={inviteEmail} onChange={setInviteEmail} limit={CMS_LIMITS.email_address} type="email" placeholder="team@example.com" /><label className="block text-sm font-bold">Role<select className="field mt-1" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as AdminRole)}><option value="admin">Admin</option><option value="editor">Editor</option><option value="super_admin">Super admin</option></select></label><button className="btn-primary min-h-11" disabled={busy === "invite"}>{busy === "invite" ? "Inviting…" : "Send invitation"}</button></form>
    <div className="card admin-table-shell overflow-x-auto bg-white"><table className="admin-responsive-table w-full min-w-[780px] text-left text-sm"><thead><tr className="border-b border-[#EAE1DD] text-xs uppercase tracking-wider text-stone-500"><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3">Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user.user_id} className="border-b border-[#F0EAE5]"><td data-label="Email" className="break-all p-3 font-bold">{user.email}{user.email === currentUserEmail && <span className="ml-2 rounded-none bg-[#EAE1DD] px-2 py-1 text-xs font-semibold">You</span>}</td><td data-label="Role" className="p-3"><select className="field py-2 text-sm" value={user.role} disabled={busy === user.user_id} onChange={(event) => void change(user, { role: event.target.value as AdminRole })}><option value="admin">Admin</option><option value="editor">Editor</option><option value="super_admin">Super admin</option></select></td><td data-label="Status" className="p-3"><StatusBadge label={user.active ? "Active" : "Inactive"} tone={user.active ? "success" : "neutral"} /></td><td data-label="Created" className="p-3">{formatDate(user.created_at)}</td><td data-label="Actions" className="p-3"><div className="flex flex-wrap gap-2"><button type="button" className="btn-outline-dark min-h-9 px-3 text-xs" disabled={busy === user.user_id} onClick={() => void change(user, { active: !user.active })}>{user.active ? "Deactivate" : "Activate"}</button><button type="button" className="btn-outline-dark min-h-9 px-3 text-xs text-[#8A3325]" disabled={busy === user.user_id} onClick={() => void remove(user)}>Remove</button></div></td></tr>)}</tbody></table>{!users.length && <EmptyState icon={UsersRound} title="No admin users found" description="Invite a trusted administrator to get started." compact />}</div>
  </>;
}

function SettingsPanel({ email, settings, setSettings, save, saving }: { email: string; settings: Record<string, string>; setSettings: (value: Record<string, string>) => void; save: () => Promise<void>; saving: boolean }) {
  const update = (key: string, value: string) => setSettings({ ...settings, [key]: value });
  const addressVisible = settings.public_address_visible !== "false";

  return <>
    <PageHeader eyebrow="Site settings" title="One place for every public contact detail" description="Edit the contact information used across the homepage, contact page, footer, location prompts, corporate stays, and booking conversations." />
    <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="card grid gap-6 bg-white p-5 sm:p-7">
        <section className="grid gap-4 border-b border-[#EAE1DD] pb-6">
          <div><h3 className="text-lg font-extrabold">Business identity</h3><p className="mt-1 text-sm text-stone-600">These values power the public contact cards and footer. Required fields are marked with an asterisk.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CharacterField label="Business name *" value={settings.business_name} onChange={(value) => update("business_name", value)} limit={CMS_LIMITS.business_name} />
            <CharacterField label="Contact email *" value={settings.contact_email} onChange={(value) => update("contact_email", value)} limit={CMS_LIMITS.email_address} type="email" />
            <CharacterField label="Phone number *" value={settings.phone_number} onChange={(value) => update("phone_number", value)} limit={CMS_LIMITS.phone_number} type="tel" help="Australian format, for example +61 3 9000 0000." />
            <CharacterField label="WhatsApp number" value={settings.whatsapp_number} onChange={(value) => update("whatsapp_number", value)} limit={CMS_LIMITS.whatsapp_number} type="tel" help="Optional. Used to build a secure wa.me link." />
            <CharacterField label="Public address *" value={settings.public_address} onChange={(value) => update("public_address", value)} limit={CMS_LIMITS.public_address} textarea help="Keep this to the intended public neighbourhood/address level." />
            <CharacterField label="Business hours *" value={settings.business_hours} onChange={(value) => update("business_hours", value)} limit={CMS_LIMITS.business_hours} textarea />
          </div>
          <div className="grid gap-3 rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-4 sm:grid-cols-2"><Toggle label="Publish contact details" checked={settings.contact_published !== "false"} onChange={(checked) => update("contact_published", String(checked))} /><Toggle label="Show public address" checked={addressVisible} onChange={(checked) => update("public_address_visible", String(checked))} /></div>
        </section>

        <section className="grid gap-4 border-b border-[#EAE1DD] pb-6">
          <div><h3 className="text-lg font-extrabold">Contact page copy</h3><p className="mt-1 text-sm text-stone-600">Keep the public message concise so it remains readable on mobile.</p></div>
          <CharacterField label="Contact page heading *" value={settings.contact_page_heading} onChange={(value) => update("contact_page_heading", value)} limit={CMS_LIMITS.contact_page_heading} textarea />
          <CharacterField label="Contact page description *" value={settings.contact_page_description} onChange={(value) => update("contact_page_description", value)} limit={CMS_LIMITS.contact_page_description} textarea />
          <CharacterField label="Footer text *" value={settings.footer_text} onChange={(value) => update("footer_text", value)} limit={CMS_LIMITS.footer_text} textarea />
        </section>

        <section className="grid gap-4 border-b border-[#EAE1DD] pb-6">
          <div><h3 className="text-lg font-extrabold">Directions and social links</h3><p className="mt-1 text-sm text-stone-600">Use complete https URLs for external destinations. Leave social links blank to hide them.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CharacterField label="Directions link *" value={settings.directions_url} onChange={(value) => update("directions_url", value)} limit={CMS_LIMITS.directions_url} type="url" />
            <CharacterField label="Google Maps or map link *" value={settings.map_url} onChange={(value) => update("map_url", value)} limit={CMS_LIMITS.map_url} type="url" />
            <CharacterField label="Facebook URL" value={settings.facebook_url} onChange={(value) => update("facebook_url", value)} limit={CMS_LIMITS.social_url} type="url" />
            <CharacterField label="Instagram URL" value={settings.instagram_url} onChange={(value) => update("instagram_url", value)} limit={CMS_LIMITS.social_url} type="url" />
            <CharacterField label="LinkedIn URL" value={settings.linkedin_url} onChange={(value) => update("linkedin_url", value)} limit={CMS_LIMITS.social_url} type="url" />
          </div>
        </section>

        <section className="grid gap-4 border-b border-[#EAE1DD] pb-6">
          <div><h3 className="text-lg font-extrabold">Enquiry routing</h3><p className="mt-1 text-sm text-stone-600">These addresses are available to booking and corporate contact prompts.</p></div>
          <div className="grid gap-4 sm:grid-cols-2"><CharacterField label="Booking enquiry email *" value={settings.booking_enquiry_email} onChange={(value) => update("booking_enquiry_email", value)} limit={CMS_LIMITS.booking_enquiry_email} type="email" /><CharacterField label="Corporate enquiry email *" value={settings.corporate_enquiry_email} onChange={(value) => update("corporate_enquiry_email", value)} limit={CMS_LIMITS.corporate_enquiry_email} type="email" /></div>
        </section>

        <section className="grid gap-4 border-b border-[#EAE1DD] pb-6"><div><h3 className="text-lg font-extrabold">Australian defaults</h3><p className="mt-1 text-sm text-stone-600">These existing settings remain available for the promotion and local formatting.</p></div><div className="grid gap-4 sm:grid-cols-3"><CharacterField label="Locale" value={settings.locale} onChange={(value) => update("locale", value)} limit={CMS_LIMITS.navigation_label} /><CharacterField label="Timezone" value={settings.timezone} onChange={(value) => update("timezone", value)} limit={CMS_LIMITS.nearby_location} /><CharacterField label="Currency" value={settings.currency} onChange={(value) => update("currency", value)} limit={CMS_LIMITS.navigation_label} /></div></section>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#EAE1DD] pt-5"><p className="text-sm text-stone-600">Signed in as <strong>{email}</strong><br /><span className="text-xs">Contact values are stored in the existing public site settings record.</span></p><button className="btn-primary inline-flex min-h-11 items-center gap-2" disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save settings"}</button></div>
      </div>

      <aside className="card h-fit bg-[#EAE1DD] p-5 sm:p-6"><div className="flex items-center gap-2 text-sm font-extrabold"><Eye size={17} className="text-[#8B6B55]" /> Public contact preview</div><div className="mt-4 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B6B55]">{settings.business_name || "Business name"}</p><h3 className="mt-3 break-words text-2xl font-extrabold text-[#2D2622]">{settings.contact_page_heading || "Contact page heading"}</h3><p className="mt-3 break-words text-sm leading-relaxed text-stone-600">{settings.contact_page_description || "Contact page description"}</p><div className="mt-5 space-y-2 border-t border-[#EAE1DD] pt-4 text-sm text-stone-700"><p className="break-words"><strong>Email:</strong> {settings.contact_email || "—"}</p><p><strong>Phone:</strong> {settings.phone_number || "—"}</p>{addressVisible && <p className="break-words"><strong>Location:</strong> {settings.public_address || "—"}</p>}<p className="break-words"><strong>Hours:</strong> {settings.business_hours || "—"}</p></div><div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">{settings.whatsapp_number && <span className="rounded-none bg-[#E6EFE9] px-3 py-1.5 text-[#2F5D4B]">WhatsApp</span>}{settings.facebook_url && <span className="rounded-none bg-[#F7F4F1] px-3 py-1.5">Facebook</span>}{settings.instagram_url && <span className="rounded-none bg-[#F7F4F1] px-3 py-1.5">Instagram</span>}{settings.linkedin_url && <span className="rounded-none bg-[#F7F4F1] px-3 py-1.5">LinkedIn</span>}</div></div></aside>
    </form>
  </>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <header className="admin-page-header">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B6B55]">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">{description}</p>
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
    </header>
  );
}
function FormGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <fieldset className="grid gap-4 border-b border-[#EAE1DD] pb-5 last:border-b-0 last:pb-0"><legend className="text-lg font-extrabold">{title}</legend><p className="-mt-2 text-sm text-stone-600">{description}</p>{children}</fieldset>; }
function Metric({ label, value, detail, onClick }: { icon?: typeof Home; label: string; value: number | string; detail: string; onClick?: () => void }) {
  const content = <><div className="admin-metric-label"><p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">{label}</p></div><p className="mt-3 text-3xl font-extrabold text-[#2D2622]">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></>;
  return onClick ? <button type="button" className="card admin-metric admin-metric-button bg-white p-4 text-left" onClick={onClick} aria-label={`${label}: ${value}. ${detail}`}>{content}</button> : <div className="card admin-metric bg-white p-4">{content}</div>;
}
function StatusBadge({ label, tone }: { label: string; tone: "success" | "danger" | "neutral" }) { return <span className="admin-status-badge" data-tone={tone} aria-label={label}>{label}</span>; }
const INTERNAL_LINK_OPTIONS = [
  { value: "/", label: "Homepage" },
  { value: "/houses", label: "Houses" },
  { value: "/corporate-stays", label: "Corporate stays" },
  { value: "/about", label: "About Serenity" },
  { value: "/long-term-stays", label: "Long-term stays" },
  { value: "/booking", label: "Booking" },
  { value: "/#faqs", label: "FAQs" },
  { value: "/contact", label: "Contact" },
  { value: "/terms", label: "Terms and conditions" },
  { value: "/privacy", label: "Privacy policy" },
];

const DEFAULT_CHARACTER_LIMIT = 300;
const FIELD_PLACEHOLDERS: Record<string, string> = {
  "Property name": "e.g. Serenity 7",
  Slug: "e.g. serenity-7",
  Location: "e.g. Pakenham, Victoria",
  "Property type": "e.g. Private furnished house",
  "Short description": "A concise description guests can scan quickly.",
  "Full description": "Describe the home, layout, and stay experience.",
  "Check-in time": "e.g. 3:00 pm",
  "Checkout time": "e.g. 10:00 am",
  "Pet policy": "e.g. Pets considered on request",
  "Parking details": "e.g. Private driveway parking",
  "Listing title": "e.g. A calm furnished stay in Pakenham",
  "Kitchen facilities": "e.g. Fully equipped kitchen with essentials.",
  "Laundry facilities": "e.g. Washing machine and dryer available.",
  "Wi-Fi and connectivity": "e.g. Fast Wi-Fi for work and streaming.",
  Workspace: "e.g. Desk and chair in the living area.",
  "Heating and cooling": "e.g. Split-system heating and cooling.",
  "Self check-in details": "e.g. Secure key-safe entry.",
  "Safety information": "e.g. Smoke alarms and emergency information provided.",
  "Cancellation policy": "Summarise the cancellation terms in plain language.",
  "Corporate information": "Explain what corporate guests should know.",
  "Corporate booking instructions": "e.g. Contact us for multi-house bookings.",
  Room: "e.g. Bedroom 1",
  Beds: "e.g. Queen bed",
  "Alt text": "Describe the image briefly",
};

function LinkSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const hasKnownValue = INTERNAL_LINK_OPTIONS.some((option) => option.value === value);
  const options = hasKnownValue || !value
    ? INTERNAL_LINK_OPTIONS
    : [{ value, label: `Current saved link (${value})` }, ...INTERNAL_LINK_OPTIONS];

  return <label className="block text-sm font-bold">Button destination<select className="field mt-1" value={value || "/houses"} onChange={(event) => onChange(event.target.value)} aria-label="Button destination">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><span className="mt-1 block text-xs font-normal text-stone-500">Choose the page guests should visit when they select this button.</span></label>;
}

function CharacterField({ label, value, onChange, limit, textarea = false, type = "text", placeholder, help }: { label: string; value: unknown; onChange: (value: string) => void; limit?: number; textarea?: boolean; type?: string; placeholder?: string; help?: string }) {
  const text = String(value ?? "");
  if (label.toLowerCase().includes("button link") || label.toLowerCase().includes("button destination")) return <LinkSelect value={text} onChange={onChange} />;
  const safeLimit = limit ?? DEFAULT_CHARACTER_LIMIT;
  const remaining = safeLimit - text.length;
  const fieldProps = { className: `field mt-1 ${textarea ? "admin-textarea min-h-40 max-h-96 resize-y overflow-y-auto" : ""}`, value: text, maxLength: safeLimit, placeholder: placeholder ?? FIELD_PLACEHOLDERS[label] ?? `Enter ${label.toLowerCase()}`, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value), "aria-label": label };
  return <label className="block min-w-0 text-sm font-bold">{label}{textarea ? <textarea {...fieldProps} /> : <input {...fieldProps} type={type} />}<span className="mt-1 flex min-w-0 items-center justify-between gap-3 text-xs font-normal text-stone-500">{help ? <span className="min-w-0 truncate">{help}</span> : <span />}{<span className={remaining <= Math.ceil(safeLimit * 0.1) ? "shrink-0 font-bold text-[#8A3325]" : "shrink-0"}>{text.length} / {safeLimit}</span>}</span></label>;
}
function NumberField({ label, value, onChange }: { label: string; value: unknown; onChange: (value: number) => void }) { return <label className="block text-sm font-bold">{label}<input className="field mt-1" type="number" min="0" step="0.1" value={Number(value ?? 0)} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
function RepeatableList({ label, items, onChange, limit, help }: { label: string; items: string[]; onChange: (items: string[]) => void; limit: number; help: string }) {
  const [pending, setPending] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const addTag = () => {
    const value = pending.trim().replace(/,$/, "").trim();
    if (!value) return;
    if (!items.some((item) => item.trim().toLowerCase() === value.toLowerCase())) onChange([...items, value.slice(0, limit)]);
    setPending("");
  };
  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    }
  };

  return <section className="md:col-span-2 rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-4">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0"><div className="flex items-center gap-2"><h3 className="text-sm font-extrabold">{label}</h3><span className="rounded-none bg-white px-2 py-0.5 text-[0.68rem] font-bold text-stone-500">{items.length}</span></div><p className="mt-1 text-xs font-normal text-stone-600">{help}</p></div>
      <button type="button" className="btn-outline-dark inline-flex min-h-9 shrink-0 items-center gap-1 px-3 py-1 text-xs" onClick={() => inputRef.current?.focus()}><Plus size={14} /> Add</button>
    </div>
    <div className="mt-3 flex gap-2"><input ref={inputRef} className="field !mt-0 min-h-10 min-w-0 flex-1 bg-white py-2 text-sm" value={pending} maxLength={limit} placeholder={`Type a ${label.toLowerCase().replace(/s$/, "")} and press Enter`} onChange={(event) => setPending(event.target.value)} onKeyDown={handleKeyDown} aria-label={`Add ${label.toLowerCase()}`} /><button type="button" className="btn-primary min-h-10 shrink-0 px-3 text-xs" onClick={addTag} disabled={!pending.trim()}>Add tag</button></div>
    <p className="mt-1 text-xs text-stone-500">Press Enter or comma to create a tag. Drag tags to change their order.</p>
    {items.length ? <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item, index) => <div className="admin-tag group inline-flex max-w-full cursor-grab items-center gap-1 rounded-none border border-[#D8CCC4] bg-white pl-2 pr-1 py-1 text-sm font-bold text-[#2D2622] shadow-sm active:cursor-grabbing" key={`${label}-${index}`} draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(index)); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); reorder(Number(event.dataTransfer.getData("text/plain")), index); }} title="Drag to reorder. Double-click the label to edit.">
        <GripVertical size={14} className="shrink-0 text-stone-400" aria-hidden="true" /><button type="button" className="max-w-[18rem] truncate text-left outline-none focus-visible:underline" onDoubleClick={() => { setPending(item); onChange(items.filter((_, itemIndex) => itemIndex !== index)); inputRef.current?.focus(); }}>{item}</button><button type="button" className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-none text-stone-400 hover:bg-[#F7F4F1] hover:text-[#8A3325]" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${item}`}><X size={13} /></button>
      </div>)}
    </div> : <p className="mt-3 rounded-none border border-dashed border-[#D8CCC4] bg-white/60 p-3 text-sm text-stone-500">No tags yet. Type an item above to add one.</p>}
  </section>;
}
function BedEditor({ items, onChange }: { items: BedArrangement[]; onChange: (items: BedArrangement[]) => void }) { return <div className="md:col-span-2 rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-extrabold">Sleeping arrangements</h3><p className="mt-1 text-xs text-stone-600">Add rooms and describe the beds without editing JSON.</p></div><button type="button" className="btn-outline-dark inline-flex min-h-9 items-center gap-1 px-3 py-1 text-xs" onClick={() => onChange([...items, { room: `Bedroom ${items.length + 1}`, beds: "" }])}><Plus size={14} /> Add room</button></div><div className="mt-4 grid gap-3">{items.map((item, index) => <div key={`bed-${index}`} className="grid gap-3 rounded-none border border-[#D8CCC4] bg-white p-3 sm:grid-cols-[1fr_1fr_auto]"><CharacterField label="Room" value={item.room} onChange={(value) => onChange(items.map((current, itemIndex) => itemIndex === index ? { ...current, room: value } : current))} limit={60} /><CharacterField label="Beds" value={item.beds} onChange={(value) => onChange(items.map((current, itemIndex) => itemIndex === index ? { ...current, beds: value } : current))} limit={100} /><div className="mt-7 flex gap-1"><IconButton label="Move up" disabled={!index} onClick={() => onChange(moveItem(items, index, -1))} icon={<ChevronUp size={15} />} /><IconButton label="Move down" disabled={index === items.length - 1} onClick={() => onChange(moveItem(items, index, 1))} icon={<ChevronDown size={15} />} /></div></div>)}</div></div>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex cursor-pointer items-center gap-3 text-sm font-bold"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#5A463A]" />{label}</label>; }
function IconButton({ label, disabled, onClick, icon }: { label: string; disabled?: boolean; onClick: () => void; icon: React.ReactNode }) { return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="inline-flex h-9 w-9 items-center justify-center rounded-none border border-[#D8CCC4] bg-white text-stone-600 hover:bg-[#EAE1DD] disabled:cursor-not-allowed disabled:opacity-40">{icon}</button>; }
function moveItem<T>(items: T[], index: number, direction: -1 | 1) { const next = index + direction; if (next < 0 || next >= items.length) return items; const copy = [...items]; [copy[index], copy[next]] = [copy[next], copy[index]]; return copy; }
function HousePreview({ draft }: { draft: Row }) { return <div className="card mt-6 bg-[#EAE1DD] p-6"><div className="flex items-center gap-2 text-sm font-bold text-[#5A463A]"><Eye size={17} /> Guest preview</div><div className="mt-4 rounded-none bg-white p-6"><p className="text-xs font-bold uppercase tracking-widest text-[#8B6B55]">{draft.property_type || "Furnished house"}</p><h3 className="mt-2 max-w-2xl text-3xl font-extrabold text-[#2D2622]">{draft.name || "Your house heading"}</h3><p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-700">{draft.short_description || "Your short description will appear here."}</p><div className="mt-5 flex flex-wrap gap-2">{asList(draft.amenities).slice(0, 6).map((item) => <span key={item} className="rounded-none bg-[#F7F4F1] px-3 py-1 text-xs font-bold text-stone-700">{item}</span>)}</div></div></div>; }
function HomepagePreview({ homepage }: { homepage: HomepageDraft }) { return <aside className="card h-fit overflow-hidden bg-white"><div className="flex items-center gap-2 border-b border-[#EAE1DD] px-5 py-4 text-sm font-bold"><Eye size={17} className="text-[#B99D88]" /> Live preview</div><div className="bg-[#5A463A] p-6 text-white"><p className="text-xs font-bold uppercase tracking-widest text-[#EAE1DD]">Serenity Pakenham</p><h3 className="mt-4 text-3xl font-extrabold leading-tight">{homepage.hero_heading || "Your hero heading"}</h3></div><div className="p-5"><p className="text-xs font-bold uppercase tracking-widest text-[#8B6B55]">Featured section</p><h4 className="mt-2 text-xl font-extrabold">{homepage.section_heading || "Section heading"}</h4><p className="mt-2 text-sm leading-relaxed text-stone-600">{homepage.section_description || "Section description"}</p></div></aside>; }
function EmptyState({ icon: Icon, title, description, compact = false }: { icon: typeof Home; title: string; description: string; compact?: boolean }) { return <div className={`flex flex-col items-center justify-center text-center text-stone-600 ${compact ? "p-8" : "min-h-64 p-10"}`}><Icon className="text-[#B99D88]" size={compact ? 28 : 38} /><h3 className="mt-3 text-lg font-extrabold text-stone-900">{title}</h3><p className="mt-1 max-w-md text-sm">{description}</p></div>; }
