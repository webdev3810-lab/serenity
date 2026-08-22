import { ReviewBookingPage } from "@/src/components/BookingFlow";
import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata("Review your stay");

export default function Page() {
  return <ReviewBookingPage />;
}
