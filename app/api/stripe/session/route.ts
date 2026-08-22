import { NextResponse } from "next/server";
import { getStripeClient, markBookingPaid } from "@/src/lib/stripe";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Stripe session ID is required." }, { status: 400 });

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
    if (session.status !== "complete" || session.payment_status !== "paid") {
      return NextResponse.json({ error: "This payment has not been completed." }, { status: 402 });
    }

    const booking = await markBookingPaid(session);
    return NextResponse.json({ paid: true, booking });
  } catch (error) {
    console.error("Stripe session verification failed", error);
    return NextResponse.json({ error: "We could not verify this payment yet. Please contact Serenity if you were charged." }, { status: 500 });
  }
}
