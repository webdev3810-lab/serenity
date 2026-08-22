"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ImagePlus, LoaderCircle, Upload, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";

type IntroImageField = "intro_image_1" | "intro_image_2";

type IntroImageSlot = {
  field: IntroImageField;
  label: string;
  value: string;
  path: string;
};

type Props = {
  firstImage: string;
  firstPath: string;
  secondImage: string;
  secondPath: string;
  onChange: (field: IntroImageField, value: string, path: string) => void;
  onError: (message: string) => void;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const formatBytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

async function compressImage(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error("Use a JPG, PNG, WebP, or AVIF image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Intro images must be no larger than 5 MB.");

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

export default function HomepageIntroImageEditor({ firstImage, firstPath, secondImage, secondPath, onChange, onError }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [uploading, setUploading] = useState<IntroImageField | "">("");

  const slots: IntroImageSlot[] = [
    { field: "intro_image_1", label: "Main artwork image", value: firstImage, path: firstPath },
    { field: "intro_image_2", label: "Overlapping card image", value: secondImage, path: secondPath },
  ];

  const uploadImage = async (slot: IntroImageSlot, file: File) => {
    setUploading(slot.field);
    onError("");
    try {
      const blob = await compressImage(file);
      const response = await fetch("/api/admin/homepage-intro/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: `${file.name.replace(/\.[^.]+$/, "")}.webp`, size: blob.size, contentType: "image/webp" }),
      });
      const details = await response.json();
      if (!response.ok) throw new Error(details.error || "Could not prepare the intro image upload.");

      const upload = await supabase.storage.from("property-images").uploadToSignedUrl(details.path, details.token, blob);
      if (upload.error) throw upload.error;

      if (slot.path) {
        const remove = await supabase.storage.from("property-images").remove([slot.path]);
        if (remove.error) throw remove.error;
      }
      onChange(slot.field, details.publicUrl, details.path);
    } catch (uploadError) {
      onError(uploadError instanceof Error ? uploadError.message : "Intro image upload failed.");
    } finally {
      setUploading("");
    }
  };

  return <div className="rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-4"><div><h3 className="text-base font-extrabold">Intro images</h3><p className="mt-1 text-sm leading-relaxed text-stone-600">Upload the two images used in the editorial artwork. Images are resized and uploaded directly to Supabase Storage.</p></div><div className="mt-4 grid gap-4 md:grid-cols-2">{slots.map((slot) => <article key={slot.field} className="overflow-hidden rounded-none border border-[#D8CCC4] bg-white"><div className="relative aspect-[4/3] bg-[#EAE1DD]">{slot.value ? <Image src={slot.value} alt="" fill sizes="(max-width: 768px) 100vw, 360px" unoptimized className="object-cover" /> : <div className="flex h-full flex-col items-center justify-center text-stone-500"><ImagePlus size={22} /><span className="mt-2 text-xs font-semibold">No image selected</span></div>}</div><div className="flex items-center justify-between gap-3 p-4"><div><p className="text-sm font-extrabold">{slot.label}</p><p className="mt-1 text-xs text-stone-500">JPG, PNG, WebP, AVIF · max {formatBytes(MAX_IMAGE_BYTES)}</p></div><label className="btn-primary inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 px-3 text-xs">{uploading === slot.field ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />}{uploading === slot.field ? "Uploading…" : slot.value ? "Replace" : "Upload"}<input type="file" accept={ACCEPTED_TYPES.join(",")} className="sr-only" disabled={Boolean(uploading)} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadImage(slot, file); }} /></label></div></article>)}</div><p className="mt-3 inline-flex items-center gap-2 text-xs text-stone-500"><X size={13} /> Save the Intro section after uploading to publish the new images.</p></div>;
}
