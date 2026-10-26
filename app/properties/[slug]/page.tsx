import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PropertyDetailPage } from "@/src/components/PropertyDetailPage";
import { PropertyStructuredData } from "@/src/components/PropertyStructuredData";
import { todayIso } from "@/src/lib/booking";
import { pageMetadata } from "@/src/lib/seo";
import { getPublicProperties, getPublicPropertyBySlug } from "@/src/lib/supabase/content";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPublicPropertyBySlug(slug);
  if (!property) return pageMetadata("House not found");
  return pageMetadata(property.listingTitle?.trim() || property.name.replace(/\s+-\s+Whole$/i, ""), property.shortDescription || property.fullDescription);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const [property, relatedProperties] = await Promise.all([getPublicPropertyBySlug(slug), getPublicProperties()]);
  if (!property) notFound();
  return <><PropertyStructuredData property={property} /><PropertyDetailPage property={property} relatedProperties={relatedProperties} today={todayIso()} /></>;
}
