"use client";

import { useAdminWorkspace, useDirtyGuard } from "@/src/components/admin/AdminUI";
import type { Row } from "@/src/components/admin/AdminModels";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { ExternalLink, Eye, EyeOff, FileImage, LoaderCircle, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

type Props = {
  propertyId: string;
  propertyName: string;
  images: Row[];
  reload: () => Promise<void>;
  notify: (message: string) => void;
  onError: (message: string) => void;
};

async function responseBody(response: Response): Promise<{ error?: string; path?: string; token?: string; warning?: string }> {
  return response.json().catch(() => ({}));
}

export function FloorPlanManager({ propertyId, propertyName, images, reload, notify, onError }: Props) {
  const { confirm } = useAdminWorkspace();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState<"" | "upload" | "visibility" | "delete">("");
  useDirtyGuard(Boolean(busy));

  const floorPlan = images
    .filter((image) => String(image.property_id) === propertyId && image.category === "floor-plan")
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))[0];
  const src = floorPlan?.storage_path
    ? supabase.storage.from("property-images").getPublicUrl(String(floorPlan.storage_path)).data.publicUrl
    : String(floorPlan?.external_url ?? "");

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;
    if (!ALLOWED_TYPES.has(file.type) || !file.size || file.size > MAX_IMAGE_BYTES) {
      onError("Choose a JPG, PNG, WebP or AVIF floor plan under 5 MB.");
      return;
    }

    setBusy("upload");
    let uploadedPath = "";
    try {
      const bitmap = await createImageBitmap(file);
      const width = bitmap.width;
      const height = bitmap.height;
      bitmap.close();

      const signedResponse = await fetch("/api/admin/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, category: "floor-plan", fileName: file.name, size: file.size, contentType: file.type }),
      });
      const signed = await responseBody(signedResponse);
      if (!signedResponse.ok || !signed.path || !signed.token) throw new Error(signed.error || "Could not prepare the floor plan upload.");
      uploadedPath = signed.path;

      const uploaded = await supabase.storage.from("property-images").uploadToSignedUrl(signed.path, signed.token, file);
      if (uploaded.error) throw uploaded.error;

      // Once completion starts, its outcome may be unknown if the connection
      // drops. Never clean up this path from the browser after that point: the
      // server may already have attached it to the floor-plan record.
      uploadedPath = "";
      const completeResponse = await fetch("/api/admin/property-images/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          path: signed.path,
          originalFilename: file.name,
          category: "floor-plan",
          categoryLabel: "Floor plan",
          size: file.size,
          width,
          height,
          replaceFloorPlanId: floorPlan?.id,
        }),
      });
      const completed = await responseBody(completeResponse);
      if (!completeResponse.ok) throw new Error(completed.error || "Could not save the floor plan.");
      await reload();
      notify(completed.warning || (floorPlan ? "Floor plan replaced." : "Floor plan uploaded."));
    } catch (error) {
      if (uploadedPath) {
        await fetch("/api/admin/property-images/cleanup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId, paths: [uploadedPath] }),
        }).catch(() => null);
      }
      onError(error instanceof Error ? error.message : "Could not upload the floor plan.");
    } finally {
      setBusy("");
    }
  };

  const setVisible = async () => {
    if (!floorPlan || busy) return;
    setBusy("visibility");
    try {
      const response = await fetch("/api/admin/property-images/floor-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, imageId: floorPlan.id, visible: floorPlan.is_visible === false }),
      });
      const result = await responseBody(response);
      if (!response.ok) throw new Error(result.error || "Could not update floor plan visibility.");
      await reload();
      notify(floorPlan.is_visible === false ? "Floor plan is now visible on the house page." : "Floor plan hidden from the house page.");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not update floor plan visibility.");
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (!floorPlan || busy) return;
    if (!await confirm({ title: "Delete floor plan?", description: "This removes the current floor plan from this house and deletes its uploaded file. You can upload a new one afterwards.", confirmLabel: "Delete floor plan", destructive: true })) return;
    setBusy("delete");
    try {
      const response = await fetch("/api/admin/property-images/floor-plan", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, imageId: floorPlan.id }),
      });
      const result = await responseBody(response);
      if (!response.ok) throw new Error(result.error || "Could not delete the floor plan.");
      await reload();
      notify(result.warning || "Floor plan deleted. You can upload a new one now.");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not delete the floor plan.");
    } finally {
      setBusy("");
    }
  };

  return <section className="admin-card bg-[var(--admin-surface)] p-5 sm:p-7" aria-busy={Boolean(busy)}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-medium text-[var(--admin-muted)]">House media</p><h2 className="mt-1 text-xl font-semibold text-[var(--admin-text)]">Floor plan · {propertyName}</h2><p className="mt-2 max-w-2xl text-sm text-[var(--admin-muted)]">Manage one floor plan for this house. It appears in its own section on the public house page, separate from the photo gallery.</p></div>
      <label className={`admin-button admin-button-primary inline-flex min-h-11 items-center gap-2 ${busy ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}><Upload size={16} aria-hidden="true" /> {floorPlan ? "Replace floor plan" : "Upload floor plan"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => void upload(event)} disabled={Boolean(busy)} /></label>
    </div>
    <p className="mt-4 text-sm text-[var(--admin-muted)]">JPG, PNG, WebP or AVIF · max 5 MB. The original image is kept so labels remain sharp. Changes here take effect immediately.</p>
    {busy && <p className="mt-5 flex items-center gap-2 text-sm font-medium text-[var(--admin-text)]" role="status"><LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> {busy === "upload" ? "Uploading floor plan…" : busy === "delete" ? "Deleting floor plan…" : "Updating visibility…"}</p>}
    {floorPlan ? <div className="mt-6 overflow-hidden rounded-xl border border-[var(--admin-border)]">
      <div className="relative h-72 bg-[var(--admin-surface-alt)] sm:h-96">{src ? <Image src={src} alt={String(floorPlan.alt_text || `${propertyName} floor plan`)} fill sizes="(max-width: 768px) 100vw, 800px" className="object-contain" unoptimized /> : <div className="flex h-full items-center justify-center gap-2 text-[var(--admin-muted)]"><FileImage size={22} aria-hidden="true" /> Preview unavailable</div>}</div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--admin-border)] p-4">
        <div><p className="text-sm font-semibold text-[var(--admin-text)]">{floorPlan.is_visible === false ? "Hidden from guests" : "Visible on the house page"}</p><p className="mt-1 text-sm text-[var(--admin-muted)]">{String(floorPlan.original_filename || "Current floor plan")}</p></div>
        <div className="flex flex-wrap gap-2">
          {src && <a href={src} target="_blank" rel="noopener noreferrer" className="admin-button inline-flex min-h-10 items-center gap-2"><ExternalLink size={16} aria-hidden="true" /> View full size</a>}
          <button type="button" className="admin-button inline-flex min-h-10 items-center gap-2" onClick={() => void setVisible()} disabled={Boolean(busy)}>{floorPlan.is_visible === false ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}{floorPlan.is_visible === false ? "Show on website" : "Hide from website"}</button>
          <button type="button" className="admin-button inline-flex min-h-10 items-center gap-2 text-[var(--admin-danger-text)]" onClick={() => void remove()} disabled={Boolean(busy)}><Trash2 size={16} aria-hidden="true" /> Delete current</button>
        </div>
      </div>
    </div> : <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-8 text-center"><FileImage size={32} className="text-[var(--admin-muted)]" aria-hidden="true" /><h3 className="mt-3 text-base font-semibold text-[var(--admin-text)]">No floor plan uploaded</h3><p className="mt-1 max-w-sm text-sm text-[var(--admin-muted)]">Use Upload floor plan to add one. You can replace or delete it here at any time.</p></div>}
  </section>;
}
