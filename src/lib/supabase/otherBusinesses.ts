import "server-only";
import { DEFAULT_OTHER_BUSINESSES, normalizeOtherBusinesses } from "@/src/lib/otherBusinessesContent";
import { isSupabaseConfigured } from "./config";
import { createSupabasePublicClient } from "./server";

export async function getOtherBusinessesContent() {
  if (!isSupabaseConfigured) return structuredClone(DEFAULT_OTHER_BUSINESSES);
  try {
    const { data, error } = await createSupabasePublicClient().from("homepage_content").select("content").eq("page_key", "other-businesses").eq("published", true).maybeSingle();
    if (!error && data) return normalizeOtherBusinesses(data.content);
  } catch { /* Keep the public pages available if content storage is unavailable. */ }
  return structuredClone(DEFAULT_OTHER_BUSINESSES);
}
