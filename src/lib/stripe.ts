import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export const hasStripeServerConfig = Boolean(process.env.STRIPE_SECRET_KEY);

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured on the server.");
  return new Stripe(secretKey);
}

type CheckoutBookingMetadata = {
  bookingId?: string;
  reference?: string;
  promotionId?: string;
  promotionCode?: string;
  promotionDiscount?: string;
  promotionRedemptionId?: string;
};

const getMetadata = (session: Stripe.Checkout.Session): CheckoutBookingMetadata => ({
  bookingId: session.metadata?.bookingId,
  reference: session.metadata?.reference,
  promotionId: session.metadata?.promotionId,
  promotionCode: session.metadata?.promotionCode,
  promotionDiscount: session.metadata?.promotionDiscount,
  promotionRedemptionId: session.metadata?.promotionRedemptionId,
});

export async function markBookingPaid(session: Stripe.Checkout.Session) {
  const { bookingId, reference } = getMetadata(session);
  if (!bookingId || !reference) throw new Error("Stripe session is missing booking metadata.");

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: readError } = await supabase
    .from("bookings")
    .select("id, reference, payment_status, booking_status, stripe_payment_intent_id, promotion_redemption_id")
    .eq("id", bookingId)
    .eq("reference", reference)
    .maybeSingle();
  if (readError) throw readError;
  if (!existing) throw new Error("Booking linked to Stripe session was not found.");

  let booking = existing;
  if (existing.payment_status !== "paid") {
    const { data: updatedBooking, error } = await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
        booking_status: "confirmed",
        stripe_payment_intent_id: paymentIntentId,
      })
      .eq("id", bookingId)
      .eq("reference", reference)
      .select("id, reference, payment_status, booking_status, stripe_payment_intent_id, promotion_redemption_id")
      .single();
    if (error) throw error;
    booking = updatedBooking;
  }

  const redemptionId = getMetadata(session).promotionRedemptionId ?? booking.promotion_redemption_id;
  if (redemptionId) {
    const { error: redemptionError } = await supabase.rpc("confirm_promotion_redemption", {
      p_redemption_id: redemptionId,
      p_booking_id: booking.id,
      p_session_id: session.id,
    });
    if (redemptionError) throw redemptionError;
  }
  return booking;
}

export async function markBookingCancelled(reference: string) {
  if (!reference) return;
  const supabase = createSupabaseAdminClient();
  const { data: booking, error: readError } = await supabase
    .from("bookings")
    .select("id, booking_status, promotion_redemption_id")
    .eq("reference", reference)
    .maybeSingle();
  if (readError) throw readError;
  if (!booking || booking.booking_status !== "pending_payment") return;
  const { error } = await supabase
    .from("bookings")
    .update({ booking_status: "cancelled" })
    .eq("reference", reference)
    .eq("booking_status", "pending_payment");
  if (error) throw error;
  if (booking.promotion_redemption_id) {
    const { error: releaseError } = await supabase.rpc("release_promotion_redemption", { p_booking_id: booking.id });
    if (releaseError) throw releaseError;
  }
}

export async function markBookingFailed(reference: string) {
  if (!reference) return;
  const supabase = createSupabaseAdminClient();
  const { data: booking, error: readError } = await supabase.from("bookings").select("id, booking_status, promotion_redemption_id").eq("reference", reference).maybeSingle();
  if (readError) throw readError;
  if (!booking || booking.booking_status !== "pending_payment") return;
  const { error } = await supabase.from("bookings").update({ payment_status: "failed", booking_status: "cancelled" }).eq("id", booking.id).eq("booking_status", "pending_payment");
  if (error) throw error;
  if (booking.promotion_redemption_id) {
    const { error: releaseError } = await supabase.rpc("release_promotion_redemption", { p_booking_id: booking.id });
    if (releaseError) throw releaseError;
  }
}

export async function markBookingRefunded(paymentIntentId: string) {
  if (!paymentIntentId) return;
  const supabase = createSupabaseAdminClient();
  const { data: booking, error: readError } = await supabase
    .from("bookings")
    .select("id, payment_status, promotion_redemption_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (readError) throw readError;
  if (!booking || booking.payment_status === "refunded") return;
  const { error } = await supabase.from("bookings").update({ payment_status: "refunded", booking_status: "cancelled" }).eq("id", booking.id);
  if (error) throw error;
  if (booking.promotion_redemption_id) {
    const { error: restoreError } = await supabase.rpc("restore_promotion_redemption", { p_redemption_id: booking.promotion_redemption_id });
    if (restoreError) throw restoreError;
  }
}
