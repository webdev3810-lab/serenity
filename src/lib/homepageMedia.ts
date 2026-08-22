const UNSPLASH_HOST = "images.unsplash.com";
const AIRBNB_PREVIEW_HOST = "a0.muscache.com";

/**
 * Homepage imagery should come from an uploaded local asset or Supabase
 * Storage. External demo/preview URLs are deliberately excluded so they do
 * not become the public fallback when the CMS has no published media.
 */
export const isApprovedHomepageMediaSource = (src: string) => {
  const value = src.trim().toLowerCase();

  if (!value || value === "/file.svg") return false;
  if (value.includes(UNSPLASH_HOST) || value.includes(AIRBNB_PREVIEW_HOST)) return false;

  return value.startsWith("/") || value.includes(".supabase.co/");
};
