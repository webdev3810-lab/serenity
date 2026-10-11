"use client";
import { useAdminWorkspace,useDirtyGuard } from "@/src/components/admin/AdminUI";

import {
HERO_IMAGE_MAX_BYTES,
HERO_IMAGE_TYPES,
HERO_MEDIA_MAX_ITEMS,
HERO_VIDEO_MAX_BYTES,
HERO_VIDEO_TYPES,
validateHeroMediaFile,
} from "@/src/lib/heroMedia";
import { CheckCircle2,ChevronDown,ChevronUp,Film,Globe2,ImageIcon,ImagePlus,LoaderCircle,Trash2,Upload,X } from "lucide-react";
import Image from "next/image";
import { useEffect,useRef,useState } from "react";

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
  const { confirm } = useAdminWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<HeroMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [publishing, setPublishing] = useState(false);
  useDirtyGuard(Boolean(upload) || Boolean(busyId) || publishing);

  const load = async () => {
    setLoading(true); setError("");
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
    if (!await confirm(`Delete ${item.media_type} “${item.caption || item.alt_text || "this hero item"}”? This removes the file from Supabase Storage.`)) return;
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

  return <section className="admin-hero-media" aria-labelledby="hero-media-editor-title">
    <div className="admin-hero-media-header">
      <div className="min-w-0"><span className="admin-hero-media-kicker">Homepage visuals</span><h3 id="hero-media-editor-title">Hero media</h3><p>Choose the images or videos visitors see first. Arrange your media, then publish the set.</p></div>
      <div className="admin-hero-media-actions"><span className="admin-hero-media-count">{media.length} of {HERO_MEDIA_MAX_ITEMS} used</span>{media.length > 0 && <button type="button" className="admin-button admin-button-primary" onClick={() => void publishMedia()} disabled={publishing || Boolean(upload)}><Globe2 size={15} /> {publishing ? "Publishing…" : "Publish media"}</button>}</div>
    </div>

    <div className="admin-hero-media-limits" aria-label="Upload limits">
      <div className="admin-hero-media-limit"><span className="admin-hero-media-limit-icon"><ImageIcon size={18} aria-hidden="true" /></span><span><strong>Images</strong><small>JPG, PNG, WebP, AVIF</small></span><b>Up to {formatBytes(HERO_IMAGE_MAX_BYTES)}</b></div>
      <div className="admin-hero-media-limit"><span className="admin-hero-media-limit-icon"><Film size={18} aria-hidden="true" /></span><span><strong>Videos</strong><small>MP4, WebM</small></span><b>Up to {formatBytes(HERO_VIDEO_MAX_BYTES)}</b></div>
    </div>
    <button type="button" className="admin-hero-media-dropzone" data-dragging={dragging} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFiles(Array.from(event.dataTransfer.files)); }} disabled={Boolean(upload) || media.length >= HERO_MEDIA_MAX_ITEMS}>
      <span className="admin-hero-media-upload-icon"><Upload size={20} aria-hidden="true" /></span><span className="admin-hero-media-upload-copy"><strong>{media.length >= HERO_MEDIA_MAX_ITEMS ? "Hero media is full" : "Drop files here or choose files"}</strong><small>{media.length >= HERO_MEDIA_MAX_ITEMS ? "Remove an item to upload another." : "Images up to 5 MB · Videos up to 20 MB"}</small></span><span className="admin-hero-media-choose">Choose files</span>
    </button>
    <p className="admin-hero-media-note">Only published hero media is shown on the public homepage.</p>
    <input ref={inputRef} type="file" className="sr-only" accept={[...HERO_IMAGE_TYPES, ...HERO_VIDEO_TYPES].join(",")} multiple onChange={(event) => { void handleFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />

    {upload && <div className="mt-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3" role="status"><div className="flex items-center justify-between gap-3 text-sm font-medium"><span className="truncate">Uploading {upload.name}</span><span>{upload.progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-xl bg-[var(--admin-surface-alt)]"><div className="h-full rounded-xl bg-[var(--admin-accent)] transition-[width]" style={{ width: `${upload.progress}%` }} /></div></div>}
    {message && <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--admin-success-text)]" role="status"><CheckCircle2 size={16} /> {message}</p>}
    {error && <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--admin-danger-text)]" role="alert"><X size={16} /> {error}<button type="button" className="admin-button" onClick={() => void load()}>Retry loading</button></p>}

    {loading ? <p className="mt-5 text-sm text-[var(--admin-muted)]">Loading hero media…</p> : media.length ? <div className="admin-hero-media-list"><div className="admin-hero-media-list-heading"><strong>Media queue</strong><span>The first item leads the hero sequence</span></div>{media.map((item, index) => <article key={item.id} className="admin-hero-media-item">
      <div className="admin-hero-media-thumb">{item.media_type === "video" ? <><video src={item.preview_url || item.public_url} className="h-full w-full object-cover" muted playsInline autoPlay loop preload="metadata" /> <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-1 text-[10px] font-medium text-white"><Film size={10} /> Video</span></> : <Image src={item.preview_url || item.public_url} alt="" fill sizes="96px" unoptimized className="object-cover" />} </div>
      <div className="admin-hero-media-item-copy"><div className="admin-hero-media-item-tags"><span className="admin-hero-media-position">{index === 0 ? "Hero lead" : `Slide ${index + 1}`}</span><span className={item.active ? "admin-hero-media-published" : "admin-hero-media-draft"}>{item.active ? "Published" : "Draft"}</span></div><strong>{item.media_type === "video" ? "Hero video" : "Hero image"}</strong><small>{item.mime_type.split("/")[1].toUpperCase()} · {formatBytes(item.file_size)}</small></div>
      <div className="admin-hero-media-item-actions"><button type="button" className="admin-icon-button" aria-label={`Move ${item.caption || "media"} up`} disabled={index === 0 || Boolean(busyId)} onClick={() => void moveMedia(index, -1)}><ChevronUp size={16} /></button><button type="button" className="admin-icon-button" aria-label={`Move ${item.caption || "media"} down`} disabled={index === media.length - 1 || Boolean(busyId)} onClick={() => void moveMedia(index, 1)}><ChevronDown size={16} /></button><button type="button" className="admin-icon-button text-[var(--admin-danger-text)]" aria-label={`Delete ${item.caption || "media"}`} disabled={busyId === item.id} onClick={() => void deleteMedia(item)}><Trash2 size={16} /></button></div>
    </article>)}</div> : !error && <div className="mt-5 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 text-sm text-[var(--admin-muted)]"><ImagePlus size={18} className="mb-2 text-[var(--admin-text)]" /> No dedicated hero media yet. The homepage will continue using the existing property image fallback.</div>}
    {busyId && <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--admin-muted)]"><LoaderCircle size={14} className="animate-spin" /> Saving media…</p>}
  </section>;
}
