import { CorporateStaysPage } from "@/src/components/CorporateStaysPage";
import { todayIso } from "@/src/lib/booking";
import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata("Corporate Accommodation & Team Housing in Pakenham VIC");

export default function Page() {
  return <CorporateStaysPage today={todayIso()} />;
}
