import { NextResponse } from "next/server";
import { getSuperAdminUser } from "@/src/lib/supabase/auth";
import { getStripeClient, hasStripeServerConfig } from "@/src/lib/stripe";

const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const admin = await getSuperAdminUser();
  if (!admin) return NextResponse.json({ error: "Only a super admin can request a payout." }, { status: 403 });
  if (!hasStripeServerConfig) return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid payout request origin." }, { status: 403 });
  }

  const idempotencyKey = request.headers.get("idempotency-key") ?? "";
  if (!requestIdPattern.test(idempotencyKey)) return NextResponse.json({ error: "Invalid payout request ID." }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid payout request." }, { status: 400 }); }
  const fields = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const amountCents = fields.amountCents;
  if (!Number.isSafeInteger(amountCents) || typeof amountCents !== "number" || amountCents < 100 || fields.confirmation !== "WITHDRAW") {
    return NextResponse.json({ error: "Enter an amount of at least AUD $1.00 and confirm the withdrawal." }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const [account, balance] = await Promise.all([stripe.accounts.retrieveCurrent(), stripe.balance.retrieve()]);
    if (!account.payouts_enabled) return NextResponse.json({ error: "Stripe has not enabled payouts for this account. Check your Stripe Dashboard." }, { status: 409 });
    const available = balance.available.find((item) => item.currency === "aud");
    if (!available || amountCents > available.amount) return NextResponse.json({ error: "The requested amount exceeds the available AUD balance." }, { status: 409 });
    const sources = Object.entries(available.source_types ?? {}).filter(([, amount]) => typeof amount === "number" && amount > 0);
    if (sources.length > 1) return NextResponse.json({ error: "This balance has multiple payment sources. Make this payout in the Stripe Dashboard." }, { status: 409 });
    const source = sources[0]?.[0];
    const sourceType = source === "card" || source === "bank_account" || source === "fpx" ? source : undefined;
    if (source && !sourceType) {
      return NextResponse.json({ error: "This balance type requires a payout in the Stripe Dashboard." }, { status: 409 });
    }

    const payout = await stripe.payouts.create({
      amount: amountCents,
      currency: "aud",
      method: "standard",
      description: "Serenity admin withdrawal",
      metadata: { source: "serenity_admin", requested_by: admin.user.id },
      ...(sourceType ? { source_type: sourceType } : {}),
    }, { idempotencyKey });
    return NextResponse.json({
      id: payout.id, amountCents: payout.amount, currency: payout.currency,
      status: payout.status, arrivalDate: payout.arrival_date,
      mode: payout.livemode ? "live" : "test",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Stripe payout request failed", error);
    return NextResponse.json({ error: "Stripe could not confirm this payout. Check your Stripe Dashboard before trying again to avoid a duplicate withdrawal." }, { status: 502 });
  }
}
