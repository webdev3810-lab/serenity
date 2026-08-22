import { PolicyPage } from "@/src/components/ContentPages";
import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata("Privacy Policy");

export default function Page() {
  return <PolicyPage type="Privacy Policy" />;
}
