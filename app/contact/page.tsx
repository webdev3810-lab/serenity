import { ContactPage } from "@/src/components/ContentPages";
import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata("Contact");

export default function Page() {
  return <ContactPage />;
}
