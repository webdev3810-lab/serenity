import { ContactPage } from "@/src/components/ContentPages";
import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata(
  "Contact & Location | Serenity Furnished Houses in Pakenham VIC",
  "Contact Serenity for furnished houses in Pakenham and learn about the station, town centre, and local area nearby.",
);

export default function Page() {
  return <ContactPage />;
}
