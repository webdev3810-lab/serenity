"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, LoaderCircle, RotateCcw, Save } from "lucide-react";
import { useDirtyGuard } from "./AdminUI";
import { CharacterField, PageHeader } from "./AdminFields";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { PUBLIC_PAGE_COPY_FIELDS, defaultPublicPageCopy, normalizePublicPageCopy, type PublicPageCopy, type PublicPageCopyKey } from "@/src/lib/publicPageCopy";

const GROUPS = [...new Set(PUBLIC_PAGE_COPY_FIELDS.map((field) => field.page))];
const PAGE_LINKS: Record<string, string> = {
  About: "/about",
  "Corporate Stays": "/corporate-stays",
  Contact: "/contact",
  "How It Works": "/how-it-works",
  Homes: "/homes",
  "Long Term Stays": "/long-term-stays",
};

export function PublicPageCopyEditor() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [draft, setDraft] = useState<PublicPageCopy>(defaultPublicPageCopy);
  const [saved, setSaved] = useState<PublicPageCopy>(defaultPublicPageCopy);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useDirtyGuard(dirty || saving);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error: loadError } = await supabase.from("site_settings").select("value").eq("key", "public_page_copy").maybeSingle();
      if (!active) return;
      if (loadError) setError(loadError.message);
      else {
        const copy = normalizePublicPageCopy(data?.value);
        setDraft(copy);
        setSaved(copy);
        setLoaded(true);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [supabase]);

  const update = (key: PublicPageCopyKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setMessage("");
  };

  const save = async () => {
    if (!dirty || saving) return;
    const blank = PUBLIC_PAGE_COPY_FIELDS.find((field) => !draft[field.key].trim());
    if (blank) { setError(`Add text for ${blank.page}: ${blank.label}.`); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const copy = normalizePublicPageCopy(draft);
      const { error: saveError } = await supabase.from("site_settings").upsert({ key: "public_page_copy", value: copy, is_public: true }, { onConflict: "key" });
      if (saveError) throw saveError;
      setDraft(copy);
      setSaved(copy);
      setMessage("Page text published. Refresh the public page to see it.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not publish page text.");
    } finally {
      setSaving(false);
    }
  };

  return <section id="page-content-text" className="mt-10 scroll-mt-6">
    <PageHeader eyebrow="Content" title="Page text" description="Edit the main headings and descriptions on public pages. Property details, guest guide text, FAQs, and contact information have their own admin sections." />
    {error && <p className="admin-notice is-error mb-5" role="alert">{error}</p>}
    {message && <p className="admin-notice is-success mb-5" role="status">{message}</p>}
    {loading ? <div className="admin-card flex items-center gap-2 p-6" role="status"><LoaderCircle size={18} className="animate-spin" /> Loading page text…</div> : !loaded ? <div className="admin-card p-6"><p>Saved page text could not be loaded.</p><button type="button" className="admin-button mt-4" onClick={() => window.location.reload()}>Retry</button></div> : <>
      <div className="grid gap-4">{GROUPS.map((page) => <details key={page} className="admin-card p-5 sm:p-6" open={page === "About"}>
        <summary className="cursor-pointer text-lg font-semibold">{page}</summary>
        <div className="mt-5 flex justify-end"><Link href={PAGE_LINKS[page]} target="_blank" rel="noopener noreferrer" className="admin-button"><ExternalLink size={15} /> View page</Link></div>
        <div className="mt-4 grid gap-5 md:grid-cols-2">{PUBLIC_PAGE_COPY_FIELDS.filter((field) => field.page === page).map((field) => <div key={field.key} className={field.value.length > 100 || field.value.includes("\n") ? "md:col-span-2" : ""}>
          <CharacterField label={field.label} value={draft[field.key]} onChange={(value) => update(field.key, value)} limit={1000} textarea={field.value.length > 100 || field.value.includes("\n")} />
          {draft[field.key] !== field.value && <button type="button" className="mt-1 inline-flex items-center gap-1 text-xs underline" onClick={() => update(field.key, field.value)}><RotateCcw size={12} /> Restore default</button>}
        </div>)}</div>
      </details>)}</div>
      <div className="admin-card mt-6 flex flex-wrap items-center justify-between gap-4 p-5"><p className="text-sm text-[var(--admin-muted)]">{dirty ? "You have unpublished text changes." : "All page text is saved."}</p><button type="button" className="admin-button admin-button-primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{saving ? "Publishing…" : "Save and publish text"}</button></div>
    </>}
  </section>;
}
