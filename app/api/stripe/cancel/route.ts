import { NextResponse } from "next/server";
import { getStripeClient, markBookingCancelled } from "@/src/lib/stripe";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { reference } = await request.json();
    if (!reference || typeof reference !== "string") return NextResponse.json({ error: "Booking reference is required." }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("stripe_checkout_session_id")
      .eq("reference", reference)
      .eq("booking_status", "pending_payment")
      .maybeSingle();
    if (error) throw error;

    if (booking?.stripe_checkout_session_id) {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(booking.stripe_checkout_session_id);
      if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
    }
    await markBookingCancelled(reference);
    return NextResponse.json({ cancelled: true });
  } catch (error) {
    console.error("Stripe checkout cancellation failed", error);
    return NextResponse.json({ error: "We could not release the pending booking yet." }, { status: 500 });
  }
}
