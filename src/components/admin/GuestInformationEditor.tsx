"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Globe2, ImageIcon, LoaderCircle, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { DEFAULT_GUEST_INFORMATION, GUEST_IMAGE_SLOTS, GUEST_TEXT_LIMITS, isGuestImageSource, normalizeGuestInformation, validateGuestInformation, type GuestImageSlot, type GuestInformationContent, type GuestPageImage } from "@/src/lib/guestInformation";
import { HERO_IMAGE_MAX_BYTES, HERO_IMAGE_TYPES, HERO_MEDIA_BUCKET } from "@/src/lib/heroMedia";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import type { PropertyImage } from "@/src/data/properties";
import { CharacterField, FormGroup, PageHeader } from "./AdminFields";
import type { Row } from "./AdminModels";
import { useAdminWorkspace, useDirtyGuard } from "./AdminUI";

const imageLabels: Record<GuestImageSlot, string> = { hero: "Page header image", checkIn: "Self check-in card image", houseRules: "House rules card image" };
const copyFields: Array<{ key: keyof typeof GUEST_TEXT_LIMITS; label: string; textarea?: boolean }> = [
  { key: "heroKicker", label: "Small heading" }, { key: "title", label: "Page title" }, { key: "titleAccent", label: "Second title line" },
  { key: "description", label: "Page introduction", textarea: true }, { key: "promiseText", label: "Stay promise", textarea: true },
  { key: "jumpLabel", label: "Guide navigation label" }, { key: "introKicker", label: "Introduction small heading" },
  { key: "introTitle", label: "Introduction heading" }, { key: "introText", label: "Introduction text", textarea: true },
  { key: "homeCareCaption", label: "Home care illustration caption" },
];

