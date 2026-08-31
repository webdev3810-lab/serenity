"use client";

/* The CMS form intentionally handles flexible JSON-backed fields from Supabase. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BarChart3, Building2, CalendarDays, Home, Images, MessageSquare, Settings, Star, UsersRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { trimCmsText, validateCmsContent } from "@/src/lib/cmsValidation";

type AdminProperty = Record<string, any>;
type AdminImage = Record<string, any>;
type Enquiry = Record<string, any>;
type Booking = Record<string, any>;
type AdminUser = { user_id: string; email: string; role: "admin" | "editor" | "super_admin"; active: boolean; created_at: string };
type Tab = "overview" | "bookings" | "houses" | "homepage" | "images" | "enquiries" | "users" | "settings";
type BenefitDraft = { title: string; description: string };
type HomepageDraft = {
  hero_heading: string;
  hero_subtitle: string;
  hero_cta_label: string;
  hero_cta_href: string;
  section_heading: string;
  section_description: string;
  discount_heading: string;
  discount_description: string;
  corporate_heading: string;
  corporate_description: string;
  benefits: BenefitDraft[];
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const emptyProperty = (): AdminProperty => ({
  name: "", slug: "", property_type: "Entire furnished house", location: "Pakenham, Victoria, Australia", short_description: "", full_description: "",
  max_guests: 1, bedrooms: 1, beds: 1, bathrooms: 1, bed_arrangements: [], check_in_time: "3:00 PM", checkout_time: "11:00 AM",
  pet_policy: "", parking_type: "", nightly_price: 0, cleaning_fee: 0, pet_fee: 0, extra_guest_fee: 0, extra_guest_threshold: 1,
  minimum_stay: 1, weekly_discount: 0, monthly_discount: 0, house_rules: [], nearby_locations: [], unavailable_dates: [], latitude: -38.07, longitude: 145.48,
  published: false, featured: false, display_order: 0, listing_details: {}, reviews: [],
});

const emptySiteSettings = () => ({
  contact_email: "",
  phone: "",
  address: "Pakenham, Victoria, Australia",
  locale: "en-AU",
  timezone: "Australia/Melbourne",
  currency: "AUD",
  footer_text: "",
});

const emptyHomepage = (): HomepageDraft => ({
  hero_heading: "",
  hero_subtitle: "",
  hero_cta_label: "Browse Houses",
  hero_cta_href: "/houses",
  section_heading: "",
  section_description: "",
  discount_heading: "",
  discount_description: "",
  corporate_heading: "",
  corporate_description: "",
  benefits: [],
});

const commaList = (value: unknown) => Array.isArray(value) ? value.join(", ") : "";
const parseList = (value: string) => value.split(",").map((part) => part.trim()).filter(Boolean);

async function compressImage(file: File) {
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be no larger than 5 MB before upload.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser cannot process this image.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob || blob.size > MAX_IMAGE_BYTES) throw new Error("The optimised image is still larger than 5 MB.");
  return blob;
}

export function SupabaseAdminDashboard({ email, role }: { email: string; role: "admin" | "editor" | "super_admin" }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [images, setImages] = useState<AdminImage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<AdminProperty>(emptyProperty());
  const [homepage, setHomepage] = useState<HomepageDraft>(emptyHomepage());
  const [homepageSourceContent, setHomepageSourceContent] = useState<Record<string, any>>({});
  const [homepagePublished, setHomepagePublished] = useState(false);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>(emptySiteSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedImages = images.filter((image) => image.property_id === selectedId).sort((a, b) => a.display_order - b.display_order);

  const load = async () => {
    setLoading(true);
    setError("");
    const [propertyResult, imageResult, amenityResult, reviewResult, bookingResult, enquiryResult, homepageResult, settingsResult] = await Promise.all([
      supabase.from("properties").select("*").order("display_order"),
      supabase.from("property_images").select("*").order("display_order"),
      supabase.from("amenities").select("*").order("display_order").limit(500),
      supabase.from("property_reviews").select("*").eq("rating", 5).order("display_order"),
      supabase.from("bookings").select("id, reference, property_id, check_in, checkout, total, currency, payment_status, booking_status, guest_details, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("enquiries").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("homepage_content").select("content, published").eq("page_key", "home").maybeSingle(),
      supabase.from("site_settings").select("key, value").eq("key", "site").maybeSingle(),
    ]);
    if (propertyResult.error || imageResult.error || amenityResult.error || bookingResult.error || enquiryResult.error || settingsResult.error) setError(propertyResult.error?.message || imageResult.error?.message || amenityResult.error?.message || bookingResult.error?.message || enquiryResult.error?.message || settingsResult.error?.message || "Could not load CMS data.");
    const amenityRows = (amenityResult.data ?? []) as AdminProperty[];
    const reviewRows = reviewResult.error ? [] : ((reviewResult.data ?? []) as AdminProperty[]);
    const nextProperties: AdminProperty[] = ((propertyResult.data ?? []) as AdminProperty[]).map((property) => ({
      ...property,
      amenities: amenityRows.filter((amenity) => amenity.property_id === property.id).sort((a, b) => a.display_order - b.display_order).map((amenity) => amenity.name),
      reviews: reviewRows.filter((review) => review.property_id === property.id).sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0)),
    }));
    setProperties(nextProperties);
    setImages((imageResult.data ?? []) as AdminImage[]);
    setBookings((bookingResult.data ?? []) as Booking[]);
    setEnquiries((enquiryResult.data ?? []) as Enquiry[]);
    const content = (homepageResult.data?.content ?? {}) as Record<string, any>;
    const firstSection = Array.isArray(content.sections) && content.sections[0] && typeof content.sections[0] === "object" ? content.sections[0] : {};
    const benefits = Array.isArray(content.benefits)
      ? content.benefits.map((benefit: any) => ({ title: String(benefit?.title ?? ""), description: String(benefit?.description ?? "") }))
      : [];
    setHomepageSourceContent(content);
    setHomepage({
      hero_heading: content.hero_heading ?? "",
      hero_subtitle: content.hero_subtitle ?? "",
      hero_cta_label: content.hero_cta_label ?? "Browse Houses",
      hero_cta_href: content.hero_cta_href ?? "/houses",
      section_heading: content.section_heading ?? firstSection.heading ?? "",
      section_description: content.section_description ?? firstSection.description ?? "",
      discount_heading: content.discount_heading ?? "",
      discount_description: content.discount_description ?? "",
      corporate_heading: content.corporate_heading ?? "",
      corporate_description: content.corporate_description ?? "",
      benefits,
    });
    setHomepagePublished(Boolean(homepageResult.data?.published));
    setSiteSettings({ ...emptySiteSettings(), ...((settingsResult.data?.value ?? {}) as Record<string, string>) });
    if (role === "super_admin") {
      const usersResponse = await fetch("/api/admin/users", { cache: "no-store" });
      const usersData = await usersResponse.json();
      if (!usersResponse.ok) setError(usersData.error || "Could not load admin users.");
      else setAdminUsers((usersData.users ?? []) as AdminUser[]);
    }
    setSelectedId((current) => current || nextProperties[0]?.id || "");
    setLoading(false);
  };

  // The initial request synchronises this client UI with Supabase after hydration.
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => { void load(); }, []);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  const notify = (text: string) => { setMessage(text); setError(""); window.setTimeout(() => setMessage(""), 3500); };

  const validateOnServer = async (scope: "property" | "homepage" | "settings", payload: Record<string, unknown>) => {
    const localErrors = validateCmsContent(scope, payload);
    if (localErrors.length) throw new Error(localErrors.join(" "));
    const response = await fetch("/api/admin/cms/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, payload }),
    });
    const data = await response.json();
    if (!response.ok || data.valid === false) throw new Error((data.errors ?? [data.error ?? "Content validation failed."]).join(" "));
  };

  const editProperty = (property: AdminProperty) => { setSelectedId(property.id); setDraft({ ...property }); setTab("houses"); };
  const newProperty = () => { setSelectedId(""); setDraft(emptyProperty()); setTab("houses"); };

  const saveProperty = async (event: React.FormEvent, requestedPublished?: boolean) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.slug.trim()) { setError("Name and slug are required."); return; }
    setSaving(true);
    const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter as HTMLButtonElement | null : null;
    const published = typeof requestedPublished === "boolean" ? requestedPublished : submitter?.value === "publish" ? true : submitter?.value === "draft" ? false : Boolean(draft.published);
    const draftAmenities = draft.amenities;
    const amenityNames = (typeof draftAmenities === "string" ? parseList(draftAmenities) : Array.isArray(draftAmenities) ? draftAmenities : []).map((name) => String(name).trim()).filter(Boolean);
    const houseRules = (typeof draft.house_rules === "string" ? parseList(draft.house_rules) : Array.isArray(draft.house_rules) ? draft.house_rules : []).map((item) => String(item).trim()).filter(Boolean);
    const nearbyLocations = (typeof draft.nearby_locations === "string" ? parseList(draft.nearby_locations) : Array.isArray(draft.nearby_locations) ? draft.nearby_locations : []).map((item) => String(item).trim()).filter(Boolean);
    let parsedBedArrangements: unknown = draft.bed_arrangements;
    let parsedListingDetails: unknown = draft.listing_details;
    try {
      if (typeof draft.bed_arrangements === "string") parsedBedArrangements = JSON.parse(draft.bed_arrangements || "[]");
      if (typeof draft.listing_details === "string") parsedListingDetails = JSON.parse(draft.listing_details || "{}");
    } catch {
      setSaving(false);
      setError("The saved house details are invalid. Please contact an administrator before editing this house.");
      return;
    }
    const payload: any = {
      ...draft,
      name: String(trimCmsText(draft.name)), slug: draft.slug.trim().toLowerCase(), published,
      short_description: String(trimCmsText(draft.short_description)), full_description: String(trimCmsText(draft.full_description)),
      pet_policy: String(trimCmsText(draft.pet_policy)), parking_type: String(trimCmsText(draft.parking_type)),
      bed_arrangements: parsedBedArrangements, listing_details: parsedListingDetails,
      house_rules: houseRules, nearby_locations: nearbyLocations,
    };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.amenities;
    delete payload.reviews;
    try {
      await validateOnServer("property", { ...payload, amenities: amenityNames });
    } catch (validationError) {
      setSaving(false);
      setError(validationError instanceof Error ? validationError.message : "Please review the house content limits.");
      return;
    }
    const result = selectedId ? await supabase.from("properties").update(payload).eq("id", selectedId).select("*").single() : await supabase.from("properties").insert(payload).select("*").single();
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    const propertyId = result.data?.id ?? selectedId;
    if (propertyId) {
      const removeAmenities = await supabase.from("amenities").delete().eq("property_id", propertyId);
      if (removeAmenities.error) { setError(removeAmenities.error.message); setSaving(false); return; }
      if (amenityNames.length) {
        const addAmenities = await supabase.from("amenities").insert(amenityNames.map((name: string, index: number) => ({ property_id: propertyId, name, display_order: index + 1 })));
        if (addAmenities.error) { setError(addAmenities.error.message); setSaving(false); return; }
      }
    }
    notify("House saved.");
    await load();
    if (result.data?.id) setSelectedId(result.data.id);
  };

  const deleteProperty = async () => {
    if (!selectedId || !window.confirm("Delete this house and all of its images? This cannot be undone.")) return;
    const paths = images.filter((image) => image.property_id === selectedId && image.storage_path).map((image) => image.storage_path);
    if (paths.length) await supabase.storage.from("property-images").remove(paths);
    const result = await supabase.from("properties").delete().eq("id", selectedId);
    if (result.error) { setError(result.error.message); return; }
    notify("House deleted."); setDraft(emptyProperty()); setSelectedId(""); await load();
  };

  const saveHomepage = async (nextPublished = homepagePublished) => {
    setSaving(true);
    const oldSections = Array.isArray(homepageSourceContent.sections) ? homepageSourceContent.sections : [];
    const sections = homepage.section_heading || homepage.section_description
      ? [{ ...(oldSections[0] && typeof oldSections[0] === "object" ? oldSections[0] : {}), heading: String(trimCmsText(homepage.section_heading)), description: String(trimCmsText(homepage.section_description)) }, ...oldSections.slice(1)]
      : oldSections;
    const content = {
      ...homepageSourceContent,
      hero_heading: String(trimCmsText(homepage.hero_heading)),
      hero_subtitle: String(trimCmsText(homepage.hero_subtitle)),
      hero_cta_label: String(trimCmsText(homepage.hero_cta_label)),
      hero_cta_href: String(trimCmsText(homepage.hero_cta_href)),
      section_heading: String(trimCmsText(homepage.section_heading)),
      section_description: String(trimCmsText(homepage.section_description)),
      discount_heading: String(trimCmsText(homepage.discount_heading)),
      discount_description: String(trimCmsText(homepage.discount_description)),
      corporate_heading: String(trimCmsText(homepage.corporate_heading)),
      corporate_description: String(trimCmsText(homepage.corporate_description)),
      benefits: homepage.benefits.map((benefit) => ({ title: String(trimCmsText(benefit.title)), description: String(trimCmsText(benefit.description)) })),
      sections,
    };
    try {
      await validateOnServer("homepage", content);
    } catch (validationError) {
      setSaving(false);
      setError(validationError instanceof Error ? validationError.message : "Please review the homepage content limits.");
      return;
    }
    const result = await supabase.from("homepage_content").upsert({ page_key: "home", content, published: nextPublished }, { onConflict: "page_key" });
    setSaving(false);
    if (result.error) setError(result.error.message);
    else { setHomepageSourceContent(content); setHomepagePublished(nextPublished); notify(nextPublished ? "Homepage published." : "Homepage draft saved."); }
  };

  const saveSettings = async (nextSettings: Record<string, string> | React.FormEvent = siteSettings) => {
    setSaving(true);
    const isFormEvent = "preventDefault" in nextSettings && typeof nextSettings.preventDefault === "function";
    const settingsToSave = isFormEvent ? siteSettings : nextSettings;
    if (isFormEvent) (nextSettings as React.FormEvent).preventDefault();
    const cleanedSettings = Object.fromEntries(Object.entries(settingsToSave).map(([key, value]) => [key, String(trimCmsText(value))]));
    try {
      await validateOnServer("settings", cleanedSettings);
    } catch (validationError) {
      setSaving(false);
      setError(validationError instanceof Error ? validationError.message : "Please review the site settings limits.");
      return;
    }
    const result = await supabase.from("site_settings").upsert({ key: "site", value: cleanedSettings, is_public: true }, { onConflict: "key" });
    setSaving(false);
    if (result.error) setError(result.error.message); else { setSiteSettings(cleanedSettings); notify("Site settings saved."); }
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || !selectedId) return;
    try {
      setSaving(true); setError("");
      const blob = await compressImage(file);
      const urlResponse = await fetch("/api/admin/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId: selectedId, fileName: `${file.name.replace(/\.[^.]+$/, "")}.webp`, size: blob.size, contentType: "image/webp" }) });
      const uploadDetails = await urlResponse.json();
      if (!urlResponse.ok) throw new Error(uploadDetails.error || "Could not prepare upload.");
      const upload = await supabase.storage.from("property-images").uploadToSignedUrl(uploadDetails.path, uploadDetails.token, blob);
      if (upload.error) throw upload.error;
      const insert = await supabase.from("property_images").insert({ property_id: selectedId, storage_path: uploadDetails.path, alt_text: file.name.replace(/\.[^.]+$/, ""), display_order: selectedImages.length + 1 });
      if (insert.error) throw insert.error;
      notify("Image compressed and uploaded."); await load();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally { setSaving(false); }
  };

  const deleteImage = async (image: AdminImage) => {
    if (!window.confirm("Delete this image?")) return;
    if (image.storage_path) await supabase.storage.from("property-images").remove([image.storage_path]);
    const result = await supabase.from("property_images").delete().eq("id", image.id);
    if (result.error) setError(result.error.message); else { notify("Image deleted."); await load(); }
  };

  const updateImageAlt = async (image: AdminImage, altText: string) => {
    const result = await supabase.from("property_images").update({ alt_text: altText.trim() }).eq("id", image.id);
    if (result.error) setError(result.error.message); else { notify("Image alt text saved."); await load(); }
  };

  const reorderImage = async (image: AdminImage, direction: -1 | 1) => {
    const index = selectedImages.findIndex((item) => item.id === image.id);
    const other = selectedImages[index + direction];
    if (!other) return;
    await Promise.all([
      supabase.from("property_images").update({ display_order: other.display_order }).eq("id", image.id),
      supabase.from("property_images").update({ display_order: image.display_order }).eq("id", other.id),
    ]);
    await load();
  };

  const setEnquiryStatus = async (enquiry: Enquiry, status: string) => {
    const result = await supabase.from("enquiries").update({ status: status as "new" | "contacted" | "pending_approval" | "approved" | "declined" | "converted" }).eq("id", enquiry.id);
    if (result.error) setError(result.error.message); else { notify("Enquiry status updated."); await load(); }
  };

  const createAdminUser = async (newEmail: string, newRole: AdminUser["role"]) => {
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: newEmail, role: newRole }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not invite admin user.");
    notify("Invitation sent."); await load();
  };

  const updateAdminUser = async (userId: string, changes: { role?: AdminUser["role"]; active?: boolean }) => {
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

  const logout = async () => { await supabase.auth.signOut(); router.replace("/admin/login"); };

  const navItems: Array<{ id: Tab; label: string; description: string; icon: typeof BarChart3 }> = [
    { id: "overview", label: "Overview", description: "At a glance", icon: BarChart3 },
    { id: "homepage", label: "Homepage CMS", description: "Edit landing content", icon: Home },
    { id: "houses", label: "Houses", description: "Descriptions and pricing", icon: Building2 },
    { id: "images", label: "Images", description: "Photos and alt text", icon: Images },
    { id: "bookings", label: "Bookings", description: "Reservations and status", icon: CalendarDays },
    { id: "enquiries", label: "Enquiries", description: "Corporate requests", icon: MessageSquare },
    ...(role === "super_admin" ? [{ id: "users" as Tab, label: "Admin users", description: "Access and roles", icon: UsersRound }] : []),
    { id: "settings", label: "Site settings", description: "Locale and contact", icon: Settings },
  ];

  return (
    <main className="min-h-screen bg-[#F8F5F1] text-stone-900">
      <header className="border-b border-[#D8CCC4] bg-white px-4 py-5 text-stone-900 sm:px-8">
        <div className="mx-auto flex max-w-[96rem] items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8B6B55]">Serenity Stays CMS</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Admin workspace</h1>
            <p className="mt-1 text-sm text-stone-600">Manage your public website, houses, bookings, and team access.</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden rounded-none border border-[#D8CCC4] bg-[#F7F4F1] px-3 py-2 font-semibold text-stone-600 sm:inline">{role.replace("_", " ")}</span>
            <span className="hidden max-w-[14rem] truncate text-stone-600 lg:inline">{email}</span>
            <button className="min-h-11 rounded-none border border-[#5A463A] px-4 py-2 font-bold text-[#5A463A] transition hover:bg-[#F7F4F1]" onClick={logout}>Log out</button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[96rem] gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[220px_1fr]">
        <nav className="card h-fit bg-white p-3" aria-label="Admin sections">
          <p className="px-3 pb-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-stone-500">Workspace</p>
          <div className="grid gap-1">
            {navItems.map(({ id, label, description, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} className={`flex min-h-14 items-center gap-3 rounded-none px-3 py-2 text-left transition ${tab === id ? "bg-[#5A463A] text-white shadow-sm" : "text-stone-700 hover:bg-[#F7F4F1]"}`}>
                <Icon size={18} aria-hidden="true" />
                <span className="min-w-0"><span className="block text-sm font-bold">{label}</span><span className={`block text-xs ${tab === id ? "text-white/75" : "text-stone-500"}`}>{description}</span></span>
              </button>
            ))}
          </div>
        </nav>
        <section className="min-w-0">
          {message && <div className="mb-4 rounded-none border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{message}</div>}
          {error && <div className="mb-4 rounded-none border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
          {loading ? <div className="card bg-white p-8 text-sm text-stone-600">Loading CMS data…</div> : tab === "overview" ? <Overview properties={properties} enquiries={enquiries} images={images} bookings={bookings} /> : tab === "bookings" ? <BookingManager bookings={bookings} /> : tab === "houses" ? <HouseEditor properties={properties} draft={draft} setDraft={setDraft} selectedId={selectedId} editProperty={editProperty} newProperty={newProperty} saveProperty={saveProperty} deleteProperty={deleteProperty} saving={saving} /> : tab === "homepage" ? <HomepageEditor homepage={homepage} setHomepage={setHomepage} published={homepagePublished} setPublished={setHomepagePublished} save={saveHomepage} saving={saving} /> : tab === "images" ? <ImageManager properties={properties} selectedId={selectedId} setSelectedId={setSelectedId} images={selectedImages} upload={uploadImage} deleteImage={deleteImage} updateImageAlt={updateImageAlt} reorderImage={reorderImage} /> : tab === "enquiries" ? <EnquiryManager enquiries={enquiries} updateStatus={setEnquiryStatus} /> : tab === "users" && role === "super_admin" ? <AdminUserManager users={adminUsers} currentUserEmail={email} createUser={createAdminUser} updateUser={updateAdminUser} deleteUser={deleteAdminUser} /> : <SettingsPanel email={email} settings={siteSettings} setSettings={setSiteSettings} save={saveSettings} saving={saving} />}
        </section>
      </div>
    </main>
  );
}

function Overview({ properties, enquiries, images, bookings }: { properties: AdminProperty[]; enquiries: Enquiry[]; images: AdminImage[]; bookings: Booking[] }) {
  return <><Section title="Overview" subtitle="Content and booking operations backed by Supabase." /><div className="grid gap-4 sm:grid-cols-4"><Metric label="Houses" value={properties.length} /><Metric label="Published" value={properties.filter((property) => property.published).length} /><Metric label="Bookings" value={bookings.length} /><Metric label="New enquiries" value={enquiries.filter((enquiry) => enquiry.status === "new").length} /></div><div className="card mt-6 bg-white p-5 text-sm text-stone-600">The CMS currently manages {images.length} property images. Use Houses to publish content, Homepage to edit the hero, Images to upload compressed WebP media, and Enquiries to manage corporate leads.</div></>;
}

function HouseEditor({ properties, draft, setDraft, selectedId, editProperty, newProperty, saveProperty, deleteProperty, saving }: any) {
  const field = (key: string, value: unknown) => setDraft((current: AdminProperty) => ({ ...current, [key]: value }));
  return <><Section title="Houses" subtitle="Create, edit, publish, feature, reorder, and remove houses." /><div className="mb-5 flex flex-wrap gap-2">{properties.map((property: AdminProperty) => <button key={property.id} onClick={() => editProperty(property)} className={`rounded-none border px-3 py-2 text-xs font-bold ${selectedId === property.id ? "border-[#111111] bg-[#111111] text-white" : "border-stone-300 bg-white"}`}>{property.name}</button>)}<button onClick={newProperty} className="btn-secondary text-xs">+ New house</button></div><form onSubmit={saveProperty} className="card grid gap-4 bg-white p-6 md:grid-cols-2"><Input label="Name" value={draft.name} onChange={(value: string) => field("name", value)} /><Input label="Slug" value={draft.slug} onChange={(value: string) => field("slug", value)} /><Input label="Location" value={draft.location} onChange={(value: string) => field("location", value)} /><Input label="Property type" value={draft.property_type} onChange={(value: string) => field("property_type", value)} /><TextInput label="Short description" value={draft.short_description} onChange={(value: string) => field("short_description", value)} /><TextInput label="Full description" value={draft.full_description} onChange={(value: string) => field("full_description", value)} /><NumberInput label="Nightly price (AUD)" value={draft.nightly_price} onChange={(value: number) => field("nightly_price", value)} /><NumberInput label="Cleaning fee" value={draft.cleaning_fee} onChange={(value: number) => field("cleaning_fee", value)} /><NumberInput label="Pet fee" value={draft.pet_fee} onChange={(value: number) => field("pet_fee", value)} /><NumberInput label="Extra guest fee" value={draft.extra_guest_fee} onChange={(value: number) => field("extra_guest_fee", value)} /><NumberInput label="Max guests" value={draft.max_guests} onChange={(value: number) => field("max_guests", value)} /><NumberInput label="Bedrooms" value={draft.bedrooms} onChange={(value: number) => field("bedrooms", value)} /><NumberInput label="Beds" value={draft.beds} onChange={(value: number) => field("beds", value)} /><NumberInput label="Bathrooms" value={draft.bathrooms} onChange={(value: number) => field("bathrooms", value)} /><NumberInput label="Minimum stay" value={draft.minimum_stay} onChange={(value: number) => field("minimum_stay", value)} /><Input label="Check-in time" value={draft.check_in_time} onChange={(value: string) => field("check_in_time", value)} /><Input label="Checkout time" value={draft.checkout_time} onChange={(value: string) => field("checkout_time", value)} /><Input label="Pet policy" value={draft.pet_policy} onChange={(value: string) => field("pet_policy", value)} /><Input label="Parking" value={draft.parking_type} onChange={(value: string) => field("parking_type", value)} /><TextInput label="Amenities (comma separated)" value={commaList(draft.amenities)} onChange={(value: string) => field("amenities", value)} /><TextInput label="House rules (comma separated)" value={commaList(draft.house_rules)} onChange={(value: string) => field("house_rules", value)} /><TextInput label="Nearby locations (comma separated)" value={commaList(draft.nearby_locations)} onChange={(value: string) => field("nearby_locations", value)} /><TextInput label="Bed arrangements JSON" value={typeof draft.bed_arrangements === "string" ? draft.bed_arrangements : JSON.stringify(draft.bed_arrangements ?? [], null, 2)} onChange={(value: string) => field("bed_arrangements", value)} /><TextInput label="Listing details JSON" value={typeof draft.listing_details === "string" ? draft.listing_details : JSON.stringify(draft.listing_details ?? {}, null, 2)} onChange={(value: string) => field("listing_details", value)} /><div className="flex flex-wrap gap-4 text-xs font-bold md:col-span-2"><label><input type="checkbox" checked={Boolean(draft.published)} onChange={(event) => field("published", event.target.checked)} /> Published</label><label><input type="checkbox" checked={Boolean(draft.featured)} onChange={(event) => field("featured", event.target.checked)} /> Featured</label></div><div className="flex flex-wrap gap-3 md:col-span-2"><button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save house"}</button>{selectedId && <button type="button" className="btn-outline-dark text-red-700" onClick={deleteProperty}>Delete house</button>}</div></form>{selectedId && Array.isArray(draft.reviews) && draft.reviews.length ? <section className="card mt-6 bg-white p-6"><h3 className="section-heading text-stone-900">Guest reviews ({draft.reviews.length})</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{draft.reviews.map((review: AdminProperty) => <article key={review.id} className="rounded-none border border-[#D8CCC4] bg-white p-4 shadow-[0_8px_22px_rgba(90,70,58,0.07)]"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-stone-900">{review.reviewer_name}</p><p className="text-xs text-stone-500">{review.review_date_label || review.review_date || "Date not supplied"}</p></div><span className="flex items-center gap-0.5 text-amber-400" aria-label="5 out of 5 stars">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />)}</span></div><p className="mt-3 whitespace-pre-line rounded-none bg-[#F7F4F1] p-3 text-sm leading-relaxed text-stone-700">{review.review_text}</p><p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Airbnb · 5 / 5</p></article>)}</div></section> : null}</>;
}

function HomepageEditor({ homepage, setHomepage, published, setPublished, save, saving }: any) { return <><Section title="Homepage CMS" subtitle="Edit the published hero and section content without changing code." /><form onSubmit={save} className="card max-w-3xl space-y-4 bg-white p-6"><Input label="Hero heading" value={homepage.hero_heading} onChange={(value: string) => setHomepage({ ...homepage, hero_heading: value })} /><TextInput label="Homepage sections JSON" value={homepage.sections_json} onChange={(value: string) => setHomepage({ ...homepage, sections_json: value })} /><p className="text-xs text-stone-500">Use this for editable benefits and section blocks. Valid JSON is required.</p><label className="block text-xs font-bold"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Publish homepage changes</label><button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save homepage"}</button></form></>; }

function ImageManager({ properties, selectedId, setSelectedId, images, upload, deleteImage, updateImageAlt, reorderImage }: any) { return <><Section title="Images / media" subtitle="Images are compressed to WebP, resized, and capped at 5 MB before upload." /><div className="mb-5 flex flex-wrap gap-2">{properties.map((property: AdminProperty) => <button key={property.id} onClick={() => setSelectedId(property.id)} className={`rounded-none border px-3 py-2 text-xs font-bold ${selectedId === property.id ? "border-[#111111] bg-[#111111] text-white" : "border-stone-300 bg-white"}`}>{property.name}</button>)}</div>{selectedId ? <div className="card bg-white p-6"><label className="btn-primary inline-flex cursor-pointer text-xs">Upload image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={upload} /></label><p className="mt-2 text-xs text-stone-500">Maximum 5 MB. Images are resized to a 2,400 px long edge and uploaded as WebP.</p><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{images.map((image: AdminImage, index: number) => <div key={image.id} className="overflow-hidden rounded-none border border-stone-200"><div className="relative h-40 bg-stone-100">{image.storage_path ? <Image src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${image.storage_path}`} alt={image.alt_text} fill sizes="(max-width: 768px) 50vw, 250px" className="object-cover" /> : <Image src={image.external_url} alt={image.alt_text} width={800} height={500} sizes="(max-width: 768px) 50vw, 250px" className="h-full w-full object-cover" />}</div><div className="flex items-center justify-between gap-2 p-3"><input className="field min-w-0 flex-1 py-1 text-xs" aria-label="Image alt text" defaultValue={image.alt_text} onBlur={(event) => updateImageAlt(image, event.target.value)} /><div className="flex gap-1"><button type="button" disabled={!index} onClick={() => reorderImage(image, -1)} className="rounded-none bg-stone-100 px-2 py-1 text-xs">↑</button><button type="button" disabled={index === images.length - 1} onClick={() => reorderImage(image, 1)} className="rounded-none bg-stone-100 px-2 py-1 text-xs">↓</button><button type="button" onClick={() => deleteImage(image)} className="rounded-none bg-red-50 px-2 py-1 text-xs text-red-700">Delete</button></div></div></div>)}</div></div> : <div className="card bg-white p-6 text-sm text-stone-600">Select a house to manage images.</div>}</>; }

function BookingManager({ bookings }: { bookings: Booking[] }) { return <><Section title="Bookings" subtitle="Review recent reservations, dates, totals, and payment status." /><div className="card overflow-x-auto bg-white p-4"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-stone-200 text-stone-500"><th className="p-3">Reference</th><th className="p-3">Guest</th><th className="p-3">Dates</th><th className="p-3">Total</th><th className="p-3">Payment</th><th className="p-3">Booking</th></tr></thead><tbody>{bookings.map((booking) => <tr key={String(booking.id)} className="border-b border-stone-100"><td className="p-3 font-bold">{booking.reference}</td><td className="p-3">{booking.guest_details?.firstName || "Guest"}<br />{booking.guest_details?.email || ""}</td><td className="p-3">{booking.check_in} to {booking.checkout}</td><td className="p-3 font-bold">{new Intl.NumberFormat("en-AU", { style: "currency", currency: booking.currency || "AUD", maximumFractionDigits: 0 }).format(Number(booking.total || 0))}</td><td className="p-3">{booking.payment_status}</td><td className="p-3">{booking.booking_status}</td></tr>)}</tbody></table>{!bookings.length && <p className="p-4 text-sm text-stone-500">No bookings yet.</p>}</div></>; }

function EnquiryManager({ enquiries, updateStatus }: { enquiries: Enquiry[]; updateStatus: (enquiry: Enquiry, status: string) => void }) { return <><Section title="Corporate enquiries" subtitle="Review and update enquiries submitted by corporate guests." /><div className="card overflow-x-auto bg-white p-4"><table className="w-full min-w-[720px] text-left text-xs"><thead><tr className="border-b border-stone-200 text-stone-500"><th className="p-3">Company</th><th className="p-3">Contact</th><th className="p-3">Dates</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{enquiries.map((enquiry) => <tr key={String(enquiry.id)} className="border-b border-stone-100"><td className="p-3 font-bold">{enquiry.company_name}</td><td className="p-3">{enquiry.contact_name}<br />{enquiry.email}</td><td className="p-3">{enquiry.arrival || "—"} to {enquiry.departure || "—"}</td><td className="p-3">{enquiry.status}</td><td className="p-3"><select className="field py-1 text-xs" value={enquiry.status} onChange={(event) => updateStatus(enquiry, event.target.value)}><option>new</option><option>contacted</option><option>pending_approval</option><option>approved</option><option>declined</option></select></td></tr>)}</tbody></table>{!enquiries.length && <p className="p-4 text-sm text-stone-500">No enquiries yet.</p>}</div></>; }

function AdminUserManager({ users, currentUserEmail, createUser, updateUser, deleteUser }: { users: AdminUser[]; currentUserEmail: string; createUser: (email: string, role: AdminUser["role"]) => Promise<void>; updateUser: (userId: string, changes: { role?: AdminUser["role"]; active?: boolean }) => Promise<void>; deleteUser: (userId: string) => Promise<void> }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminUser["role"]>("admin");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setBusy("invite");
    try { await createUser(inviteEmail.trim(), inviteRole); setInviteEmail(""); setInviteRole("admin"); } catch (inviteError) { setError(inviteError instanceof Error ? inviteError.message : "Could not invite admin user."); } finally { setBusy(""); }
  };
  const changeRole = async (user: AdminUser, nextRole: AdminUser["role"]) => {
    if (nextRole === user.role) return;
    setError(""); setBusy(user.user_id);
    try { await updateUser(user.user_id, { role: nextRole }); } catch (roleError) { setError(roleError instanceof Error ? roleError.message : "Could not update role."); } finally { setBusy(""); }
  };
  const toggleActive = async (user: AdminUser) => {
    if (user.active && !window.confirm(`Deactivate ${user.email}? They will not be able to access the admin panel.`)) return;
    setError(""); setBusy(user.user_id);
    try { await updateUser(user.user_id, { active: !user.active }); } catch (statusError) { setError(statusError instanceof Error ? statusError.message : "Could not update status."); } finally { setBusy(""); }
  };
  const removeUser = async (user: AdminUser) => {
    if (!window.confirm(`Remove ${user.email} permanently? This also removes their admin access.`)) return;
    setError(""); setBusy(user.user_id);
    try { await deleteUser(user.user_id); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Could not remove admin user."); } finally { setBusy(""); }
  };
  return <><Section title="Admin users" subtitle="Only active super_admin users can invite, edit, deactivate, or remove administrators." /><form onSubmit={submit} className="card mb-6 flex flex-col gap-3 bg-white p-5 md:flex-row md:items-end"><label className="block flex-1 text-xs font-bold">Invite by email<input className="field mt-1" type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="team@example.com" /></label><label className="block text-xs font-bold">Role<select className="field mt-1" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as AdminUser["role"])}><option value="admin">Admin</option><option value="editor">Editor</option><option value="super_admin">Super admin</option></select></label><button className="btn-primary" disabled={busy === "invite"}>{busy === "invite" ? "Inviting…" : "Send invitation"}</button></form>{error && <p className="mb-4 rounded-none border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}<div className="card overflow-x-auto bg-white p-4"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-stone-200 text-stone-500"><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3">Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user.user_id} className="border-b border-stone-100"><td className="p-3 font-bold">{user.email}{user.email === currentUserEmail && <span className="ml-2 rounded-none bg-stone-100 px-2 py-1 text-[10px] font-normal">You</span>}</td><td className="p-3"><select className="field py-1 text-xs" value={user.role} disabled={busy === user.user_id} onChange={(event) => void changeRole(user, event.target.value as AdminUser["role"])}><option value="admin">Admin</option><option value="editor">Editor</option><option value="super_admin">Super admin</option></select></td><td className="p-3"><span className={`rounded-none px-2 py-1 text-[10px] font-bold ${user.active ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>{user.active ? "Active" : "Inactive"}</span></td><td className="p-3">{new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeZone: "Australia/Melbourne" }).format(new Date(user.created_at))}</td><td className="p-3"><div className="flex gap-2"><button type="button" className="rounded-none border border-stone-300 px-2 py-1 font-bold" disabled={busy === user.user_id} onClick={() => void toggleActive(user)}>{user.active ? "Deactivate" : "Activate"}</button><button type="button" className="rounded-none border border-red-200 px-2 py-1 font-bold text-red-700" disabled={busy === user.user_id} onClick={() => void removeUser(user)}>Remove</button></div></td></tr>)}</tbody></table>{!users.length && <p className="p-4 text-sm text-stone-500">No admin users found.</p>}</div></>;
}

function SettingsPanel({ email, settings, setSettings, save, saving }: { email: string; settings: Record<string, string>; setSettings: (value: Record<string, string>) => void; save: (event: React.FormEvent) => void; saving: boolean }) { const field = (key: string, value: string) => setSettings({ ...settings, [key]: value }); return <><Section title="Site settings" subtitle="Manage public contact details and Australian locale defaults." /><form onSubmit={save} className="card max-w-2xl space-y-4 bg-white p-6"><Input label="Contact email" value={settings.contact_email} onChange={(value: string) => field("contact_email", value)} /><Input label="Phone" value={settings.phone} onChange={(value: string) => field("phone", value)} /><Input label="Address" value={settings.address} onChange={(value: string) => field("address", value)} /><Input label="Locale" value={settings.locale} onChange={(value: string) => field("locale", value)} /><Input label="Timezone" value={settings.timezone} onChange={(value: string) => field("timezone", value)} /><Input label="Currency" value={settings.currency} onChange={(value: string) => field("currency", value)} /><button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button></form><div className="card mt-4 max-w-2xl bg-white p-6 text-sm text-stone-700"><p><strong>Signed in as:</strong> {email}</p><p className="mt-2"><strong>Storage:</strong> property-images bucket with a 5 MB server-enforced limit.</p></div></>; }
function Section({ title, subtitle }: { title: string; subtitle: string }) { return <div className="mb-6"><h2 className="section-heading">{title}</h2><p className="mt-2 text-base leading-relaxed text-stone-600">{subtitle}</p></div>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="card bg-white p-5"><p className="text-sm font-bold uppercase tracking-wider text-stone-500">{label}</p><p className="mt-2 text-4xl font-extrabold">{value}</p></div>; }
function Input({ label, value, onChange }: { label: string; value: unknown; onChange: (value: string) => void }) { return <label className="block text-sm font-bold">{label}<input className="field mt-1" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} /></label>; }
function LegacyLinkSelect({ value, onChange }: { value: unknown; onChange: (value: string) => void }) { const current = String(value ?? "/houses"); const links = [{ value: "/", label: "Homepage" }, { value: "/houses", label: "Houses" }, { value: "/corporate-stays", label: "Corporate stays" }, { value: "/about", label: "About Serenity" }, { value: "/long-term-stays", label: "Long-term stays" }, { value: "/booking", label: "Booking" }, { value: "/#faqs", label: "FAQs" }, { value: "/contact", label: "Contact" }, { value: "/terms", label: "Terms and conditions" }, { value: "/privacy", label: "Privacy policy" }]; const options = links.some((link) => link.value === current) ? links : [{ value: current, label: `Current saved link (${current})` }, ...links]; return <label className="block text-sm font-bold">Button destination<select className="field mt-1" value={current} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><span className="mt-1 block text-xs font-normal text-stone-500">Choose the page guests should visit when they select this button.</span></label>; }
function TextInput({ label, value, onChange }: { label: string; value: unknown; onChange: (value: string) => void }) { return <label className="block text-sm font-bold md:col-span-2">{label}<textarea className="field mt-1 min-h-24" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} /></label>; }
function NumberInput({ label, value, onChange }: { label: string; value: unknown; onChange: (value: number) => void }) { return <label className="block text-sm font-bold">{label}<input className="field mt-1" type="number" step="0.1" value={Number(value ?? 0)} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
