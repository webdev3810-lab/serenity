import { ConfirmationPage } from "@/src/components/BookingFlow";
import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata("Booking confirmation");

export default function Page() {
  return <ConfirmationPage />;
}
