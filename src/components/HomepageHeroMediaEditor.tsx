"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Film, Globe2, ImagePlus, LoaderCircle, Trash2, Upload, X } from "lucide-react";
import {
  HERO_IMAGE_MAX_BYTES,
  HERO_IMAGE_TYPES,
  HERO_MEDIA_MAX_ITEMS,
  HERO_VIDEO_MAX_BYTES,
  HERO_VIDEO_TYPES,
  validateHeroMediaFile,
} from "@/src/lib/heroMedia";

type HeroMediaItem = {
  id: string;
  storage_path: string;
  public_url: string;
  preview_url?: string;
  media_type: "image" | "video";
  mime_type: string;
  file_size: number;
  alt_text: string;
  caption: string;
  display_order: number;
  active: boolean;
};

type UploadState = { name: string; progress: number };

const formatBytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(bytes >= 1024 * 1024 ? 1 : 2)} MB`;

function uploadWithProgress(signedUrl: string, file: File, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", signedUrl);
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("Cache-Control", "31536000");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 90));
    };
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("Supabase Storage rejected the upload."));
    request.onerror = () => reject(new Error("The direct upload connection was interrupted."));
    request.onabort = () => reject(new Error("The upload was cancelled."));
    request.send(file);
  });
}

export default function HomepageHeroMediaEditor({ onChange }: { onChange?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<HeroMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [publishing, setPublishing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/hero-media", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load hero media.");
      setMedia((data.media ?? []) as HeroMediaItem[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load hero media.");
    } finally {
      setLoading(false);
    }
  };

  /* The editor synchronizes its initial state with the authenticated API. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { void load(); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const validateFiles = (files: File[]) => {
    if (!files.length) return "Choose at least one image or video.";
    if (files.length > HERO_MEDIA_MAX_ITEMS - media.length) return `You can add ${HERO_MEDIA_MAX_ITEMS - media.length} more hero media item${HERO_MEDIA_MAX_ITEMS - media.length === 1 ? "" : "s"}.`;
    for (const file of files) {
      const validationError = validateHeroMediaFile({ contentType: file.type, size: file.size });
      if (validationError) return `${file.name}: ${validationError}`;
    }
    return "";
  };

  const cleanupUploadedPath = async (path: string) => {
    const response = await fetch("/api/admin/hero-media/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Could not clean up the failed upload.");
    }
  };

  const uploadFile = async (file: File): Promise<HeroMediaItem> => {
    setUpload({ name: file.name, progress: 2 });
    let uploadedPath = "";
    try {
      const uploadUrlResponse = await fetch("/api/admin/hero-media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, size: file.size, contentType: file.type }),
      });
      const uploadUrl = await uploadUrlResponse.json();
      if (!uploadUrlResponse.ok) throw new Error(uploadUrl.error || "Could not prepare the upload.");
      uploadedPath = String(uploadUrl.path || "");

      await uploadWithProgress(uploadUrl.signedUrl, file, (progress) => setUpload({ name: file.name, progress: Math.max(2, progress) }));
      setUpload({ name: file.name, progress: 94 });
      const completeResponse = await fetch("/api/admin/hero-media/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: uploadUrl.path, contentType: file.type, size: file.size }),
      });
      const complete = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(complete.error || "The upload could not be published.");
      setUpload({ name: file.name, progress: 100 });
      return complete.media as HeroMediaItem;
    } catch (uploadError) {
      if (uploadedPath) {
        try { await cleanupUploadedPath(uploadedPath); } catch { /* The original error is more useful to the admin. */ }
      }
      throw uploadError;
    }
  };

  const handleFiles = async (files: File[]) => {
    setError("");
    setMessage("");
    const validationError = validateFiles(files);
    if (validationError) { setError(validationError); return; }
    let uploadFailed = false;
    const createdMedia: HeroMediaItem[] = [];
    for (const file of files) {
      try {
        const item = await uploadFile(file);
        createdMedia.push(item);
        setMedia((current) => [...current, item].sort((a, b) => a.display_order - b.display_order));
      } catch (uploadError) {
        uploadFailed = true;
        setError(uploadError instanceof Error ? uploadError.message : `Could not upload ${file.name}.`);
        break;
      }
    }
    if (uploadFailed) {
      setUpload({ name: "Cleaning up failed batch", progress: 100 });
      const cleanupErrors: string[] = [];
      for (const item of createdMedia) {
        try {
          const response = await fetch(`/api/admin/hero-media/${item.id}`, { method: "DELETE" });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            cleanupErrors.push(data.error || `Could not remove ${item.id}.`);
          }
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError instanceof Error ? cleanupError.message : "Could not remove a partial upload.");
        }
      }
      if (createdMedia.length) {
        const createdIds = new Set(createdMedia.map((item) => item.id));
        setMedia((current) => current.filter((item) => !createdIds.has(item.id)));
      }
      setError((current) => `${current} ${cleanupErrors.length ? "Some partial files could not be removed from Supabase." : "No files from this batch were kept."}`.trim());
    } else if (createdMedia.length) {
      setMessage(`${createdMedia.length === 1 ? "Media item" : `${createdMedia.length} media items`} uploaded. Publish when ready.`);
      onChange?.();
    }
    setUpload(null);
  };

  const publishMedia = async () => {
    if (!media.length) return;
    setPublishing(true);
    setError("");
    try {
      const response = await fetch("/api/admin/hero-media/publish", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not publish hero media.");
      setMedia((current) => current.map((item) => ({ ...item, active: true })));
      setMessage("Hero media published. It is now available to the homepage on its next render.");
      onChange?.();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Could not publish hero media.");
    } finally {
      setPublishing(false);
    }
  };

  const patchMedia = async (id: string, updates: Partial<HeroMediaItem>, successMessage = "Hero media saved.") => {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/hero-media/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save hero media.");
      setMedia((current) => current.map((item) => item.id === id ? { ...item, ...(data.media as HeroMediaItem) } : item).sort((a, b) => a.display_order - b.display_order));
      setMessage(successMessage);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save hero media.");
      await load();
    } finally {
      setBusyId("");
    }
  };

  const moveMedia = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= media.length) return;
    const next = [...media];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    const ordered = next.map((item, order) => ({ ...item, display_order: order }));
    setMedia(ordered);
    try {
      await Promise.all([patchMedia(ordered[index].id, { display_order: index }, ""), patchMedia(ordered[nextIndex].id, { display_order: nextIndex }, "")]);
      setMessage("Hero media order saved.");
      onChange?.();
    } catch {
      await load();
    }
  };

  const deleteMedia = async (item: HeroMediaItem) => {
    if (!window.confirm(`Delete ${item.media_type} “${item.caption || item.alt_text || "this hero item"}”? This removes the file from Supabase Storage.`)) return;
    setBusyId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/hero-media/${item.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete hero media.");
      setMedia((current) => current.filter((mediaItem) => mediaItem.id !== item.id).map((mediaItem, index) => ({ ...mediaItem, display_order: index })));
      setMessage("Hero media deleted.");
      onChange?.();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete hero media.");
    } finally {
      setBusyId("");
    }
  };

  return <section className="rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-4 sm:p-5" aria-labelledby="hero-media-editor-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 id="hero-media-editor-title" className="text-lg font-extrabold">Hero media</h3><p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600">Upload images or videos, preview them immediately, then publish the set when it is ready.</p></div>
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-none bg-[#EAE1DD] px-3 py-1 text-xs font-bold text-[#5A463A]">{media.length}/{HERO_MEDIA_MAX_ITEMS} items</span>{media.length > 0 && <button type="button" className="btn-primary inline-flex min-h-9 items-center gap-2 px-3 py-1.5 text-xs" onClick={() => void publishMedia()} disabled={publishing || Boolean(upload)}><Globe2 size={14} /> {publishing ? "Publishing…" : "Publish media"}</button>}</div>
    </div>

    <div className="mt-4 grid gap-2 text-xs text-stone-600 sm:grid-cols-2"><p>Images: JPG, JPEG, PNG, WebP, AVIF · max {formatBytes(HERO_IMAGE_MAX_BYTES)}</p><p>Videos: MP4, WebM · max {formatBytes(HERO_VIDEO_MAX_BYTES)}</p></div>
    <button type="button" className={`mt-4 flex min-h-28 w-full flex-col items-center justify-center rounded-none border border-dashed p-5 text-center transition-colors ${dragging ? "border-[#5A463A] bg-white" : "border-[#B99D88] bg-white/70 hover:bg-white"}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFiles(Array.from(event.dataTransfer.files)); }} disabled={Boolean(upload) || media.length >= HERO_MEDIA_MAX_ITEMS}>
      <Upload size={21} className="text-[#8B6B55]" /><span className="mt-2 text-sm font-bold">Drop files here or choose from your device</span><span className="mt-1 text-xs text-stone-500">Only the active hero media is loaded on the public homepage.</span>
    </button>
    <input ref={inputRef} type="file" className="sr-only" accept={[...HERO_IMAGE_TYPES, ...HERO_VIDEO_TYPES].join(",")} multiple onChange={(event) => { void handleFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />

    {upload && <div className="mt-3 rounded-none border border-[#D8CCC4] bg-white p-3" role="status"><div className="flex items-center justify-between gap-3 text-xs font-bold"><span className="truncate">Uploading {upload.name}</span><span>{upload.progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-none bg-[#EAE1DD]"><div className="h-full rounded-none bg-[#5A463A] transition-[width]" style={{ width: `${upload.progress}%` }} /></div></div>}
    {message && <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#356047]" role="status"><CheckCircle2 size={16} /> {message}</p>}
    {error && <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#8A3325]" role="alert"><X size={16} /> {error}</p>}

    {loading ? <p className="mt-5 text-sm text-stone-600">Loading hero media…</p> : media.length ? <div className="mt-5 grid gap-2">{media.map((item, index) => <article key={item.id} className={`flex flex-wrap items-center gap-3 rounded-none border p-3 ${item.active ? "border-[#D8CCC4] bg-white" : "border-[#D8CCC4] bg-[#EAE1DD]/60"}`}>
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-none bg-stone-800">{item.media_type === "video" ? <><video src={item.preview_url || item.public_url} className="h-full w-full object-cover" muted playsInline autoPlay loop preload="auto" /> <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-none bg-black/65 px-1.5 py-1 text-[0.62rem] font-bold text-white"><Film size={11} /> Video</span></> : <Image src={item.preview_url || item.public_url} alt="" fill sizes="112px" unoptimized className="object-cover" />} </div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-none bg-[#5A463A] px-2 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-white">{index === 0 ? "First" : `Position ${index + 1}`}</span><span className="text-xs text-stone-500">{item.mime_type} · {formatBytes(item.file_size)}</span></div><p className="mt-1 text-sm font-semibold text-stone-800">{item.active ? "Published on homepage" : "Ready to publish"}</p></div>
      <div className="flex items-center gap-1"><button type="button" className="icon-button" aria-label={`Move ${item.caption || "media"} up`} disabled={index === 0 || Boolean(busyId)} onClick={() => void moveMedia(index, -1)}><ChevronUp size={16} /></button><button type="button" className="icon-button" aria-label={`Move ${item.caption || "media"} down`} disabled={index === media.length - 1 || Boolean(busyId)} onClick={() => void moveMedia(index, 1)}><ChevronDown size={16} /></button><button type="button" className="icon-button text-[#8A3325]" aria-label={`Delete ${item.caption || "media"}`} disabled={busyId === item.id} onClick={() => void deleteMedia(item)}><Trash2 size={16} /></button></div>
    </article>)}</div> : <div className="mt-5 rounded-none border border-dashed border-[#B99D88] bg-white p-5 text-sm text-stone-600"><ImagePlus size={18} className="mb-2 text-[#8B6B55]" /> No dedicated hero media yet. The homepage will continue using the existing property image fallback.</div>}
    {busyId && <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-stone-500"><LoaderCircle size={14} className="animate-spin" /> Saving media…</p>}
  </section>;
}