export function GuestInformationEditor({ images, properties }: { images: Row[]; properties: Row[] }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { confirm } = useAdminWorkspace();
  const [draft, setDraft] = useState(() => normalizeGuestInformation(null));
  const [baseline, setBaseline] = useState(() => normalizeGuestInformation(null));
  const [revision, setRevision] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Partial<Record<GuestImageSlot, string>>>({});
  const [automaticImages, setAutomaticImages] = useState<Partial<Record<GuestImageSlot, PropertyImage>>>({});
  const [active, setActive] = useState("headings");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<GuestImageSlot | "">("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const objectUrls = useRef<string[]>([]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useDirtyGuard(dirty || Boolean(uploading) || saving);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/admin/guest-information", { cache: "no-store", signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load guest information.");
      if (signal?.aborted) return;
      const content = normalizeGuestInformation(result.content);
      setDraft(content); setBaseline(content); setRevision(result.revision ?? null);
      setPreviews(result.previews ?? {}); setAutomaticImages(result.automaticImages ?? {}); setLoaded(true);
    } catch (failure) {
      if (!signal?.aborted) setError(failure instanceof Error ? failure.message : "Could not load guest information.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  // Load this editor's saved content after hydration; state updates follow the fetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  useEffect(() => () => { objectUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  const update = <K extends keyof GuestInformationContent>(key: K, value: GuestInformationContent[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateImage = (slot: GuestImageSlot, image: GuestPageImage) => setDraft((current) => ({ ...current, images: { ...current.images, [slot]: image } }));
  const updateCard = (id: string, changes: Partial<GuestInformationContent["cards"][number]>) => setDraft((current) => ({ ...current, cards: current.cards.map((card) => card.id === id ? { ...card, ...changes } : card) }));

  const gallery = images.filter((image) => image.is_visible !== false && !image.is_placeholder && image.category !== "floor-plan" && properties.some((property) => property.id === image.property_id && property.published)).map((image) => ({
    src: image.storage_path ? supabase.storage.from("property-images").getPublicUrl(String(image.storage_path)).data.publicUrl : String(image.external_url || ""),
    label: `${properties.find((property) => property.id === image.property_id)?.name || "House"} · ${image.alt_text || image.category_label || "Property photo"}`,
  })).filter((image) => isGuestImageSource(image.src));

  const upload = async (slot: GuestImageSlot, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || uploading || saving) return;
    setError(""); setMessage("");
    if (!(HERO_IMAGE_TYPES as readonly string[]).includes(file.type) || !file.size || file.size > HERO_IMAGE_MAX_BYTES) { setError("Choose a JPG, PNG, WebP or AVIF image up to 5 MB."); return; }
    setUploading(slot);
    try {
      const bitmap = await createImageBitmap(file); bitmap.close();
      const response = await fetch("/api/admin/guest-information/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }) });
      const result = await response.json();
      if (!response.ok || !result.path || !result.token) throw new Error(result.error || "Could not prepare image upload.");
      const uploaded = await supabase.storage.from(HERO_MEDIA_BUCKET).uploadToSignedUrl(result.path, result.token, file, { contentType: file.type });
      if (uploaded.error) throw new Error(uploaded.error.message);
      const preview = URL.createObjectURL(file); objectUrls.current.push(preview);
      setPreviews((current) => ({ ...current, [slot]: preview }));
      updateImage(slot, { mode: "custom", storagePath: result.path, src: "", alt: draft.images[slot].alt });
      setMessage("Image uploaded. Save and publish to update the guest page.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The image could not be uploaded."); }
    finally { setUploading(""); }
  };

  const save = async () => {
    const errors = validateGuestInformation(draft);
    if (errors.length) { setError(errors.join(" ")); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/guest-information", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: draft, revision }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not publish guest information.");
      const content = normalizeGuestInformation(result.content);
      setDraft(content); setBaseline(content); setRevision(result.revision ?? null);
      setMessage("Guest information published. The text and images are now updated on the guest page.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not publish guest information."); }
    finally { setSaving(false); }
  };

  const reload = async () => {
    if (dirty && !await confirm({ title: "Reload saved guide?", description: "This discards your unsaved text and image selections and loads the published guide.", confirmLabel: "Reload saved guide", destructive: true })) return;
    setLoading(true); setError(""); setMessage("");
    await load();
  };

  const sections = [{ id: "headings", title: "Headings & introduction" }, ...DEFAULT_GUEST_INFORMATION.cards.map((card) => ({ id: card.id, title: card.title })), { id: "images", title: "Page images" }];
  const selectedCard = draft.cards.find((card) => card.id === active);

  return <div className="space-y-5">
    <PageHeader eyebrow="Guest Information CMS" title="Edit your guest guide" description="Update the page headings, policies, house rules and images guests see before their stay." action={<Link href="/guest-information" target="_blank" rel="noopener noreferrer" className="admin-button"><ExternalLink size={16} /> View guest page</Link>} />
    {error && <div className="admin-notice is-error" role="alert">{error}</div>}
    {message && <div className="admin-notice is-success" role="status">{message}</div>}
    {loading ? <div className="admin-card p-8 flex items-center gap-2" role="status"><LoaderCircle size={18} className="animate-spin" /> Loading guest guide…</div> : !loaded ? <div className="admin-card p-8"><p>The saved guide could not be loaded.</p><button type="button" className="admin-button mt-4" onClick={() => void reload()}>Retry</button></div> : <>
      <div className="homepage-cms-grid"><nav className="homepage-cms-tabs" aria-label="Guest guide sections">{sections.map((section) => <button type="button" key={section.id} className={`homepage-cms-tab ${active === section.id ? "is-active" : ""}`} aria-current={active === section.id ? "page" : undefined} onClick={() => setActive(section.id)}>{section.title}</button>)}</nav>
        <section className="admin-card homepage-cms-panel bg-[var(--admin-surface)] p-5 sm:p-7">
          <h3 className="border-b border-[var(--admin-border)] pb-5 text-xl font-semibold">{sections.find((section) => section.id === active)?.title}</h3>
          <fieldset disabled={saving || Boolean(uploading)} className="mt-6 grid min-w-0 gap-5">
            {active === "headings" && <>
              <div className="grid gap-5 sm:grid-cols-2">{copyFields.map(({ key, label, textarea }) => <CharacterField key={key} label={label} value={draft[key]} onChange={(value) => update(key, value)} limit={GUEST_TEXT_LIMITS[key]} textarea={textarea} />)}</div>
              <FormGroup title="Stay promise labels" description="These three labels appear alongside the page introduction.">{draft.promiseLabels.map((label, index) => <CharacterField key={index} label={`Promise label ${index + 1}`} value={label} limit={60} onChange={(value) => update("promiseLabels", draft.promiseLabels.map((item, i) => i === index ? value : item))} />)}</FormGroup>
            </>}
            {selectedCard && <>
              <div className="grid gap-4 sm:grid-cols-2"><CharacterField label="Card heading" value={selectedCard.title} limit={100} onChange={(title) => updateCard(selectedCard.id, { title })} /><CharacterField label="Card subtitle" value={selectedCard.eyebrow} limit={160} onChange={(eyebrow) => updateCard(selectedCard.id, { eyebrow })} /></div>
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-semibold">Guide points</h4><p className="mt-1 text-sm text-[var(--admin-muted)]">Edit, add or reorder the points in this card.</p></div><button type="button" className="admin-button" disabled={selectedCard.items.length >= 20} onClick={() => updateCard(selectedCard.id, { items: [...selectedCard.items, ""] })}><Plus size={16} /> Add point</button></div>
              {selectedCard.items.map((item, index) => <div key={index} className="rounded-xl border border-[var(--admin-border)] p-4"><div className="mb-2 flex justify-end gap-1">{[-1, 1].map((direction) => <button key={direction} type="button" className="admin-icon-button" aria-label={`Move point ${index + 1} ${direction < 0 ? "up" : "down"}`} disabled={index + direction < 0 || index + direction >= selectedCard.items.length} onClick={() => { const items = [...selectedCard.items]; [items[index], items[index + direction]] = [items[index + direction], items[index]]; updateCard(selectedCard.id, { items }); }}>{direction < 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>)}<button type="button" className="admin-icon-button" aria-label={`Remove point ${index + 1}`} disabled={selectedCard.items.length === 1} onClick={() => updateCard(selectedCard.id, { items: selectedCard.items.filter((_, i) => i !== index) })}><Trash2 size={16} /></button></div><CharacterField label={`Point ${index + 1}`} value={item} limit={600} textarea onChange={(value) => updateCard(selectedCard.id, { items: selectedCard.items.map((point, i) => i === index ? value : point) })} /></div>)}
              {(selectedCard.id === "self-check-in" || selectedCard.id === "house-rules") && <button type="button" className="admin-button justify-self-start" onClick={() => setActive("images")}><ImageIcon size={16} /> Change this card’s image</button>}
            </>}
            {active === "images" && <><p className="text-sm text-[var(--admin-muted)]">Change the header photo and the photos below the Self Check-In and House Rules cards. Upload an image or choose a published house photo. Images update after Save and publish.</p>{GUEST_IMAGE_SLOTS.map((slot) => {
              const image = draft.images[slot];
              const src = image.mode === "hidden" ? "" : image.mode === "automatic" ? automaticImages[slot]?.src : image.storagePath ? previews[slot] : image.src;
              const selectedGallerySource = image.mode === "custom" && image.src ? image.src : "";
              return <section key={slot} className="grid min-w-0 gap-4 rounded-xl border border-[var(--admin-border)] p-4 sm:p-5"><h4 className="font-semibold">{imageLabels[slot]}</h4><div className="relative h-52 overflow-hidden rounded-lg bg-[var(--admin-surface-alt)] sm:h-64">{src ? <Image src={src} alt={image.alt || imageLabels[slot]} fill className="object-cover" sizes="(max-width: 768px) 100vw, 700px" unoptimized /> : <div className="flex h-full items-center justify-center gap-2 text-sm text-[var(--admin-muted)]"><ImageIcon size={20} /> {image.mode === "hidden" ? "Image hidden" : "No image selected"}</div>}</div><div className="flex flex-wrap gap-2"><label className="admin-button admin-button-primary cursor-pointer"><Upload size={16} /> {uploading === slot ? "Uploading…" : "Upload / replace image"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => void upload(slot, event)} disabled={Boolean(uploading) || saving} /></label><button type="button" className="admin-button" onClick={() => updateImage(slot, { mode: "automatic", src: "", storagePath: "", alt: image.alt })}><RotateCcw size={16} /> Use automatic photo</button><button type="button" className="admin-button" onClick={() => updateImage(slot, { mode: "hidden", src: "", storagePath: "", alt: image.alt })}><Trash2 size={16} /> Hide image</button></div><p className="text-sm text-[var(--admin-muted)]">JPG, PNG, WebP or AVIF · up to 5 MB</p><label className="text-sm font-medium">Choose a house photo<select className="admin-field mt-1" value={selectedGallerySource} onChange={(event) => { if (event.target.value) updateImage(slot, { mode: "custom", src: event.target.value, storagePath: "", alt: image.alt }); }}><option value="">Select a published house photo…</option>{selectedGallerySource && !gallery.some((photo) => photo.src === selectedGallerySource) && <option value={selectedGallerySource}>Current saved photo</option>}{gallery.map((photo, index) => <option value={photo.src} key={`${photo.src}-${index}`}>{photo.label}</option>)}</select></label><CharacterField label={`${imageLabels[slot]} description`} value={image.alt} limit={180} onChange={(alt) => updateImage(slot, { ...image, alt })} help="Describe the photo for guests using screen readers." /></section>;
            })}</>}
          </fieldset>
        </section>
      </div>
      <div className="admin-card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5"><div><p className="font-medium">{dirty ? "You have unpublished changes" : "Guide is up to date"}</p><p className="mt-1 text-sm text-[var(--admin-muted)]">Save all guide text and image changes together.</p></div><div className="flex flex-wrap gap-2"><button type="button" className="admin-button" disabled={saving || Boolean(uploading)} onClick={() => void reload()}><RotateCcw size={16} /> Reload saved</button><button type="button" className="admin-button admin-button-primary" disabled={saving || Boolean(uploading) || !dirty} onClick={() => void save()}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Globe2 size={16} />}{saving ? "Publishing…" : "Save and publish"}</button></div></div>
    </>}
  </div>;
}
