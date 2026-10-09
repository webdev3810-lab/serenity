import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getStripeClient, markBookingCancelled, markBookingFailed, markBookingPaid, markBookingPaidFromPaymentIntent, markBookingRefunded } from "@/src/lib/stripe";
import { describeStripeEvent } from "@/src/lib/stripeMonitoring";

async function processStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") await markBookingPaid(session);
      break;
    }
    case "checkout.session.async_payment_succeeded":
      await markBookingPaid(event.data.object as Stripe.Checkout.Session);
      break;
    case "payment_intent.succeeded":
      await markBookingPaidFromPaymentIntent(event.data.object as Stripe.PaymentIntent);
      break;
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const reference = session.metadata?.reference;
      if (reference) await markBookingCancelled(reference);
      break;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const reference = session.metadata?.reference;
      if (reference) await markBookingFailed(reference);
      break;
    }
    // A declined attempt is not the end of Checkout: the guest can retry.
    case "payment_intent.payment_failed":
      break;
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (paymentIntentId && charge.amount_refunded >= charge.amount) await markBookingRefunded(paymentIntentId);
      break;
    }
  }
}

const supportedTypes = new Set([
  "checkout.session.completed", "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed", "checkout.session.expired",
  "payment_intent.succeeded", "payment_intent.payment_failed", "charge.refunded",
]);

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!webhookSecret || !signature || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  if ((secretKey.startsWith("sk_live_") && !event.livemode) || (secretKey.startsWith("sk_test_") && event.livemode)) {
    console.error("Stripe webhook mode does not match the configured secret key.");
    return NextResponse.json({ error: "Stripe mode mismatch." }, { status: 503 });
  }

  const supabase = createSupabaseAdminClient();
  const details = describeStripeEvent(event);
  try {
    let bookingId = details.bookingId;
    let reference = details.bookingReference;
    if (!bookingId && (details.paymentIntentId || details.sessionId)) {
      const query = supabase.from("bookings").select("id, reference");
      const { data, error } = await (details.paymentIntentId
        ? query.eq("stripe_payment_intent_id", details.paymentIntentId)
        : query.eq("stripe_checkout_session_id", details.sessionId!)).maybeSingle();
      if (error) throw error;
      bookingId = data?.id ?? null;
      reference = data?.reference ?? reference;
    }
    const { data: claimed, error: claimError } = await supabase.rpc("claim_stripe_payment_event", {
      p_stripe_event_id: event.id,
      p_event_type: event.type,
      p_booking_id: bookingId,
      p_booking_reference: reference,
      p_stripe_checkout_session_id: details.sessionId,
      p_stripe_payment_intent_id: details.paymentIntentId,
      p_amount_cents: details.amountCents,
      p_currency: details.currency,
      p_outcome: details.outcome,
      p_failure_code: details.failureCode,
      p_failure_message: details.failureMessage,
      p_livemode: event.livemode,
      p_event_created_at: new Date(event.created * 1000).toISOString(),
    });
    if (claimError) throw claimError;
    if (!claimed) {
      const { data: existing, error } = await supabase.from("stripe_payment_events").select("processing_status").eq("stripe_event_id", event.id).single();
      if (error) throw error;
      return existing.processing_status === "processed" || existing.processing_status === "ignored"
        ? NextResponse.json({ received: true, duplicate: true })
        : NextResponse.json({ error: "Stripe event is still processing." }, { status: 503 });
    }

    const willProcess = supportedTypes.has(event.type) && Boolean(bookingId);
    try {
      if (willProcess) await processStripeEvent(event);
      const { error } = await supabase.from("stripe_payment_events").update({
        processing_status: willProcess ? "processed" : "ignored",
        processed_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      }).eq("stripe_event_id", event.id);
      if (error) throw error;
      return NextResponse.json({ received: true });
    } catch (error) {
      const { error: logError } = await supabase.from("stripe_payment_events").update({
        processing_status: "failed",
        last_error: error instanceof Error ? error.message.slice(0, 500) : "Webhook processing failed",
        updated_at: new Date().toISOString(),
      }).eq("stripe_event_id", event.id);
      if (logError) console.error("Could not record failed Stripe event", logError);
      throw error;
    }
  } catch (error) {
    console.error("Stripe webhook processing failed", event.id, error);
    return NextResponse.json({ error: "Stripe webhook processing failed." }, { status: 500 });
  }
}
