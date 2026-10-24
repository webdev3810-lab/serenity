"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, LoaderCircle, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CharacterField, PageHeader } from "./AdminFields";
import { useAdminWorkspace, useDirtyGuard } from "./AdminUI";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { HERO_IMAGE_MAX_BYTES, HERO_IMAGE_TYPES } from "@/src/lib/heroMedia";
import { DEFAULT_OTHER_BUSINESSES, normalizeOtherBusinesses, validateOtherBusinesses, type BusinessContent, type BusinessImage, type BusinessKey, type OtherBusinessesContent } from "@/src/lib/otherBusinessesContent";

const labels: Record<BusinessKey, string> = { airbnb: "Casa de Vacacion", specialistSuites: "Specialist Suites" };
const routes: Record<BusinessKey, string> = { airbnb: "/other-businesses/airbnb", specialistSuites: "/other-businesses/specialist-suites" };
const previewableImage = (src: string) => src.startsWith("/") && !src.startsWith("//") || /^https:\/\/(a0\.muscache\.com|[^/]+\.supabase\.co)\//.test(src);
const detailFields = [
  ["introEyebrow", "Small heading", 100], ["introTitle", "Main heading line 1", 100], ["introAccent", "Main heading line 2", 100], ["introDescription", "Introduction", 500], ["introPrimaryCta", "Explore button label", 80], ["introSecondaryCta", "Website button label", 80],
] as const;
const featureFields = [
  ["featureEyebrow", "Small heading", 100], ["featureTitle", "Feature heading line 1", 100], ["featureAccent", "Feature heading line 2", 100], ["featureLead", "Lead sentence", 200], ["featureSignoff", "Closing sentence", 200], ["featureCta", "Feature button label", 80], ["featureLocation", "Location", 180], ["featureImageNote", "Image disclosure or note", 500],
] as const;
const planFields = [
  ["planEyebrow", "Small heading", 100], ["planTitle", "Heading line 1", 100], ["planTitleSecond", "Heading line 2", 100], ["planDescription", "Description", 500], ["planCta", "Button label", 80], ["planDetailsEyebrow", "Location small heading", 100], ["planDetailsTitle", "Location heading", 100], ["planDetailsSubtitle", "Location subtitle", 100], ["planDetailsDescription", "Location description", 500],
] as const;

