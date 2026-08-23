import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PropertyDetailPage } from "@/src/components/PropertyDetailPage";
import { getPublicPropertyBySlug, getPublicProperties } from "@/src/lib/supabase/content";
import { pageMetadata } from "@/src/lib/seo";
import { todayIso } from "@/src/lib/booking";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const property = await getPublicPropertyBySlug("serenity-7");
  if (!property) return pageMetadata("House not found");
  const title = property.listingTitle?.trim() || property.name.replace(/\s+-\s+Whole$/i, "");
  return pageMetadata(title, property.shortDescription || property.fullDescription);
}

export default async function Page() {
  const [property, relatedProperties] = await Promise.all([getPublicPropertyBySlug("serenity-7"), getPublicProperties()]);
  if (!property) notFound();
  return <PropertyDetailPage property={property} relatedProperties={relatedProperties} today={todayIso()} />;
}
