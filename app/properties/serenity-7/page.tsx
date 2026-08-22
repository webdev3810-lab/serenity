import { notFound } from "next/navigation";
import { PropertyDetailPage } from "@/src/components/PropertyDetailPage";
import { getPublicPropertyBySlug, getPublicProperties } from "@/src/lib/supabase/content";
import { pageMetadata } from "@/src/lib/seo";
import { todayIso } from "@/src/lib/booking";

export const metadata = pageMetadata("Serenity 7 - Whole", "View Serenity 7, a three-bedroom furnished house in Pakenham, Victoria, Australia.");
export const dynamic = "force-dynamic";

export default async function Page() {
  const [property, relatedProperties] = await Promise.all([getPublicPropertyBySlug("serenity-7"), getPublicProperties()]);
  if (!property) notFound();
  return <PropertyDetailPage property={property} relatedProperties={relatedProperties} today={todayIso()} />;
}
