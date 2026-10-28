import { getStripeClient } from "@/src/lib/stripe";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type PaidBooking = {
  id: string;
  reference: string;
  group_reference: string | null;
  total: number;
  currency: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
};

const cents = (amount: number) => Math.round(Number(amount) * 100);

export async function refundCancelledBooking(booking: PaidBooking, amount: number) {
  if (!booking.stripe_checkout_session_id || !booking.stripe_payment_intent_id || booking.currency.toUpperCase() !== "AUD") {
    throw new Error("This paid booking has no verified AUD Stripe payment. Review it in Stripe before cancelling.");
  }

  const stripe = getStripeClient();
  const paymentIntentId = booking.stripe_payment_intent_id;
  const [session, paymentIntent, existingRefunds] = await Promise.all([
    stripe.checkout.sessions.retrieve(booking.stripe_checkout_session_id),
    stripe.paymentIntents.retrieve(paymentIntentId),
    stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 }),
  ]);
  const sessionIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (session.payment_status !== "paid" || sessionIntentId !== paymentIntentId || paymentIntent.status !== "succeeded" || paymentIntent.currency.toUpperCase() !== "AUD") {
    throw new Error("The booking does not match a completed AUD Stripe payment. No refund was made.");
  }

  const supabase = createSupabaseAdminClient();
  const { data: siblings, error } = await supabase.from("bookings")
    .select("id, total, currency, stripe_checkout_session_id")
    .eq("stripe_payment_intent_id", paymentIntentId);
  if (error) throw error;
  if (!siblings?.some((item) => item.id === booking.id)
    || siblings.some((item) => item.stripe_checkout_session_id !== session.id || item.currency.toUpperCase() !== "AUD")
    || siblings.reduce((sum, item) => sum + cents(item.total), 0) !== paymentIntent.amount_received
    || session.amount_total !== paymentIntent.amount_received) {
    throw new Error("The Stripe charge does not match the booking total. No refund was made.");
  }

  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > cents(booking.total) || existingRefunds.has_more) throw new Error("The refund amount needs review in Stripe. No refund was made.");
  const activeRefunds = existingRefunds.data.filter((refund) => !["failed", "canceled"].includes(refund.status ?? ""));
  const priorRefund = activeRefunds.find((refund) => refund.metadata?.bookingId === booking.id);
  if (priorRefund) {
    if (priorRefund.amount !== amount) throw new Error("An existing Stripe refund has a different amount. Review it in Stripe.");
    return priorRefund;
  }
  if (activeRefunds.some((refund) => !siblings.some((item) => item.id === refund.metadata?.bookingId))
    || activeRefunds.reduce((sum, refund) => sum + refund.amount, 0) + amount > paymentIntent.amount_received) {
    throw new Error("This payment has other refunds that need review in Stripe. No refund was made.");
  }

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount,
    metadata: { bookingId: booking.id, bookingReference: booking.reference, groupReference: booking.group_reference ?? "", source: "admin_cancellation" },
  }, { idempotencyKey: `serenity-admin-cancel-${booking.id}` });
  if (refund.status === "failed" || refund.status === "canceled") throw new Error(`Stripe could not refund this booking (${refund.status}). The booking was not cancelled.`);
  return refund;
}
