import { GuestDetailsPage } from "@/src/components/BookingFlow";
import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata("Guest details");

export default function Page() {
  return <GuestDetailsPage />;
}
