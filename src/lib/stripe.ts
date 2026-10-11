import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { sendBookingEmails, sendCorporateBookingEmails, sendUnsuccessfulBookingEmails } from "@/src/lib/transactionalEmail";
import { assertAudCheckout, bookingConfirmationState } from "@/src/lib/stripeMonitoring";

export const hasStripeServerConfig = Boolean(process.env.STRIPE_SECRET_KEY);

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured on the server.");
  return new Stripe(secretKey);
}

export async function markCorporateGroupPaid(session: Stripe.Checkout.Session) {
  const groupReference = session.metadata?.groupReference;
  if (!groupReference || session.payment_status !== "paid" || session.status !== "complete") throw new Error("Corporate checkout has not been paid.");
  const supabase = createSupabaseAdminClient();
  const { data: bookings, error: readError } = await supabase.from("bookings")
    .select("id, reference, group_reference, total, currency, booking_status, payment_status, stripe_checkout_session_id")
    .eq("group_reference", groupReference);
  if (readError) throw readError;
  if (!bookings?.length || bookings.length > 3 || bookings.some((booking) => booking.stripe_checkout_session_id !== session.id || booking.currency.toUpperCase() !== "AUD" || !["pending_payment", "confirmed", "checked_in", "checked_out"].includes(booking.booking_status))) {
    throw new Error("Corporate booking group does not match this Stripe session.");
  }
  const totalCents = bookings.reduce((sum, booking) => sum + Math.round(Number(booking.total) * 100), 0);
  if (session.currency?.toUpperCase() !== "AUD" || session.amount_total !== totalCents || !bookings.some((booking) => booking.id === session.metadata?.bookingId)) {
    throw new Error("Corporate checkout amount or currency does not match the booking group.");
  }
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const { data: updated, error } = await supabase.from("bookings")
    .update({ payment_status: "paid", booking_status: "confirmed", stripe_payment_intent_id: paymentIntentId })
    .eq("group_reference", groupReference)
    .eq("stripe_checkout_session_id", session.id)
    .eq("booking_status", "pending_payment")
    .select("id, reference, group_reference, payment_status, booking_status");
  if (error) throw error;
  const { data: confirmed, error: confirmationError } = await supabase.from("bookings")
    .select("id, reference, payment_status, booking_status")
    .eq("group_reference", groupReference).eq("stripe_checkout_session_id", session.id);
  if (confirmationError) throw confirmationError;
  if (confirmed?.length !== bookings.length || confirmed.some((booking) => booking.payment_status !== "paid" || !["confirmed", "checked_in", "checked_out"].includes(booking.booking_status))) {
    throw new Error("Corporate booking group was not fully confirmed.");
  }
  if (updated?.length) {
    try { await sendCorporateBookingEmails(groupReference); } catch (emailError) { console.error("Corporate booking email failed", emailError); }
  }
  return { reference: groupReference, total: totalCents / 100, currency: "AUD", bookings: confirmed };
}

export async function markCorporateGroupClosed(groupReference: string, failed = false) {
  if (!groupReference) return;
  const { data, error } = await createSupabaseAdminClient().from("bookings")
    .update({ booking_status: "cancelled", payment_status: "failed" })
    .eq("group_reference", groupReference).eq("booking_status", "pending_payment").select("id");
  if (error) throw error;
  if (data?.length) {
    try { await sendUnsuccessfulBookingEmails({ reference: groupReference, corporate: true, reason: failed ? "failed" : "expired" }); }
    catch (emailError) { console.error("Corporate unsuccessful booking email failed", emailError); }
  }
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
  if (session.payment_status !== "paid") throw new Error("Stripe checkout has not been paid.");

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: readError } = await supabase
    .from("bookings")
    .select("id, reference, payment_status, booking_status, stripe_payment_intent_id, stripe_checkout_session_id, currency, total, promotion_redemption_id")
    .eq("id", bookingId)
    .eq("reference", reference)
    .maybeSingle();
  if (readError) throw readError;
  if (!existing) throw new Error("Booking linked to Stripe session was not found.");
  assertAudCheckout(session, existing);
  const confirmationState = bookingConfirmationState(existing);

  let booking = existing;
  if (confirmationState === "pending") {
    const { data: updatedBooking, error } = await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
        booking_status: "confirmed",
        stripe_payment_intent_id: paymentIntentId,
      })
      .eq("id", bookingId)
      .eq("reference", reference)
      .eq("payment_status", "pending")
      .eq("booking_status", "pending_payment")
      .select("id, reference, payment_status, booking_status, stripe_payment_intent_id, stripe_checkout_session_id, currency, total, promotion_redemption_id")
      .maybeSingle();
    if (error) throw error;
    if (updatedBooking) {
      booking = updatedBooking;
      try {
        await sendBookingEmails(bookingId);
      } catch (emailError) {
        console.error("Booking confirmation email failed", emailError);
      }
    } else {
      const { data: paidBooking, error: paidBookingError } = await supabase.from("bookings")
        .select("id, reference, payment_status, booking_status, stripe_payment_intent_id, stripe_checkout_session_id, currency, total, promotion_redemption_id")
        .eq("id", bookingId).eq("reference", reference).single();
      if (paidBookingError) throw paidBookingError;
      bookingConfirmationState(paidBooking);
      if (paidBooking.payment_status !== "paid") throw new Error("Booking confirmation changed during payment processing.");
      booking = paidBooking;
    }
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

