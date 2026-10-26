"use client";

import { useDirtyGuard } from "@/src/components/admin/AdminUI";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { PUBLIC_PAGE_MEDIA, defaultPublicPageMedia, normalizePublicPageMedia, type PublicPageMedia, type PublicPageMediaKey } from "@/src/lib/publicPageMedia";
import { ExternalLink, ImageIcon, LoaderCircle, RotateCcw, Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CharacterField, PageHeader } from "./AdminFields";

const PAGE_LINKS: Record<string, string> = {
  About: "/about",
  "Corporate Stays": "/corporate-stays",
  Contact: "/contact",
  "How It Works": "/how-it-works",
};

const GROUPS = [...new Set(Object.values(PUBLIC_PAGE_MEDIA).map((item) => item.page))];
const OTHER_EDITORS = [
  { label: "Homepage", href: "/admin?tab=homepage" },
  { label: "Homes and property pages", href: "/admin?tab=houses" },
  { label: "Guest Information", href: "/admin?tab=guest-information" },
  { label: "Other Businesses", href: "/admin?tab=other-businesses" },
  { label: "Contact details", href: "/admin?tab=contact-page" },
];

export function PublicPageMediaEditor() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [draft, setDraft] = useState<PublicPageMedia>(defaultPublicPageMedia);
  const [saved, setSaved] = useState<PublicPageMedia>(defaultPublicPageMedia);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<PublicPageMediaKey | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useDirtyGuard(dirty || saving || uploading !== null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error: loadError } = await supabase.from("site_settings").select("value").eq("key", "public_page_media").maybeSingle();
      if (!active) return;
      if (loadError) setError(loadError.message);
      else {
        const media = normalizePublicPageMedia(data?.value);
        setDraft(media);
        setSaved(media);
        setLoaded(true);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [supabase]);

  const update = (key: PublicPageMediaKey, changes: Partial<PublicPageMedia[PublicPageMediaKey]>) => {
    setDraft((current) => ({ ...current, [key]: { ...current[key], ...changes } }));
    setMessage("");
  };

  const upload = async (key: PublicPageMediaKey, file: File | undefined) => {
    if (!file || uploading || saving) return;
    setError(""); setMessage(""); setUploading(key);
    try {
      const response = await fetch("/api/admin/page-media/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: key, fileName: file.name, contentType: file.type, size: file.size }),
      });
      const details = await response.json();
      if (!response.ok || !details.path || !details.token || !details.publicUrl) throw new Error(details.error || "Could not prepare the upload.");
      const result = await supabase.storage.from("property-images").uploadToSignedUrl(details.path, details.token, file, { contentType: file.type });
      if (result.error) throw result.error;
      update(key, { src: details.publicUrl, alt: "" });
      setMessage("Image uploaded. Add a description, then save and publish to show it on the page.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The image could not be uploaded.");
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (!dirty || saving || uploading) return;
    const missingDescription = (Object.keys(PUBLIC_PAGE_MEDIA) as PublicPageMediaKey[]).find((key) => draft[key].src !== PUBLIC_PAGE_MEDIA[key].src && !draft[key].alt.trim());
    if (missingDescription) { setError(`Add an image description for ${PUBLIC_PAGE_MEDIA[missingDescription].page}: ${PUBLIC_PAGE_MEDIA[missingDescription].label}.`); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const media = normalizePublicPageMedia(draft);
      const { error: saveError } = await supabase.from("site_settings").upsert({ key: "public_page_media", value: media, is_public: true }, { onConflict: "key" });
      if (saveError) throw saveError;
      setDraft(media);
      setSaved(media);
      setMessage("Page images published. Refresh the public page to see them.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not publish the images.");
    } finally {
      setSaving(false);
    }
  };

  return <section id="page-content-images">
    <PageHeader eyebrow="Content" title="Page content" description="Replace editorial photos and edit page text. House and homepage photos stay in their existing editors." />
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Page content sections"><a href="#page-content-images" className="admin-button">Page images</a><a href="#page-content-text" className="admin-button">Page text</a></nav>
    {error && <p className="admin-notice is-error mb-5" role="alert">{error}</p>}
    {message && <p className="admin-notice mb-5" role="status">{message}</p>}
    <div className="admin-card mb-6 p-5"><p className="mb-3 text-sm font-semibold">Images managed in other sections</p><div className="flex flex-wrap gap-2">{OTHER_EDITORS.map((item) => <Link key={item.href} href={item.href} className="admin-button">{item.label}</Link>)}</div></div>
    {loading ? <div className="admin-card flex items-center gap-2 p-6" role="status"><LoaderCircle size={18} className="animate-spin" /> Loading page images…</div> : !loaded ? <div className="admin-card p-6"><p>Saved page images could not be loaded.</p><button type="button" className="admin-button mt-4" onClick={() => window.location.reload()}>Retry</button></div> : <>
      <div className="grid gap-6">
        {GROUPS.map((page) => <section key={page} className="admin-card bg-[var(--admin-surface)] p-5 sm:p-7" aria-labelledby={`page-media-${page.replace(/\s+/g, "-").toLowerCase()}`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-4"><div><h2 id={`page-media-${page.replace(/\s+/g, "-").toLowerCase()}`} className="text-xl font-semibold">{page}</h2><p className="mt-1 text-sm text-[var(--admin-muted)]">Choose the photos and descriptions guests see on this page.</p></div><Link href={PAGE_LINKS[page]} target="_blank" rel="noopener noreferrer" className="admin-button"><ExternalLink size={15} /> View page</Link></div>
          <div className="grid gap-5 lg:grid-cols-2">
            {(Object.keys(PUBLIC_PAGE_MEDIA) as PublicPageMediaKey[]).filter((key) => PUBLIC_PAGE_MEDIA[key].page === page).map((key) => <article key={key} className="overflow-hidden rounded-xl border border-[var(--admin-border)]">
              <div className="relative aspect-[16/9] bg-[var(--admin-surface-alt)]">{draft[key].src ? <Image src={draft[key].src} alt={draft[key].alt} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" unoptimized /> : <div className="flex h-full items-center justify-center text-[var(--admin-muted)]"><ImageIcon size={24} /></div>}</div>
              <div className="grid gap-3 p-4"><div><h3 className="font-semibold">{PUBLIC_PAGE_MEDIA[key].label}</h3><p className="mt-1 text-xs text-[var(--admin-muted)]">{draft[key].src === PUBLIC_PAGE_MEDIA[key].src ? "Showing the current default image" : "Custom image selected"}</p></div>
                <CharacterField label="Image description" value={draft[key].alt} onChange={(alt) => update(key, { alt })} limit={180} help="Used by screen readers and when the image cannot load." />
                <div className="flex flex-wrap gap-2"><label className="admin-button admin-button-primary cursor-pointer"><Upload size={15} /> {uploading === key ? "Uploading…" : "Upload / replace"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={uploading !== null || saving} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void upload(key, file); }} /></label><button type="button" className="admin-button" disabled={uploading !== null || saving || draft[key].src === PUBLIC_PAGE_MEDIA[key].src} onClick={() => update(key, { src: PUBLIC_PAGE_MEDIA[key].src, alt: PUBLIC_PAGE_MEDIA[key].alt })}><RotateCcw size={15} /> Restore default</button></div>
              </div>
            </article>)}
          </div>
        </section>)}
      </div>
      <div className="admin-card mt-6 flex flex-wrap items-center justify-between gap-4 p-5"><p className="text-sm text-[var(--admin-muted)]">{dirty ? "You have unpublished image changes." : "All page images are saved."}</p><button type="button" className="admin-button admin-button-primary" disabled={!dirty || saving || uploading !== null} onClick={() => void save()}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}{saving ? "Publishing…" : "Save and publish"}</button></div>
    </>}
  </section>;
}
