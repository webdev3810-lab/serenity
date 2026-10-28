import type Stripe from "stripe";

export type StripeEventOutcome = "pending" | "succeeded" | "declined" | "expired" | "refunded" | "partially_refunded" | "informational";

export function describeStripeEvent(event: Stripe.Event) {
  const object = event.data.object;
  const isSession = object.object === "checkout.session";
  const isIntent = object.object === "payment_intent";
  const isCharge = object.object === "charge";
  const isRefund = object.object === "refund";
  const session = isSession ? object as Stripe.Checkout.Session : null;
  const intent = isIntent ? object as Stripe.PaymentIntent : null;
  const charge = isCharge ? object as Stripe.Charge : null;
  const refund = isRefund ? object as Stripe.Refund : null;
  const metadata = session?.metadata ?? intent?.metadata ?? charge?.metadata ?? refund?.metadata;
  const paymentIntent = session?.payment_intent ?? charge?.payment_intent ?? refund?.payment_intent;
  const paymentIntentId = intent?.id ?? (typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id) ?? null;
  const amountCents = session?.amount_total ?? intent?.amount ?? refund?.amount ?? (event.type === "charge.refunded" ? charge?.amount_refunded : charge?.amount) ?? null;
  const currency = session?.currency ?? intent?.currency ?? charge?.currency ?? refund?.currency ?? null;
  const failure = intent?.last_payment_error;
  let outcome: StripeEventOutcome = "informational";
  if (event.type === "payment_intent.payment_failed" || event.type === "checkout.session.async_payment_failed") outcome = "declined";
  else if (event.type === "checkout.session.expired") outcome = "expired";
  else if (event.type === "charge.refunded" && charge) outcome = charge.amount_refunded >= charge.amount ? "refunded" : "partially_refunded";
  else if (refund) outcome = refund.status === "succeeded" ? "refunded" : refund.status === "pending" ? "pending" : "informational";
  else if (event.type === "payment_intent.succeeded" || event.type === "checkout.session.async_payment_succeeded" || (event.type === "checkout.session.completed" && session?.payment_status === "paid")) outcome = "succeeded";
  else if (event.type === "checkout.session.completed") outcome = "pending";

  return {
    bookingId: metadata?.bookingId ?? null,
    bookingReference: metadata?.reference ?? metadata?.bookingReference ?? null,
    sessionId: session?.id ?? null,
    paymentIntentId,
    amountCents,
    currency: currency?.toUpperCase() ?? null,
    outcome,
    failureCode: failure?.decline_code ?? failure?.code ?? null,
    failureMessage: failure?.message?.slice(0, 500) ?? null,
  };
}

export function assertAudCheckout(session: Stripe.Checkout.Session, booking: { id: string; stripe_checkout_session_id: string | null; currency: string; total: number }) {
  if (booking.stripe_checkout_session_id !== session.id) throw new Error("Stripe session does not match this booking.");
  if (booking.currency.toUpperCase() !== "AUD" || session.currency?.toUpperCase() !== "AUD") throw new Error("Stripe checkout currency must be AUD.");
  if (session.amount_total !== Math.round(Number(booking.total) * 100)) throw new Error("Stripe checkout amount does not match the booking total.");
}

export function bookingConfirmationState(booking: { payment_status: string; booking_status: string }): "pending" | "confirmed" {
  if (booking.payment_status === "pending" && booking.booking_status === "pending_payment") return "pending";
  if (booking.payment_status === "paid" && ["confirmed", "checked_in", "checked_out"].includes(booking.booking_status)) return "confirmed";
  throw new Error("This booking is no longer eligible for payment confirmation.");
}
