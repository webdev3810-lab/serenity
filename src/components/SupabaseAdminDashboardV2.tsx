"use client";
import { normalizeAmenities } from "@/src/lib/amenities";
import { roomBedLabel,roomTotals } from "@/src/lib/rooms";

/* The CMS reads flexible Supabase rows, so the boundary is intentionally defensive. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import AdminPromotions from "@/src/components/AdminPromotions";
import AdminReservationsManager from "@/src/components/AdminReservationsManager";
import { AdminThemeToggle,useAdminTheme } from "@/src/components/AdminTheme";
import CalendarSyncManager from "@/src/components/CalendarSyncManager";
import { defaultHomepageFaqs } from "@/src/data/homepageFaqs";
import { CMS_LIMITS,trimCmsText,validateCmsContent } from "@/src/lib/cmsValidation";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import {
BarChart3,
Building2,
CalendarDays,
CalendarRange,
CheckCircle2,
ChevronDown,
ChevronLeft,
ChevronRight,
Clock3,
Home,
LoaderCircle,
Mail,
Menu,
MessageSquare,
Settings,
Star,
Tag,
UsersRound,
X
} from "lucide-react";
import { useRouter,useSearchParams } from "next/navigation";
import { useEffect,useMemo,useRef,useState } from "react";

import { AdminDialog,useAdminWorkspace,useDirtyGuard } from "@/src/components/admin/AdminUI";
import { fetchAllAdminRows } from "@/src/lib/admin-pagination";

import { Overview } from "@/src/components/admin/AdminOverview";
import { HomepageSectionsEditor } from "./admin/AdminHomepageEditor";
import { HouseEditor } from "./admin/AdminHouseEditor";
import { AdminUserManager,ContactManager,EnquiryManager,ReviewManager } from "./admin/AdminInboxSections";
import { AdminNavItem,AdminRole,AdminUser,asBeds,asDatePrices,asList,emptyHomepage,emptyProperty,emptySettings,formatMelbourneCompactDateTime,formatMelbourneDateTime,HomepageDraft,HomepageFaq,HomepageSectionKey,normalizeAdminSettings,normalizeProperty,Row,Tab } from "./admin/AdminModels";
import { AdminNavigation,SidebarProfile } from "./admin/AdminNavigation";
import { SettingsPanel } from "./admin/AdminSettings";

export type { AdminTab } from "./admin/AdminModels";
export function SupabaseAdminDashboardV2({ email, role, initialTab = "overview", initialHouseId = "", initialNewHouse = false }: { email: string; role: AdminRole; initialTab?: Tab; initialHouseId?: string; initialNewHouse?: boolean }) {
  const supabase = useMemo(() => createSupabaseBrowserClient() as any, []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, navigate } = useAdminWorkspace();
  const { theme } = useAdminTheme();
  const [localTab, setTab] = useState<Tab>(initialTab);
  const routeTab = searchParams.get("tab") as Tab | null;
  const tab = initialHouseId || initialNewHouse ? localTab : routeTab && ["overview", "homepage", "houses", "reviews", "promotions", "bookings", "calendar", "enquiries", "contacts", "users", "settings"].includes(routeTab) && (routeTab !== "users" || role === "super_admin") ? routeTab : initialTab;
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
  const [savedDraft, setSavedDraft] = useState<Row>(emptyProperty());
  const [savedHomepage, setSavedHomepage] = useState<HomepageDraft>(emptyHomepage());
  const [savedSettings, setSavedSettings] = useState<Record<string,string>>(emptySettings());
  const [loadFailed, setLoadFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const houseDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  useDirtyGuard((tab === "houses" && Boolean(initialHouseId || initialNewHouse) && houseDirty) || (tab === "homepage" && JSON.stringify(homepage) !== JSON.stringify(savedHomepage)) || (tab === "settings" && JSON.stringify(siteSettings) !== JSON.stringify(savedSettings)));
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
    try {
    const [propertyResult, imageResult, amenityResult, reviewResult, datePriceResult, bookingResult, calendarResult, calendarConnectionResult, enquiryResult, contactMessageResult, homepageResult, settingsResult] = await Promise.all([
      fetchAllAdminRows<Row>(() => supabase.from("properties").select("*").order("display_order").order("id")),
      fetchAllAdminRows<Row>(() => supabase.from("property_images").select("*").order("display_order").order("id")),
      fetchAllAdminRows<Row>(() => supabase.from("amenities").select("*").order("display_order").order("id")),
      fetchAllAdminRows<Row>(() => supabase.from("property_reviews").select("*").order("display_order").order("id")),
      fetchAllAdminRows<Row>(() => supabase.from("property_date_prices").select("*").order("price_date").order("id")),
      fetchAllAdminRows<Row>(() => supabase.from("bookings").select("*").order("created_at", { ascending: false }).order("id")),
      fetchAllAdminRows<Row>(() => supabase.from("calendar_events").select("*").order("start_date", { ascending: true }).order("id")),
      fetchAllAdminRows<Row>(() => supabase.from("calendar_connections").select("id, property_id, platform, connection_type, is_enabled, last_synced_at, last_attempt_at, last_success_at, last_error, last_imported_event_count, sync_frequency_minutes, sync_status").order("platform", { ascending: true }).order("id")),
      fetchAllAdminRows<Row>(() => supabase.from("enquiries").select("*").order("created_at", { ascending: false }).order("id")),
      fetchAllAdminRows<Row>(() => supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).order("id")),
      supabase.from("homepage_content").select("content, published").eq("page_key", "home").maybeSingle(),
      supabase.from("site_settings").select("key, value").eq("key", "site").maybeSingle(),
    ]);
    const firstError = [propertyResult, imageResult, amenityResult, reviewResult, datePriceResult, bookingResult, calendarResult, calendarConnectionResult, enquiryResult, homepageResult, settingsResult].find((result) => result.error)?.error;
    if (firstError) { setLoadFailed(true); throw new Error(`Workspace data could not be loaded: ${firstError.message}. Retry to load complete records.`); }
    setLoadFailed(false);
    const amenities = (amenityResult.data ?? []) as Row[];
    const datePrices = (datePriceResult.data ?? []) as Row[];
    const nextReviews = reviewResult.error ? [] : (reviewResult.data ?? []) as Row[];
    const nextProperties: Row[] = ((propertyResult.data ?? []) as Row[]).map((property) => ({
      ...property,
      amenities: amenities.filter((item) => item.property_id === property.id).sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0)).map((item) => item.name),
      date_prices: asDatePrices(datePrices.filter((item) => item.property_id === property.id)),
      amenity_details: amenities.filter(a=>a.property_id===property.id).map(a=>({id:a.catalog_id,label:a.name,icon:a.icon_id,group:a.amenity_group})),
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
    if (initialLoad) {
    setHomepageSource(content);
    const loadedHomepage: HomepageDraft = {
      hero_heading: String(content.hero_heading ?? ""), hero_subtitle: String(content.hero_subtitle ?? ""), hero_image_caption: String(content.hero_image_caption ?? ""), hero_cta_label: String(content.hero_cta_label ?? "Browse Houses"), hero_cta_href: String(content.hero_cta_href ?? "/houses"),
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
    };
    setHomepage(loadedHomepage); setSavedHomepage(loadedHomepage);
    setHomepagePublished(Boolean(homepageResult.data?.published));
    const loadedSettings = normalizeAdminSettings(settingsResult.data?.value);
    setSiteSettings(loadedSettings); setSavedSettings(loadedSettings);
    const selected = nextProperties.find((property) => property.id === initialHouseId);
    if (selected) { const loadedDraft = normalizeProperty(selected); setDraft(loadedDraft); setSavedDraft(loadedDraft); }
    }
    if (role === "super_admin") {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setAdminUsers((data.users ?? []) as AdminUser[]);
      else throw new Error(data.error || "Could not load admin users.");
    }
    setSelectedId((current) => current && nextProperties.some((property) => property.id === current) ? current : "");
    hasLoadedRef.current = true; setLoaded(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not load workspace data. Retry to continue."); setLoadFailed(true); } finally { setLoading(false); }
  };

  /* The initial load intentionally runs after hydration in this client dashboard. */
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => { void load(); }, []);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  const editProperty = (property: Row) => { const next = normalizeProperty(property); setSelectedId(property.id); setDraft(next); setSavedDraft(next); setTab("houses"); };
  const newProperty = () => { setSelectedId(""); setDraft(emptyProperty()); setSavedDraft(emptyProperty()); setTab("houses"); };

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
      bed_arrangements: asBeds(draft.bed_arrangements).map(room=>({...room,beds:roomBedLabel(room)})),
      ...(roomTotals(asBeds(draft.bed_arrangements)) ?? {}), house_rules: houseRules, nearby_locations: nearbyLocations, published,
    };
    for (const key of ["id", "created_at", "updated_at", "amenities", "amenity_details", "reviews", "date_prices"]) delete payload[key];
    try {
      await validateOnServer("property", { ...payload, date_prices: datePrices, amenities, available_property_count: properties.length || 1 });
      // Check metadata support before changing anything, and retain IDs for existing labels.
      const existingAmenities = await supabase.from("amenities").select("id, name, catalog_id, icon_id, amenity_group").eq("property_id", selectedId || "00000000-0000-0000-0000-000000000000");
      if (existingAmenities.error) throw new Error("Could not load amenity metadata. Confirm migration 0019 is installed, then retry. No house changes were saved.");
      const result = selectedId ? await supabase.from("properties").update(payload).eq("id", selectedId).select("*").single() : await supabase.from("properties").insert(payload).select("*").single();
      if (result.error) throw result.error;
      const propertyId = result.data?.id ?? selectedId;
      if (propertyId) {
        const removedDates = asDatePrices(properties.find(property => property.id === propertyId)?.date_prices).filter(price => !datePrices.some(current => current.price_date === price.price_date)).map(price => price.price_date);
        if (removedDates.length) { const removed = await supabase.from("property_date_prices").delete().eq("property_id", propertyId).in("price_date", removedDates); if (removed.error) throw removed.error; }
        if (datePrices.length) {
          const saveDatePrices = await supabase.from("property_date_prices").upsert(datePrices.map((price) => ({ property_id: propertyId, price_date: price.price_date, nightly_price: price.nightly_price, label: price.label, is_active: price.is_active !== false })), { onConflict: "property_id,price_date" });
          if (saveDatePrices.error) throw saveDatePrices.error;
        }
        const amenityRows = normalizeAmenities(amenities, draft.amenity_details).map((a, index) => ({ id: existingAmenities.data?.find((row: Row) => row.name.trim().toLowerCase() === a.label.toLowerCase())?.id ?? crypto.randomUUID(), property_id: propertyId, name: a.label, catalog_id: a.id, icon_id: a.icon, amenity_group: a.group, display_order: index + 1 }));
        if (amenityRows.length) {
          const upsert = await supabase.from("amenities").upsert(amenityRows, { onConflict: "id" });
          if (upsert.error) throw upsert.error;
        }
        const removedAmenities = (existingAmenities.data ?? []).filter((row: Row) => !amenityRows.some(a => a.id === row.id)).map((row: Row) => row.id);
        if (removedAmenities.length) {
          const remove = await supabase.from("amenities").delete().eq("property_id", propertyId).in("id", removedAmenities);
          if (remove.error) throw remove.error;
        }
      }
      const saved = { ...draft, ...payload, id: propertyId }; setDraft(saved); setSavedDraft(saved);
      notify(published ? "House published." : "House draft saved.");
      await load();
      if (propertyId) { setSelectedId(propertyId); if (initialNewHouse) router.replace(`/admin/houses/${propertyId}`); }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save house content.");
    } finally { setSaving(false); }
  };

  const deleteProperty = async () => {
    if (!selectedId || !await confirm("Delete this house and all of its images? This cannot be undone.")) return;
    setSaving(true);
    try {
      const paths = images.filter((image) => image.property_id === selectedId && image.storage_path).map((image) => image.storage_path);
      if (paths.length) await supabase.storage.from("property-images").remove(paths);
      const result = await supabase.from("properties").delete().eq("id", selectedId);
      if (result.error) throw result.error;
      setDraft(emptyProperty()); setSavedDraft(emptyProperty()); setSelectedId(""); notify("House deleted."); router.push("/admin?tab=houses");
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Could not delete house."); } finally { setSaving(false); }
  };

  const saveHomepageSection = async (section: HomepageSectionKey, published: boolean) => {
    setSaving(true);
    const sectionFields: Record<HomepageSectionKey, string[]> = {
      hero: ["hero_heading", "hero_subtitle", "hero_cta_label", "hero_cta_href", "hero_image_caption"],
      search: [],
      featured: ["featured_heading", "featured_description"],
      benefits: ["benefits_heading", "benefits_description", "benefits"],
      corporate: ["corporate_heading", "corporate_description", "corporate_cta_label", "corporate_cta_href"],
      location: ["location_heading", "location_description"],
      faqs: ["faq_heading", "faq_description", "faqs"],
      cta: ["final_cta_heading", "final_cta_description", "final_cta_primary_label", "final_cta_primary_href", "final_cta_secondary_label", "final_cta_secondary_href"],
    };
    const content: Row = { ...homepageSource };
    for (const key of ["intro_eyebrow", "intro_heading", "intro_lead", "intro_body", "intro_cta_label", "intro_cta_href", "intro_art_label", "intro_art_heading", "intro_art_card", "intro_image_1", "intro_image_1_path", "intro_image_2", "intro_image_2_path"]) {
      delete content[key];
    }
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
      setSavedHomepage((current) => ({ ...current, ...Object.fromEntries(sectionFields[section].map((key) => [key, homepage[key as keyof HomepageDraft]])) }));
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
      setSiteSettings(cleaned); setSavedSettings(cleaned); notify("Site settings saved.");
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
    if (!await confirm("Convert this approved corporate enquiry into bookings for every selected house?")) return;
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
    { id: "overview", label: "Overview", description: "At a glance", icon: BarChart3 },
    { id: "homepage", label: "Homepage", description: "Edit landing content", icon: Home },
    { id: "houses", label: "Houses", description: "Content, pricing, photos", icon: Building2 },
    { id: "reviews", label: "Reviews", description: "Guest feedback", icon: Star },
    { id: "promotions", label: "Promotions", description: "Voucher campaigns", icon: Tag },
    { id: "bookings", label: "Bookings", description: "Reservations and status", icon: CalendarDays },
    { id: "calendar", label: "Calendar", description: "External availability", icon: CalendarRange },
    { id: "enquiries", label: "Enquiries", description: "Corporate requests", icon: MessageSquare },
    { id: "contacts", label: "Contacts", description: "Customer messages", icon: Mail },
    ...(role === "super_admin" ? [{ id: "users" as Tab, label: "Users", description: "Access and roles", icon: UsersRound }] : []),
    { id: "settings", label: "Settings", description: "Locale and contact", icon: Settings },
  ];

  const activeNavItem = navItems.find((item) => item.id === tab) ?? navItems[0];
  const handleNavigation = (id: Tab) => { if (id === tab && !initialHouseId && !initialNewHouse) { setMobileDrawerOpen(false); return; } void navigate(() => {
    setMobileDrawerOpen(false); setHomepage(savedHomepage); setSiteSettings(savedSettings);
    router.push(id === "overview" ? "/admin" : `/admin?tab=${id}`, { scroll: false });
  }); };
  const logout = () => navigate(() => { void supabase.auth.signOut().then(() => router.replace("/admin/login")); });

  return (
    <main className="admin-shell"><a className="admin-skip-link" href="#admin-content">Skip to content</a>
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
            <div className="admin-header-context"><p className="admin-header-brand-name">Workspace /</p><h1>{activeNavItem.label}</h1><p className="admin-header-description">{activeNavItem.description}</p></div>
          </div>
          <div className="admin-header-actions"><AdminThemeToggle />
            <div className="admin-datetime" aria-label="Current date and time in Melbourne, Australia">
              <Clock3 className="admin-datetime-icon" size={16} aria-hidden="true" />
              <span className="admin-datetime-copy">
                <span className="admin-datetime-label">Melbourne time</span>
                <time className="admin-datetime-full" dateTime={melbourneNow?.toISOString()}>{melbourneNow ? formatMelbourneDateTime(melbourneNow) : "Loading…"}</time>
                <time className="admin-datetime-compact" dateTime={melbourneNow?.toISOString()}>{melbourneNow ? formatMelbourneCompactDateTime(melbourneNow) : "Loading…"}</time>
              </span>
            </div>
            <div className="admin-profile-menu" ref={profileMenuRef}>
              <button type="button" className="admin-profile-trigger" aria-label="Open profile menu" aria-haspopup="dialog" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((current) => !current)}>
                <span className="admin-profile-trigger-avatar" aria-hidden="true">{email.trim().charAt(0).toUpperCase() || "S"}</span>
                <span className="admin-profile-trigger-copy">
                  <strong>Serenity admin</strong>
                  <small>{role.replace("_", " ")}</small>
                </span>
                <ChevronDown className="admin-profile-trigger-chevron" size={16} aria-hidden="true" />
              </button>
              {profileMenuOpen && (
                <div className="admin-profile-dropdown" role="dialog" aria-label="Profile menu">
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
                  <button type="button" className="admin-profile-logout" onClick={() => { setProfileMenuOpen(false); void logout(); }}>Log out</button>
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
        <section id="admin-content" tabIndex={-1} className="admin-content" aria-busy={loading}>
          {message && <div className="admin-notice is-success" role="status"><CheckCircle2 size={18} />{message}</div>}
          {error && <div className="admin-notice is-error" role="alert"><X size={18} /><span>{error}</span>{loadFailed && <button type="button" className="admin-button" onClick={() => void load()}>Retry</button>}</div>}
          {loading ? <div className="admin-card admin-loading-state" role="status"><LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> <span>Loading your CMS workspace…</span></div> : loadFailed && !loaded ? <div className="admin-card p-8"><h2>Workspace unavailable</h2><p className="mt-2 text-[var(--admin-muted)]">Your records could not be loaded. Use Retry above to try again.</p></div> : tab === "overview" ? <Overview properties={properties} enquiries={enquiries} bookings={bookings} calendarEvents={calendarEvents} calendarConnections={calendarConnections} onNavigate={handleNavigation} /> : tab === "homepage" ? <HomepageSectionsEditor baseline={savedHomepage} homepage={homepage} setHomepage={setHomepage} published={homepagePublished} saveSection={saveHomepageSection} saving={saving} properties={properties} toggleFeatured={toggleFeaturedProperty} /> : tab === "houses" ? <HouseEditor dirty={houseDirty} properties={properties} draft={draft} setDraft={setDraft} selectedId={selectedId} editProperty={editProperty} newProperty={newProperty} saveProperty={saveProperty} deleteProperty={deleteProperty} saving={saving} images={images} reload={load} notify={notify} onError={setError} initialNewHouse={initialNewHouse} isDetailPage={Boolean(initialHouseId || initialNewHouse)} openHouse={(propertyId: string) => void navigate(() => router.push(`/admin/houses/${propertyId}`))} openNewHouse={() => void navigate(() => router.push("/admin/houses/new"))} onBackToHouses={() => void navigate(() => router.push("/admin?tab=houses"))} /> : tab === "reviews" ? <ReviewManager properties={properties} reviews={reviews} createReview={createReview} updateReview={updateReview} deleteReview={deleteReview} /> : tab === "promotions" ? <AdminPromotions properties={properties as unknown as Array<{ id: string; name: string }>} /> : tab === "bookings" ? <AdminReservationsManager bookings={bookings} enquiries={enquiries} calendarEvents={calendarEvents} properties={properties} reload={load} notify={notify} onError={setError} convertEnquiry={convertEnquiry} updateEnquiryStatus={setEnquiryStatus} openCalendar={() => handleNavigation("calendar")} /> : tab === "calendar" ? <CalendarSyncManager /> : tab === "enquiries" ? <EnquiryManager enquiries={enquiries} updateStatus={setEnquiryStatus} updateNotes={setEnquiryNotes} convert={convertEnquiry} /> : tab === "contacts" ? <ContactManager contacts={contactMessages} unavailable={contactMessagesUnavailable} updateStatus={setContactStatus} updateNotes={setContactNotes} /> : tab === "users" && role === "super_admin" ? <AdminUserManager users={adminUsers} currentUserEmail={email} createUser={createAdminUser} updateUser={updateAdminUser} deleteUser={deleteAdminUser} /> : <SettingsPanel email={email} settings={siteSettings} setSettings={setSiteSettings} save={saveSettings} saving={saving} />}
        </section>
      </div>
      {mobileDrawerOpen && <AdminDialog label="Admin navigation" className="admin-mobile-navigation" drawer onClose={() => setMobileDrawerOpen(false)}><div><div className="admin-sidebar"><div className="admin-sidebar-top"><strong>Workspace</strong><button type="button" className="admin-sidebar-close" aria-label="Close navigation" onClick={() => setMobileDrawerOpen(false)}><X size={18} /></button></div><AdminNavigation items={navItems} active={tab} collapsed={false} onSelect={handleNavigation} /></div></div></AdminDialog>}
    </main>
  );
}
