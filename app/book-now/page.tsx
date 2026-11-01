import { BookNowPage } from "@/src/components/BookNowPage";
import { pageMetadata } from "@/src/lib/seo";
import { getPublicProperties } from "@/src/lib/supabase/content";
import "./book-now.css";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata("Choose your home", "Choose a Serenity home, then check availability and book on its property page.");

type Props = { searchParams: Promise<{ home?: string | string[] }> };

export default async function Page({ searchParams }: Props) {
  const [properties, query] = await Promise.all([getPublicProperties(), searchParams]);
  const requestedHome = typeof query.home === "string" ? query.home : undefined;
  const originSlug = properties.find((property) => property.slug === requestedHome)?.slug;
  return <BookNowPage properties={properties} originSlug={originSlug} />;
}
