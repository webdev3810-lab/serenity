import { PolicyPage } from "@/src/components/ContentPages";
import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata("Terms and Conditions");

export default function Page() {
  return <PolicyPage type="Terms and Conditions" />;
}