export async function markBookingPaidFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;
  const reference = paymentIntent.metadata?.reference;
  if (!bookingId || !reference) throw new Error("Stripe payment intent is missing booking metadata.");
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: readError } = await supabase.from("bookings").select("id, payment_status, booking_status, currency, total, stripe_checkout_session_id").eq("id", bookingId).eq("reference", reference).maybeSingle();
  if (readError) throw readError;
  if (!existing) throw new Error("Booking linked to Stripe payment intent was not found.");
  if (!existing.stripe_checkout_session_id || existing.currency.toUpperCase() !== "AUD" || paymentIntent.currency.toUpperCase() !== "AUD" || paymentIntent.amount !== Math.round(Number(existing.total) * 100)) throw new Error("Stripe payment intent does not match this AUD booking.");
  const session = await getStripeClient().checkout.sessions.retrieve(existing.stripe_checkout_session_id);
  if (session.payment_intent !== paymentIntent.id || session.payment_status !== "paid") throw new Error("Stripe payment intent does not match the paid checkout session.");
  if (bookingConfirmationState(existing) === "confirmed") return existing;
  const { data, error } = await supabase.from("bookings").update({ payment_status: "paid", booking_status: "confirmed", stripe_payment_intent_id: paymentIntent.id }).eq("id", bookingId).eq("reference", reference).eq("payment_status", "pending").eq("booking_status", "pending_payment").select("id, payment_status, booking_status").maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: current, error: currentError } = await supabase.from("bookings").select("id, payment_status, booking_status").eq("id", bookingId).eq("reference", reference).single();
    if (currentError) throw currentError;
    bookingConfirmationState(current);
    if (current.payment_status !== "paid") throw new Error("Booking confirmation changed during payment processing.");
    return current;
  }
  try {
    await sendBookingEmails(bookingId);
  } catch (emailError) {
    console.error("Booking confirmation email failed", emailError);
  }
  return data;
}

export async function markBookingCancelled(reference: string, notifyExpired = true) {
  if (!reference) return;
  const supabase = createSupabaseAdminClient();
  const { data: booking, error: readError } = await supabase
    .from("bookings")
    .select("id, booking_status, promotion_redemption_id")
    .eq("reference", reference)
    .maybeSingle();
  if (readError) throw readError;
  if (!booking || booking.booking_status !== "pending_payment") return;
  const { data, error } = await supabase
    .from("bookings")
    .update({ booking_status: "cancelled", payment_status: "failed" })
    .eq("reference", reference)
    .eq("booking_status", "pending_payment").select("id");
  if (error) throw error;
  if (notifyExpired && data?.length) {
    try { await sendUnsuccessfulBookingEmails({ reference, corporate: false, reason: "expired" }); }
    catch (emailError) { console.error("Expired booking email failed", emailError); }
  }
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
  const { data, error } = await supabase.from("bookings").update({ payment_status: "failed", booking_status: "cancelled" }).eq("id", booking.id).eq("booking_status", "pending_payment").select("id");
  if (error) throw error;
  if (data?.length) {
    try { await sendUnsuccessfulBookingEmails({ reference, corporate: false, reason: "failed" }); }
    catch (emailError) { console.error("Failed booking email failed", emailError); }
  }
  if (booking.promotion_redemption_id) {
    const { error: releaseError } = await supabase.rpc("release_promotion_redemption", { p_booking_id: booking.id });
    if (releaseError) throw releaseError;
  }
}

export async function markBookingRefunded(paymentIntentId: string) {
  if (!paymentIntentId) return;
  const supabase = createSupabaseAdminClient();
  const { data: bookings, error: readError } = await supabase
    .from("bookings")
    .select("id, payment_status, promotion_redemption_id")
    .eq("stripe_payment_intent_id", paymentIntentId);
  if (readError) throw readError;
  if (!bookings?.length || bookings.every((booking) => booking.payment_status === "refunded")) return;
  const { error } = await supabase.from("bookings").update({ payment_status: "refunded", booking_status: "cancelled" }).eq("stripe_payment_intent_id", paymentIntentId);
  if (error) throw error;
  for (const booking of bookings) {
    if (booking.promotion_redemption_id) {
      const { error: restoreError } = await supabase.rpc("restore_promotion_redemption", { p_redemption_id: booking.promotion_redemption_id });
      if (restoreError) throw restoreError;
    }
  }
}
