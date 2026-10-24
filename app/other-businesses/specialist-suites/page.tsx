import { pageMetadata } from "@/src/lib/seo";
import { OtherBusinessDetailPage } from "@/src/components/OtherBusinessDetailPage";
import { getOtherBusinessesContent } from "@/src/lib/supabase/otherBusinesses";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "Specialist Suites & Allied Health Hub",
  "Explore consulting suites and allied health services at Specialist Suites & Allied Health Hub in Skye, Victoria.",
);

export default async function SpecialistSuitesPage() {
  const content = await getOtherBusinessesContent();
  return <OtherBusinessDetailPage business={content.businesses.specialistSuites} kind="specialistSuites" />;
}