function EditorGroup({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="admin-card p-5 sm:p-7"><h3 className="text-lg font-semibold">{title}</h3>{description && <p className="mt-1 text-sm text-[var(--admin-muted)]">{description}</p>}<div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div></section>;
}

export function OtherBusinessesEditor() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { confirm } = useAdminWorkspace();
  const [draft, setDraft] = useState<OtherBusinessesContent>(() => structuredClone(DEFAULT_OTHER_BUSINESSES));
  const [baseline, setBaseline] = useState<OtherBusinessesContent>(() => structuredClone(DEFAULT_OTHER_BUSINESSES));
  const [revision, setRevision] = useState<string | null>(null);
  const [active, setActive] = useState<"hub" | BusinessKey>("hub");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useDirtyGuard(dirty || saving || Boolean(uploading));

  const load = useCallback(async (signal?: AbortSignal) => {
    setError("");
    try {
      const response = await fetch("/api/admin/other-businesses", { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load Other Businesses.");
      if (signal?.aborted) return;
      const content = normalizeOtherBusinesses(data.content);
      setDraft(content); setBaseline(content); setRevision(data.revision ?? null); setLoaded(true);
    } catch (failure) { if (!signal?.aborted) setError(failure instanceof Error ? failure.message : "Could not load Other Businesses."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  // Load this editor after hydration, as with the other admin content panels.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  const updateHub = (key: keyof OtherBusinessesContent["hub"], value: string) => setDraft((current) => ({ ...current, hub: { ...current.hub, [key]: value } }));
  const updateBusiness = (key: BusinessKey, changes: Partial<BusinessContent>) => setDraft((current) => ({ ...current, businesses: { ...current.businesses, [key]: { ...current.businesses[key], ...changes } } }));

  const save = async () => {
    const errors = validateOtherBusinesses(draft);
    if (errors.length) { setError(errors.join(" ")); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/other-businesses", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: draft, revision }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not publish Other Businesses.");
      const content = normalizeOtherBusinesses(data.content);
      setDraft(content); setBaseline(content); setRevision(data.revision ?? null);
      setMessage("Other Businesses published. The listing and both detail pages are updated.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not publish Other Businesses."); }
    finally { setSaving(false); }
  };

  const reload = async () => {
    if (dirty && !await confirm({ title: "Reload saved content?", description: "This discards your unsaved Other Businesses edits.", confirmLabel: "Reload saved content", destructive: true })) return;
    setLoading(true); setMessage(""); await load();
  };

  const upload = async (id: string, file: File | undefined, onChange: (url: string) => void) => {
    if (!file || uploading || saving) return;
    if (!(HERO_IMAGE_TYPES as readonly string[]).includes(file.type) || !file.size || file.size > HERO_IMAGE_MAX_BYTES) { setError("Choose a JPG, PNG, WebP or AVIF image up to 5 MB."); return; }
    setUploading(id); setError(""); setMessage("");
    try {
      const bitmap = await createImageBitmap(file); bitmap.close();
      const response = await fetch("/api/admin/other-businesses/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }) });
      const data = await response.json();
      if (!response.ok || !data.path || !data.token || !data.publicUrl) throw new Error(data.error || "Could not prepare image upload.");
      const result = await supabase.storage.from("property-images").uploadToSignedUrl(data.path, data.token, file, { contentType: file.type });
      if (result.error) throw new Error(result.error.message);
      onChange(data.publicUrl);
      setMessage("Image uploaded. Publish to show it on the public page.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not upload the image."); }
    finally { setUploading(""); }
  };

  const imageEditor = (id: string, title: string, image: BusinessImage, onChange: (value: BusinessImage) => void) => <div key={id} className="min-w-0 rounded-xl border border-[var(--admin-border)] p-4 sm:col-span-2">
    <h4 className="font-semibold">{title}</h4>
    <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
      <div className="relative h-32 overflow-hidden rounded-lg bg-[var(--admin-surface-alt)]">{previewableImage(image.src) && <Image src={image.src} alt={image.alt || "Preview"} fill sizes="180px" className="object-cover" unoptimized />}</div>
      <div className="grid min-w-0 gap-3">
        <CharacterField label="Image URL" value={image.src} limit={500} onChange={(src) => onChange({ ...image, src })} help="Paste a local image path or upload a new image." />
        <label className="admin-button w-fit cursor-pointer"><Upload size={15} /> {uploading === id ? "Uploading…" : "Upload image"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={Boolean(uploading) || saving} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void upload(id, file, (src) => onChange({ ...image, src })); }} /></label>
      </div>
    </div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2"><CharacterField label="Alt text" value={image.alt} limit={240} onChange={(alt) => onChange({ ...image, alt })} /><CharacterField label="Caption or disclosure" value={image.label} limit={100} onChange={(label) => onChange({ ...image, label })} /></div>
  </div>;

  const business = active === "hub" ? null : draft.businesses[active];
  const update = (changes: Partial<BusinessContent>) => { if (active !== "hub") updateBusiness(active, changes); };
  return <div className="space-y-5">
    <PageHeader eyebrow="Other Businesses CMS" title="Edit other businesses" description="Manage the listing page and both business detail pages. Save and publish when your changes are ready." action={<Link href={active === "hub" ? "/other-businesses" : routes[active]} target="_blank" rel="noopener noreferrer" className="admin-button"><ExternalLink size={16} /> View page</Link>} />
    {error && <div className="admin-notice is-error" role="alert">{error}</div>}
    {message && <div className="admin-notice is-success" role="status">{message}</div>}
    {loading ? <div className="admin-card p-8 flex items-center gap-2" role="status"><LoaderCircle size={18} className="animate-spin" /> Loading content…</div> : !loaded ? <div className="admin-card p-8"><p>Content could not be loaded.</p><button type="button" className="admin-button mt-4" onClick={() => void reload()}>Retry</button></div> : <>
      <nav className="admin-view-tabs flex flex-wrap gap-2" aria-label="Other Businesses pages">{(["hub", "airbnb", "specialistSuites"] as const).map((key) => <button type="button" key={key} className={`admin-view-tab ${active === key ? "is-active" : ""}`} aria-current={active === key ? "page" : undefined} onClick={() => setActive(key)}>{key === "hub" ? "Listing page" : labels[key]}</button>)}</nav>
      <fieldset disabled={saving || Boolean(uploading)} className="space-y-5 min-w-0">
        {active === "hub" && <EditorGroup title="Listing page" description="The heading and introduction above the two business cards.">{([
          ["topline", "Top label", 100], ["category", "Category label", 100], ["title", "Page title", 100], ["description", "Introduction", 500], ["closingText", "Closing prompt", 100], ["closingCta", "Homes link label", 100],
        ] as const).map(([key, label, limit]) => <CharacterField key={key} label={label} value={draft.hub[key]} limit={limit} textarea={key === "description"} onChange={(value) => updateHub(key, value)} />)}</EditorGroup>}
        {business && <>
          <EditorGroup title="Listing card" description="This card appears on the Other Businesses listing page.">
            <CharacterField label="Business name" value={business.name} limit={180} onChange={(name) => update({ name })} /><CharacterField label="Location" value={business.cardLocation} limit={180} onChange={(cardLocation) => update({ cardLocation })} />
            <div className="sm:col-span-2"><CharacterField label="Card description" value={business.cardDescription} limit={800} textarea onChange={(cardDescription) => update({ cardDescription })} /></div>
            {business.cardFacts.map((fact, index) => <CharacterField key={index} label={`Card fact ${index + 1}`} value={fact} limit={140} onChange={(value) => update({ cardFacts: business.cardFacts.map((item, itemIndex) => itemIndex === index ? value : item) })} />)}
            <CharacterField label="Detail link label" value={business.cardCta} limit={80} onChange={(cardCta) => update({ cardCta })} /><CharacterField label="External link label" value={business.cardExternalCta} limit={80} onChange={(cardExternalCta) => update({ cardExternalCta })} />
            {imageEditor(`${active}-card`, "Card lead image", business.cardImage, (cardImage) => update({ cardImage }))}
          </EditorGroup>
          <EditorGroup title="Links" description="The booking or tour link is used for the main action on the detail page.">
            <CharacterField label="Website URL" value={business.externalUrl} limit={500} onChange={(externalUrl) => update({ externalUrl })} /><CharacterField label="Booking or tour URL" value={business.actionUrl} limit={500} onChange={(actionUrl) => update({ actionUrl })} />
          </EditorGroup>
          <EditorGroup title="Detail page introduction">{detailFields.map(([key, label, limit]) => <CharacterField key={key} label={label} value={business[key]} limit={limit} textarea={key === "introDescription"} onChange={(value) => update({ [key]: value })} />)}</EditorGroup>
          <EditorGroup title="Main feature">{featureFields.map(([key, label, limit]) => <CharacterField key={key} label={label} value={business[key]} limit={limit} textarea={key === "featureSignoff"} onChange={(value) => update({ [key]: value })} />)}
            {business.featureParagraphs.map((paragraph, index) => <div className="sm:col-span-2" key={index}><CharacterField label={`Feature paragraph ${index + 1}`} value={paragraph} limit={800} textarea onChange={(value) => update({ featureParagraphs: business.featureParagraphs.map((item, itemIndex) => itemIndex === index ? value : item) })} /></div>)}
            {imageEditor(`${active}-feature`, "Feature image", business.featureImage, (featureImage) => update({ featureImage }))}
          </EditorGroup>
          <EditorGroup title="At a glance">{business.facts.map((fact, index) => <div key={index} className="grid gap-3 rounded-xl border border-[var(--admin-border)] p-4"><strong>Fact {index + 1}</strong><CharacterField label="Title" value={fact.title} limit={120} onChange={(title) => update({ facts: business.facts.map((item, itemIndex) => itemIndex === index ? { ...item, title } : item) })} /><CharacterField label="Detail" value={fact.detail} limit={160} onChange={(detail) => update({ facts: business.facts.map((item, itemIndex) => itemIndex === index ? { ...item, detail } : item) })} /></div>)}</EditorGroup>
          <EditorGroup title="Photo gallery"><CharacterField label="Small heading" value={business.galleryEyebrow} limit={100} onChange={(galleryEyebrow) => update({ galleryEyebrow })} /><CharacterField label="Section title" value={business.galleryTitle} limit={180} onChange={(galleryTitle) => update({ galleryTitle })} /><div className="sm:col-span-2"><CharacterField label="Description" value={business.galleryDescription} limit={800} textarea onChange={(galleryDescription) => update({ galleryDescription })} /></div>
            {business.galleryImages.map((image, index) => imageEditor(`${active}-gallery-${index}`, `Gallery image ${index + 1}`, image, (value) => update({ galleryImages: business.galleryImages.map((item, itemIndex) => itemIndex === index ? value : item) })))}
            <div className="sm:col-span-2"><CharacterField label="Gallery disclosure" value={business.galleryDisclosure} limit={500} textarea onChange={(galleryDisclosure) => update({ galleryDisclosure })} /></div>
            {business.amenities.map((amenity, index) => <CharacterField key={index} label={`Feature label ${index + 1}`} value={amenity} limit={140} onChange={(value) => update({ amenities: business.amenities.map((item, itemIndex) => itemIndex === index ? value : item) })} />)}
          </EditorGroup>
          <EditorGroup title="Explore section"><CharacterField label="Small heading" value={business.exploreEyebrow} limit={100} onChange={(exploreEyebrow) => update({ exploreEyebrow })} /><CharacterField label="Section title" value={business.exploreTitle} limit={180} onChange={(exploreTitle) => update({ exploreTitle })} /><div className="sm:col-span-2"><CharacterField label="Description" value={business.exploreDescription} limit={800} textarea onChange={(exploreDescription) => update({ exploreDescription })} /></div><CharacterField label="Image caption" value={business.exploreCaption} limit={180} onChange={(exploreCaption) => update({ exploreCaption })} /><CharacterField label="Explore link label" value={business.exploreCta} limit={180} onChange={(exploreCta) => update({ exploreCta })} /><CharacterField label="Explore URL" value={business.exploreUrl} limit={500} onChange={(exploreUrl) => update({ exploreUrl })} />
            {imageEditor(`${active}-explore`, "Explore image", business.exploreImage, (exploreImage) => update({ exploreImage }))}
            {business.exploreItems.map((item, index) => <div key={index} className="grid gap-3 rounded-xl border border-[var(--admin-border)] p-4"><strong>Item {index + 1}</strong><CharacterField label="Title" value={item.title} limit={120} onChange={(title) => update({ exploreItems: business.exploreItems.map((row, rowIndex) => rowIndex === index ? { ...row, title } : row) })} /><CharacterField label="Detail" value={item.detail} limit={160} onChange={(detail) => update({ exploreItems: business.exploreItems.map((row, rowIndex) => rowIndex === index ? { ...row, detail } : row) })} /></div>)}
          </EditorGroup>
          <EditorGroup title="Closing section">{planFields.map(([key, label, limit]) => <CharacterField key={key} label={label} value={business[key]} limit={limit} textarea={key === "planDescription" || key === "planDetailsDescription"} onChange={(value) => update({ [key]: value })} />)}</EditorGroup>
        </>}
      </fieldset>
      <div className="admin-card flex flex-wrap items-center justify-between gap-4 p-5"><p className="text-sm text-[var(--admin-muted)]">{dirty ? "You have unpublished changes." : "All changes are saved."}</p><div className="flex gap-2"><button type="button" className="admin-button" disabled={saving || Boolean(uploading)} onClick={() => void reload()}>Reload saved</button><button type="button" className="admin-button admin-button-primary" disabled={!dirty || saving || Boolean(uploading)} onClick={() => void save()}>{saving ? "Publishing…" : "Save and publish"}</button></div></div>
    </>}
  </div>;
}
