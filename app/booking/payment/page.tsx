import { PaymentPage } from "@/src/components/BookingFlow";
import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata("Stripe payment");

export default function Page() {
  return <PaymentPage />;
}
