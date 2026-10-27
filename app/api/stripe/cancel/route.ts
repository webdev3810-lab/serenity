import { NextResponse } from "next/server";
import { getStripeClient, markBookingCancelled } from "@/src/lib/stripe";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { canCancelCheckoutSession, verifyCheckoutCancellationToken } from "@/src/lib/checkoutCancellation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference, token } = body ?? {};
    if (!reference || typeof reference !== "string" || typeof token !== "string") {
      return NextResponse.json({ error: "A valid checkout cancellation link is required." }, { status: 400 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: "Checkout cancellation is unavailable." }, { status: 503 });

    const supabase = createSupabaseAdminClient();
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, stripe_checkout_session_id")
      .eq("reference", reference)
      .eq("booking_status", "pending_payment")
      .maybeSingle();
    if (error) throw error;

    if (!booking?.stripe_checkout_session_id || !verifyCheckoutCancellationToken(token, booking.id, reference, secretKey)) {
      return NextResponse.json({ error: "Checkout cancellation link is invalid or no longer active." }, { status: 404 });
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(booking.stripe_checkout_session_id);
    if (!canCancelCheckoutSession(session)) {
      return NextResponse.json({ error: "This checkout has already completed." }, { status: 409 });
    }
    const closedSession = session.status === "open" ? await stripe.checkout.sessions.expire(session.id) : session;
    if (closedSession.status !== "expired" || !canCancelCheckoutSession(closedSession)) {
      return NextResponse.json({ error: "This checkout could not be cancelled." }, { status: 409 });
    }
    await markBookingCancelled(reference, false);
    return NextResponse.json({ cancelled: true });
  } catch (error) {
    console.error("Stripe checkout cancellation failed", error);
    return NextResponse.json({ error: "We could not release the pending booking yet." }, { status: 500 });
  }
}
