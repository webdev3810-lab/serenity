import { NextResponse } from "next/server";
import { getSuperAdminUser } from "@/src/lib/supabase/auth";
import { getStripeClient, hasStripeServerConfig } from "@/src/lib/stripe";

export async function GET() {
  if (!await getSuperAdminUser()) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  if (!hasStripeServerConfig) return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });

  try {
    const stripe = getStripeClient();
    const [balance, account, payoutList, transactionList] = await Promise.all([
      stripe.balance.retrieve(),
      stripe.accounts.retrieveCurrent(),
      stripe.payouts.list({ limit: 20 }),
      stripe.balanceTransactions.list({ limit: 20 }),
    ]);
    const available = balance.available.find((item) => item.currency === "aud");
    const pending = balance.pending.find((item) => item.currency === "aud");
    const sources = Object.entries(available?.source_types ?? {}).filter(([, amount]) => typeof amount === "number" && amount > 0);
    // Only return masked payout details to the admin UI; Stripe retains account numbers.
    const payoutAccounts = (account.external_accounts?.data ?? [])
      .filter((externalAccount) => externalAccount.currency?.toLowerCase() === "aud")
      .map((externalAccount) => ({
        type: externalAccount.object === "bank_account" ? "bank" : "card",
        name: externalAccount.object === "bank_account" ? externalAccount.bank_name : externalAccount.brand,
        last4: externalAccount.last4,
        defaultForCurrency: externalAccount.default_for_currency ?? null,
      }));

    return NextResponse.json({
      mode: balance.livemode ? "live" : "test",
      availableCents: available?.amount ?? 0,
      pendingCents: pending?.amount ?? 0,
      payoutsEnabled: account.payouts_enabled,
      payoutSchedule: account.settings?.payouts?.schedule?.interval ?? "unknown",
      payoutAccounts,
      manualPayoutSupported: account.payouts_enabled && sources.length <= 1 && (!sources.length || ["card", "bank_account", "fpx"].includes(sources[0][0])),
      payouts: payoutList.data.map((payout) => ({
        id: payout.id, amountCents: payout.amount, currency: payout.currency,
        status: payout.status, automatic: payout.automatic,
        created: payout.created, arrivalDate: payout.arrival_date,
      })),
      transactions: transactionList.data.map((transaction) => ({
        id: transaction.id, created: transaction.created, type: transaction.type,
        description: transaction.description, amountCents: transaction.amount,
        feeCents: transaction.fee, netCents: transaction.net,
        currency: transaction.currency, status: transaction.status,
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Stripe earnings could not load", error);
    return NextResponse.json({ error: "Stripe earnings are unavailable. Check the Stripe connection and try again." }, { status: 503 });
  }
}
