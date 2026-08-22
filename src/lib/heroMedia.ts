export const HERO_MEDIA_BUCKET = "hero-media";
export const HERO_MEDIA_MAX_ITEMS = 5;
export const HERO_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const HERO_VIDEO_MAX_BYTES = 20 * 1024 * 1024;

export const HERO_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const HERO_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;
export const HERO_MEDIA_TYPES = [...HERO_IMAGE_TYPES, ...HERO_VIDEO_TYPES] as const;

export type HeroMediaMimeType = (typeof HERO_MEDIA_TYPES)[number];
export type HeroMediaKind = "image" | "video";

export function heroMediaKind(contentType: string): HeroMediaKind | null {
  if ((HERO_IMAGE_TYPES as readonly string[]).includes(contentType)) return "image";
  if ((HERO_VIDEO_TYPES as readonly string[]).includes(contentType)) return "video";
  return null;
}

export function heroMediaMaxBytes(contentType: string) {
  return heroMediaKind(contentType) === "video" ? HERO_VIDEO_MAX_BYTES : HERO_IMAGE_MAX_BYTES;
}

export function validateHeroMediaFile({ contentType, size }: { contentType: unknown; size: unknown }) {
  const normalizedType = typeof contentType === "string" ? contentType.toLowerCase() : "";
  const normalizedSize = typeof size === "number" ? size : Number(size);
  const kind = heroMediaKind(normalizedType);
  if (!kind) return "Use JPG, JPEG, PNG, WebP, or AVIF images, or MP4/WebM videos.";
  if (!Number.isFinite(normalizedSize) || normalizedSize <= 0) return "The selected file is empty or its size could not be read.";
  const maxBytes = heroMediaMaxBytes(normalizedType);
  if (normalizedSize > maxBytes) return `${kind === "video" ? "Videos" : "Images"} must be no larger than ${kind === "video" ? "20 MB" : "5 MB"}.`;
  return null;
}

export function safeHeroMediaName(fileName: string, contentType: string) {
  const baseName = fileName
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1] ?? "media";
  return `${baseName || "hero-media"}.${extension}`;
}
