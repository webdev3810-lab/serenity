"use client";

/* The photo manager keeps edits in the browser until the single Save changes
   action. Upload bytes still go directly to Supabase Storage via a signed URL. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, Images, LoaderCircle, Plus, Save, Trash2, Upload } from "lucide-react";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";

type Row = Record<string, any>;

type PropertyPhotoManagerProps = {
  properties: Row[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  images: Row[];
  reload: () => Promise<void>;
  notify: (message: string) => void;
  onError: (message: string) => void;
  onSelectProperty?: (property: Row) => void;
  embedded?: boolean;
  showHeader?: boolean;
};

type CategoryDraft = {
  category: string;
  category_label: string;
  category_description: string;
  display_order: number;
  is_visible: boolean;
  no_photo_available: boolean;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES_PER_HOUSE_CATEGORY = 5;
const MAX_UPLOAD_BATCH = 10;
const ADD_CATEGORY_OPTION = "__add_category__";
const DEFAULT_UPLOAD_CATEGORY = "unsorted";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Every house starts with a useful room list. Saved categories and legacy
// image categories are merged below, so custom categories remain available.
const DEFAULT_CATEGORIES: Array<Pick<CategoryDraft, "category" | "category_label">> = [
  { category: "unsorted", category_label: "Unsorted uploads" },
  { category: "front-of-house", category_label: "Front of house" },
  { category: "living-room", category_label: "Living room" },
  { category: "kitchen", category_label: "Kitchen" },
  { category: "dining-area", category_label: "Dining area" },
  { category: "bedroom", category_label: "Bedroom" },
  { category: "bathroom", category_label: "Bathroom" },
  { category: "laundry", category_label: "Laundry" },
  { category: "backyard", category_label: "Backyard" },
  { category: "other", category_label: "Other" },
];

const isStagingCategory = (category: string) => category === DEFAULT_UPLOAD_CATEGORY;
const categoryCountLabel = (category: string, count: number) => isStagingCategory(category) ? `${count} staged` : `${count}/${MAX_IMAGES_PER_HOUSE_CATEGORY}`;

const defaultCategories = (): CategoryDraft[] => DEFAULT_CATEGORIES.map((item, index) => ({
  ...item,
  category_description: "",
  display_order: index,
  is_visible: true,
  no_photo_available: false,
}));

const storageUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/property-images/${path.split("/").map(encodeURIComponent).join("/")}`;
const isMockImage = (image: Row) => String(image.external_url ?? "").includes("a0.muscache.com") || String(image.external_url ?? "").includes("images.unsplash.com");
const isPreviewImage = (image: Row) => image.is_placeholder === true || isMockImage(image);
const slugifyCategory = (label: string) => label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (message) return String(message);
  }
  return fallback;
};

async function compressImage(file: File) {
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} is larger than 5 MB.`);
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
  if (!blob || blob.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} is still larger than 5 MB after optimisation.`);
  return { blob, width: canvas.width, height: canvas.height };
}

export default function PropertyPhotoManager({ properties, selectedId, setSelectedId, images, reload, notify, onError, onSelectProperty, embedded = false, showHeader = true }: PropertyPhotoManagerProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient() as any, []);
  const [localImages, setLocalImages] = useState<Row[]>([]);
  const [categories, setCategories] = useState<CategoryDraft[]>(defaultCategories);
  const [savedCategorySlugs, setSavedCategorySlugs] = useState<string[]>([]);
  const [uploadCategory, setUploadCategory] = useState(DEFAULT_UPLOAD_CATEGORY);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryFormImageId, setCategoryFormImageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const [dirty, setDirty] = useState(false);

  const imageKey = images.map((image) => `${image.id}:${image.updated_at ?? ""}:${image.display_order ?? 0}`).join("|");

  useEffect(() => {
    // The parent reloads from Supabase after uploads and saves; mirror that
    // external snapshot into the local draft used by the editor.
    const selectedImages = images.filter((image) => image.property_id === selectedId).map((image) => ({ ...image }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalImages(selectedImages);
    setUploadCategory(DEFAULT_UPLOAD_CATEGORY);
    setDirty(false);
  }, [selectedId, imageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  useEffect(() => () => {
    dragCleanupRef.current?.();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      // Reset category state when the selected property changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategories(defaultCategories());
      setSavedCategorySlugs([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await supabase.from("property_photo_categories").select("*").order("display_order");
      if (cancelled) return;
      if (result.error) {
        onError(result.error.message);
        return;
      }
      const saved = (result.data ?? []) as Row[];
      const selectedPropertyCategories = saved.filter((category) => String(category.property_id) === selectedId);
      const sharedCategories = [...saved.reduce((result, category) => {
        const slug = String(category.category);
        const existing = result.get(slug);
        if (!existing || String(category.property_id) === selectedId) result.set(slug, category);
        return result;
      }, new Map<string, Row>()).values()];
      setSavedCategorySlugs(selectedPropertyCategories.map((category) => String(category.category)));
      const propertyImages = images.filter((image) => image.property_id === selectedId);
      const savedDrafts = sharedCategories.map((stored, index) => ({
          category: String(stored.category),
          category_label: String(stored.category_label || stored.category || "Other"),
          category_description: String(stored.category_description ?? ""),
          display_order: Number(stored.display_order ?? index),
          is_visible: stored.is_visible !== false,
          no_photo_available: stored.no_photo_available === true,
        }));
      const savedBySlug = new Map(savedDrafts.map((category) => [category.category, category]));
      const defaultSlugs = new Set(DEFAULT_CATEGORIES.map((category) => category.category));
      const baseCategories = [
        ...defaultCategories().map((fallback, index) => {
          const savedCategory = savedBySlug.get(fallback.category);
          return savedCategory ? { ...savedCategory, display_order: index } : { ...fallback, display_order: index };
        }),
        ...savedDrafts.filter((category) => !defaultSlugs.has(category.category)).map((category, index) => ({ ...category, display_order: DEFAULT_CATEGORIES.length + index })),
      ];
      const existingSlugs = new Set(baseCategories.map((category) => category.category));
      const imageCategories = propertyImages.reduce<CategoryDraft[]>((result, image) => {
        const category = slugifyCategory(String(image.category ?? "other")) || "other";
        if (!existingSlugs.has(category) && !result.some((item) => item.category === category)) {
          result.push({
            category,
            category_label: String(image.category_label || category),
            category_description: "",
            display_order: baseCategories.length + result.length,
            is_visible: true,
            no_photo_available: false,
          });
        }
        return result;
      }, []);
      if (!existingSlugs.has("other") && !imageCategories.some((category) => category.category === "other")) {
        imageCategories.push({ category: "other", category_label: "Other", category_description: "", display_order: baseCategories.length + imageCategories.length, is_visible: true, no_photo_available: false });
      }
      setCategories([...baseCategories, ...imageCategories].sort((a, b) => a.display_order - b.display_order));
    })();
    return () => { cancelled = true; };
  }, [imageKey, images, onError, selectedId, supabase]);

  const propertyName = properties.find((property) => property.id === selectedId)?.name ?? "Selected house";
  const sortedImages = localImages;
  const coverId = sortedImages.find((image) => !isStagingCategory(String(image.category ?? DEFAULT_UPLOAD_CATEGORY)) && image.is_cover === true)?.id
    ?? sortedImages.find((image) => !isStagingCategory(String(image.category ?? DEFAULT_UPLOAD_CATEGORY)))?.id;
  const categoryBySlug = new Map(categories.map((category) => [category.category, category]));
  const categoryOptions = [...categories].sort((a, b) => a.category_label.localeCompare(b.category_label, undefined, { sensitivity: "base" }));
  const activeUploadCategory = categoryBySlug.has(uploadCategory) ? uploadCategory : DEFAULT_UPLOAD_CATEGORY;
  const imageCountByCategory = new Map<string, number>();
  localImages.forEach((image) => {
    const category = String(image.category ?? "other");
    imageCountByCategory.set(category, (imageCountByCategory.get(category) ?? 0) + 1);
  });
  const groupedImages = (() => {
    const groups = new Map<string, { category: string; label: string; images: Row[] }>();
    categories.forEach((category) => groups.set(category.category, { category: category.category, label: category.category_label, images: [] }));
    sortedImages.forEach((image) => {
      const category = String(image.category ?? "other");
      if (!groups.has(category)) groups.set(category, { category, label: String(image.category_label ?? category), images: [] });
      groups.get(category)?.images.push(image);
    });
    return Array.from(groups.values()).filter((group) => group.images.length);
  })();

  const propertyIds = Array.from(new Set([
    selectedId,
    ...properties.map((property) => String(property.id ?? "")).filter(Boolean),
  ]));
  const categoryRowsFor = (categoryList: CategoryDraft[]) => propertyIds.flatMap((propertyId) => categoryList.map((category, index) => ({
    property_id: propertyId,
    category: category.category,
    category_label: category.category_label,
    category_description: category.category_description.trim(),
    display_order: index,
    is_visible: category.is_visible,
    no_photo_available: category.no_photo_available,
  })));

  const updateImage = (id: string, changes: Row) => {
    setLocalImages((current) => current.map((image) => image.id === id ? { ...image, ...changes } : image));
    setDirty(true);
  };

  const addCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const label = newCategoryLabel.trim();
    const category = slugifyCategory(label);
    if (!label || !category) {
      onError("Enter a category name first.");
      return;
    }
    if (categories.some((item) => item.category === category)) {
      onError("That category already exists.");
      return;
    }
    const nextCategory: CategoryDraft = {
      category,
      category_label: label.slice(0, 80),
      category_description: "",
      display_order: categories.length,
      is_visible: true,
      no_photo_available: false,
    };
    const nextCategories = [...categories, nextCategory];
    const categoryImage = categoryFormImageId ? localImages.find((image) => image.id === categoryFormImageId) : null;
    const hadUnsavedChanges = dirty;
    setSaving(true);
    try {
      const categoryResult = await supabase.from("property_photo_categories").upsert(categoryRowsFor(nextCategories), { onConflict: "property_id,category" });
      if (categoryResult.error) throw categoryResult.error;
      if (categoryImage) {
        const imageResult = await supabase.from("property_images").update({ category, category_label: nextCategory.category_label }).eq("id", categoryImage.id);
        if (imageResult.error) throw imageResult.error;
      }
      setCategories(nextCategories);
      setSavedCategorySlugs((current) => current.includes(category) ? current : [...current, category]);
      if (categoryImage) {
        setLocalImages((current) => current.map((image) => image.id === categoryImage.id ? { ...image, category, category_label: nextCategory.category_label } : image));
      }
      setNewCategoryLabel("");
      setCategoryFormOpen(false);
      setCategoryFormImageId(null);
      setDirty(hadUnsavedChanges);
      notify(`${label} category saved${categoryImage ? " and assigned to the photo" : ""}.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not save the category.");
    } finally {
      setSaving(false);
    }
  };

  const moveImage = (index: number, nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= sortedImages.length) return;
    setLocalImages((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next.map((image, itemIndex) => ({ ...image, display_order: itemIndex }));
    });
    setDirty(true);
  };

  const moveImageById = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setLocalImages((current) => {
      const sourceIndex = current.findIndex((image) => image.id === sourceId);
      const targetIndex = current.findIndex((image) => image.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
      const next = [...current];
      const [item] = next.splice(sourceIndex, 1);
      const insertionIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      next.splice(insertionIndex, 0, item);
      return next.map((image, itemIndex) => ({ ...image, display_order: itemIndex }));
    });
    setDirty(true);
  };

  const startCardDrag = (event: React.PointerEvent<HTMLElement>, imageId: string) => {
    if (event.button !== 0 || (event.target as Element | null)?.closest("button, input, select, textarea, label, a")) return;
    dragCleanupRef.current?.();
    event.preventDefault();

    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const overlay = card.cloneNode(true) as HTMLElement;
    const pointerOffsetX = event.clientX - rect.left;
    const pointerOffsetY = event.clientY - rect.top;
    overlay.style.position = "fixed";
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.margin = "0";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "9999";
    overlay.style.opacity = "1";
    overlay.style.transform = "none";
    overlay.style.transition = "none";
    overlay.style.boxShadow = "0 24px 60px rgba(45, 38, 34, 0.24)";
    document.body.appendChild(overlay);

    const move = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      overlay.style.left = `${moveEvent.clientX - pointerOffsetX}px`;
      overlay.style.top = `${moveEvent.clientY - pointerOffsetY}px`;
      const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest<HTMLElement>("[data-photo-card]");
      const targetId = target?.dataset.photoCard;
      if (targetId) {
        setDragOverId(targetId);
        if (targetId !== imageId) moveImageById(imageId, targetId);
      }
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
      overlay.remove();
      if (dragCleanupRef.current === cleanup) dragCleanupRef.current = null;
      setDraggedId(null);
      setDragOverId(null);
    };

    dragCleanupRef.current = cleanup;
    setDraggedId(imageId);
    setDragOverId(imageId);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", cleanup, { once: true });
    window.addEventListener("pointercancel", cleanup, { once: true });
  };

  const changeImageCategory = (image: Row, nextCategory: string) => {
    const currentCategory = String(image.category ?? "other");
    if (currentCategory === nextCategory) return;
    const nextCount = imageCountByCategory.get(nextCategory) ?? 0;
    if (!isStagingCategory(nextCategory) && nextCount >= MAX_IMAGES_PER_HOUSE_CATEGORY) {
      onError(`This house's ${categoryBySlug.get(nextCategory)?.category_label ?? "category"} already has ${MAX_IMAGES_PER_HOUSE_CATEGORY} photos.`);
      return;
    }
    updateImage(image.id, {
      category: nextCategory,
      category_label: categoryBySlug.get(nextCategory)?.category_label ?? "Other",
    });
  };

  const upload = async (event: React.ChangeEvent<HTMLInputElement>, requestedCategory = activeUploadCategory) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selectedId || !files.length) return;
    if (files.length > MAX_UPLOAD_BATCH) {
      onError(`Choose up to ${MAX_UPLOAD_BATCH} images at a time.`);
      return;
    }
    const targetCategory = categoryBySlug.has(requestedCategory) ? requestedCategory : activeUploadCategory;
    const existingCategoryCount = imageCountByCategory.get(targetCategory) ?? 0;
    if (!isStagingCategory(targetCategory) && existingCategoryCount + files.length > MAX_IMAGES_PER_HOUSE_CATEGORY) {
      onError(`This house's ${categoryBySlug.get(targetCategory)?.category_label ?? "category"} can contain up to ${MAX_IMAGES_PER_HOUSE_CATEGORY} photos.`);
      return;
    }
    const invalid = files.find((file) => !ALLOWED_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES);
    if (invalid) {
      onError(!ALLOWED_TYPES.has(invalid.type) ? `${invalid.name} is not a supported image. Use JPG, PNG, WebP, or AVIF.` : `${invalid.name} is larger than 5 MB.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadMessage(`Preparing 1 of ${files.length}`);
    const uploadedPaths: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        setUploadMessage(`Uploading ${file.name} (${index + 1} of ${files.length})`);
        const optimized = await compressImage(file);
        const response = await fetch("/api/admin/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId: selectedId, category: targetCategory, fileName: `${file.name.replace(/\.[^.]+$/, "")}.webp`, size: optimized.blob.size, contentType: "image/webp" }),
        });
        const details = await response.json();
        if (!response.ok) throw new Error(details.error || "Could not prepare the image upload.");
        if (!details.path || !details.token) throw new Error("Supabase did not return a signed upload token.");
        uploadedPaths.push(details.path);
        const uploadResult = await supabase.storage.from("property-images").uploadToSignedUrl(details.path, details.token, optimized.blob);
        if (uploadResult.error) throw uploadResult.error;
        const completeResponse = await fetch("/api/admin/property-images/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: selectedId,
            path: details.path,
            originalFilename: file.name,
            category: targetCategory,
            categoryLabel: categoryBySlug.get(targetCategory)?.category_label ?? "Unsorted uploads",
            size: optimized.blob.size,
            width: optimized.width,
            height: optimized.height,
          }),
        });
        const complete = await completeResponse.json();
        if (!completeResponse.ok) throw new Error(complete.error || "The image uploaded but could not be added to the gallery.");
        setUploadProgress(Math.round(((index + 1) / files.length) * 100));
      }
      notify(`${files.length === 1 ? "Image" : `${files.length} images`} uploaded to Unsorted uploads. Mark them Visible when you are ready to publish.`);
      await reload();
    } catch (error) {
      setUploadMessage("Cleaning up failed uploads…");
      let cleanupError: unknown = null;
      if (uploadedPaths.length) {
        try {
          const cleanupResponse = await fetch("/api/admin/property-images/cleanup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ propertyId: selectedId, paths: uploadedPaths }),
          });
          if (!cleanupResponse.ok) {
            const cleanup = await cleanupResponse.json().catch(() => ({}));
            cleanupError = cleanup.error || "Could not remove partial uploads.";
          }
        } catch (cleanupFailure) {
          cleanupError = cleanupFailure;
        }
      }
      const uploadError = getErrorMessage(error, "Image upload failed.");
      onError(cleanupError ? `${uploadError} Some partial files could not be removed from Supabase.` : `${uploadError} No files from this batch were kept.`);
    } finally {
      setUploading(false);
      setUploadMessage("");
    }
  };

  const saveChanges = async () => {
    if (!selectedId) return;
    if (categories.some((category) => !category.category_label.trim())) {
      onError("Every photo category needs a name before you save.");
      return;
    }
    setSaving(true);
    try {
      const updates = sortedImages.map((image, index) => {
        const imageCategory = String(image.category ?? "other");
        const isStaging = isStagingCategory(imageCategory);
        return supabase.from("property_images").update({
          alt_text: String(image.alt_text ?? "").trim(),
          category: imageCategory,
          category_label: String(categoryBySlug.get(imageCategory)?.category_label ?? image.category_label ?? (isStaging ? "Unsorted uploads" : "Other")),
          display_order: index,
          is_cover: !isStaging && image.id === coverId,
          is_visible: !isStaging && image.is_visible !== false,
          is_placeholder: image.is_placeholder === true,
        }).eq("id", image.id);
      });
      const categoryRows = categoryRowsFor(categories);
      const removedCategories = savedCategorySlugs.filter((category) => !categoryBySlug.has(category));
      for (const update of updates) {
        const imageResult = await update;
        if (imageResult.error) throw imageResult.error;
      }
      const categoryResult = await supabase.from("property_photo_categories").upsert(categoryRows, { onConflict: "property_id,category" });
      if (categoryResult.error) throw categoryResult.error;
      const removedResult = removedCategories.length
        ? await supabase.from("property_photo_categories").delete().in("property_id", propertyIds).in("category", removedCategories)
        : { error: null };
      if (removedResult.error) throw removedResult.error;
      notify("Photo gallery saved and published settings updated.");
      await reload();
      setDirty(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not save the photo gallery.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (image: Row) => {
    if (!window.confirm("Delete this photo? This removes the uploaded file and its gallery record.")) return;
    setSaving(true);
    try {
      const [databaseResult, storageResult] = await Promise.all([
        supabase.from("property_images").delete().eq("id", image.id).select("id"),
        image.storage_path
          ? supabase.storage.from("property-images").remove([image.storage_path])
          : Promise.resolve({ error: null }),
      ]);
      if (databaseResult.error) throw databaseResult.error;
      if (!databaseResult.data?.length) throw new Error("The photo record could not be deleted. Please check your admin access and try again.");
      if (storageResult.error) throw new Error(`The photo record was deleted, but the stored file could not be removed: ${storageResult.error.message}`);
      setLocalImages((current) => current.filter((item) => item.id !== image.id));
      setDraggedId(null);
      setDragOverId(null);
      notify("Photo and its Supabase file were deleted.");
      await reload();
      setDirty(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not delete the photo.");
    } finally {
      setSaving(false);
    }
  };

  const openCategoryForm = (imageId: string) => {
    setCategoryFormOpen(true);
    setCategoryFormImageId(imageId);
    window.setTimeout(() => document.getElementById(`new-category-${selectedId}-${imageId}`)?.focus(), 0);
  };

  return <>
    <div className={`mb-5 flex flex-wrap items-center gap-2 ${embedded ? "border-b border-[#EAE1DD] pb-4" : ""}`}>
      {embedded && <span className="mr-1 text-xs font-bold uppercase tracking-[0.14em] text-[#8B6B55]">Select house</span>}
      {properties.map((property) => <button key={property.id} type="button" onClick={() => onSelectProperty ? onSelectProperty(property) : setSelectedId(property.id)} className={`rounded-none border px-4 py-2 text-sm font-bold ${selectedId === property.id ? "border-[#5A463A] bg-[#5A463A] text-white" : "border-[#D8CCC4] bg-white hover:bg-[#F7F4F1]"}`}>{property.name}</button>)}
    </div>
    {!selectedId ? <div className="card bg-white p-8 text-center text-sm text-stone-600"><Images className="mx-auto mb-3 text-[#8B6B55]" /><p>Select a house to manage its photos.</p></div> : <section className="card bg-white p-5 sm:p-7">
      {showHeader ? <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EAE1DD] pb-5">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B6B55]">Property gallery</p><h2 className="mt-1 text-2xl font-extrabold">{propertyName}</h2><p className="mt-2 max-w-2xl text-sm text-stone-600">Upload real house photos, choose their room, set a cover, and publish only the photos you want guests to see.</p></div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="btn-primary inline-flex min-h-11 cursor-pointer items-center gap-2"><Upload size={16} /> Upload photos<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={upload} disabled={uploading} /></label>
        </div>
      </div> : <div className="flex justify-end"><label className="btn-primary inline-flex min-h-10 cursor-pointer items-center gap-2"><Upload size={16} /> Upload photos<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={upload} disabled={uploading} /></label></div>}
      <div className="mt-5 grid gap-3 text-xs text-stone-600 sm:grid-cols-3"><p>New photos go to Unsorted uploads and stay hidden.</p><p>JPG, PNG, WebP, AVIF · max 5 MB each</p><p>Upload up to {MAX_UPLOAD_BATCH} at a time · room categories max {MAX_IMAGES_PER_HOUSE_CATEGORY}</p></div>
      {uploading ? <div className="mt-5 rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-4" role="status"><div className="flex items-center gap-2 text-sm font-bold"><LoaderCircle size={16} className="animate-spin" /> {uploadMessage}</div><div className="mt-3 h-2 overflow-hidden rounded-none bg-[#EAE1DD]"><div className="h-full bg-[#5A463A] transition-all" style={{ width: `${Math.max(uploadProgress, 8)}%` }} /></div></div> : null}
      {sortedImages.length ? <div className="mt-6 space-y-8">
        {groupedImages.map((group) => <section key={group.category} aria-labelledby={`photo-group-${group.category}`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE1DD] pb-2">
            <div><h3 id={`photo-group-${group.category}`} className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#5A463A]">{group.label}</h3><p className="mt-1 text-xs text-stone-500">{isStagingCategory(group.category) ? "Hidden staging area — assign a room and publish when ready." : `${group.images.length} of ${MAX_IMAGES_PER_HOUSE_CATEGORY} photos used for this house category`}</p></div>
            <span className="rounded-none bg-[#F7F4F1] px-3 py-1 text-xs font-bold text-stone-600">{categoryCountLabel(group.category, group.images.length)}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {group.images.map((image) => {
          const index = sortedImages.findIndex((item) => item.id === image.id);
          const src = image.storage_path ? storageUrl(image.storage_path) : String(image.external_url ?? "");
          return <article key={image.id} data-photo-card={String(image.id)} onPointerDown={(event) => startCardDrag(event, String(image.id))} className={`will-change-transform cursor-grab overflow-hidden rounded-none border bg-white transition-[transform,box-shadow,opacity,border-color] duration-200 ease-out active:cursor-grabbing ${draggedId === image.id ? "pointer-events-none touch-none opacity-0" : dragOverId === image.id && draggedId !== null ? "translate-y-1 scale-[1.01] border-[#5A463A] shadow-xl" : "border-[#D8CCC4] shadow-sm hover:-translate-y-0.5 hover:shadow-md"}`}>
              <div className="relative h-52 bg-[#F7F4F1] sm:h-60">
              {src ? <Image src={src} alt={String(image.alt_text || "Property photo")} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover" draggable={false} unoptimized={Boolean(image.external_url)} /> : <div className="flex h-full items-center justify-center text-sm text-stone-500">No preview available</div>}
              <span className="absolute left-3 top-3 rounded-none bg-[#5A463A] px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-white">{image.id === coverId ? "Cover" : `Photo ${index + 1}`}</span>
              {isPreviewImage(image) ? <span className="absolute bottom-3 left-3 rounded-none bg-[#FFF6F3] px-2.5 py-1 text-[0.68rem] font-bold text-[#8A3325]">Preview image — replace with your photo</span> : null}
            </div>
            <div className="space-y-2 p-3">
              <label className="block text-xs font-bold text-stone-700">Category<select className="field mt-1 h-9 rounded-none px-3 py-1 text-xs" value={String(image.category ?? DEFAULT_UPLOAD_CATEGORY)} onChange={(event) => { if (event.target.value === ADD_CATEGORY_OPTION) { openCategoryForm(image.id); return; } changeImageCategory(image, event.target.value); }}>{categoryOptions.map((item) => <option key={item.category} value={item.category}>{item.category_label} ({categoryCountLabel(item.category, imageCountByCategory.get(item.category) ?? 0)})</option>)}<option value={ADD_CATEGORY_OPTION}>+ Add new category…</option></select></label>
              {categoryFormOpen && categoryFormImageId === image.id && <form className="rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-2" onSubmit={addCategory}><label className="block text-xs font-bold">New category<input autoFocus id={`new-category-${selectedId}-${image.id}`} className="field mt-1 h-9 rounded-none px-3 py-1 text-xs" maxLength={80} value={newCategoryLabel} onChange={(event) => setNewCategoryLabel(event.target.value)} placeholder="Type a category name" /></label><div className="mt-2 flex flex-wrap gap-1.5"><button type="submit" className="btn-primary inline-flex min-h-8 items-center justify-center gap-1.5 rounded-none px-2.5 py-1 text-xs" disabled={saving}><Plus size={13} /> {saving ? "Saving…" : "Save category"}</button><button type="button" className="btn-outline-dark min-h-8 rounded-none px-2.5 py-1 text-xs" onClick={() => { setCategoryFormOpen(false); setCategoryFormImageId(null); }} disabled={saving}>Cancel</button></div></form>}
              <div className="flex flex-wrap items-center gap-1.5 border-t border-[#EAE1DD] pt-2 text-[0.7rem] font-bold text-stone-700"><label className={`inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-none border px-2 py-1 ${isStagingCategory(String(image.category ?? DEFAULT_UPLOAD_CATEGORY)) ? "cursor-not-allowed border-[#EAE1DD] bg-[#F7F4F1] text-stone-400" : "border-[#D8CCC4] bg-[#F7F4F1]"}`} title={isStagingCategory(String(image.category ?? DEFAULT_UPLOAD_CATEGORY)) ? "Assign a room before publishing this photo" : "Show this photo in the public gallery"}><input type="checkbox" checked={!isStagingCategory(String(image.category ?? DEFAULT_UPLOAD_CATEGORY)) && image.is_visible !== false} disabled={isStagingCategory(String(image.category ?? DEFAULT_UPLOAD_CATEGORY))} onChange={(event) => updateImage(image.id, { is_visible: event.target.checked })} /> Visible</label><label className={`inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-none border px-2 py-1 ${image.id === coverId ? "border-[#5A463A] bg-[#F7F4F1] text-[#5A463A]" : "border-[#D8CCC4] bg-white hover:bg-[#F7F4F1]"}`}><input type="radio" name={`cover-${selectedId}`} checked={image.id === coverId} disabled={isStagingCategory(String(image.category ?? DEFAULT_UPLOAD_CATEGORY))} onChange={() => { setLocalImages((current) => current.map((item) => ({ ...item, is_cover: item.id === image.id }))); setDirty(true); }} /> {image.id === coverId ? "Cover photo" : "Set as cover"}</label><button type="button" aria-label="Move photo up" title="Move photo up" className="inline-flex min-h-8 w-9 items-center justify-center rounded-none border border-[#D8CCC4] px-2 py-1" disabled={!index} onClick={() => moveImage(index, index - 1)}><ChevronUp size={13} /></button><button type="button" aria-label="Move photo down" title="Move photo down" className="inline-flex min-h-8 w-9 items-center justify-center rounded-none border border-[#D8CCC4] px-2 py-1" disabled={index === sortedImages.length - 1} onClick={() => moveImage(index, index + 1)}><ChevronDown size={13} /></button><button type="button" aria-label="Delete photo" title="Delete photo" className="ml-auto inline-flex min-h-8 w-9 items-center justify-center rounded-none border border-[#E7BDB4] px-2 py-1 text-[#8A3325]" onClick={() => void remove(image)} disabled={saving}><Trash2 size={13} /></button></div>
            </div>
          </article>;
        })}
          </div>
        </section>)}
      </div> : <div className="mt-6 rounded-none border border-dashed border-[#B99D88] bg-[#F7F4F1] p-8 text-center text-sm text-stone-600">No photos uploaded yet. Add the first real photo above.</div>}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#EAE1DD] pt-5"><p className="text-sm text-stone-600" role={dirty ? "status" : undefined}>{dirty ? "Unsaved gallery changes. Save before leaving this house." : "Changes to category, order, cover, and visibility are saved together."}</p><button type="button" className={`inline-flex min-h-11 items-center gap-2 rounded-none px-4 py-2.5 text-sm font-bold transition ${dirty ? "bg-[#5A463A] text-white shadow-sm hover:bg-[#48362D]" : "border border-[#D8CCC4] bg-white text-stone-400 opacity-60"}`} disabled={!dirty || saving || uploading} onClick={() => void saveChanges()}><Save size={16} /> {saving ? "Saving…" : "Save gallery changes"}</button></div>
    </section>}
  </>;
}
