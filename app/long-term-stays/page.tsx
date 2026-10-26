import { LongTermPage } from "@/src/components/ContentPages";
import { pageMetadata } from "@/src/lib/seo";
import { getPublicPageCopy, getPublicProperties } from "@/src/lib/supabase/content";

export const metadata = pageMetadata("Long-term stays");
export const dynamic = "force-dynamic";

export default async function Page() {
  const [properties, copy] = await Promise.all([getPublicProperties(), getPublicPageCopy()]);
  return <LongTermPage properties={properties} copy={copy} />;
}
