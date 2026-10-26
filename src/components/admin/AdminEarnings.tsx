"use client";

import { ArrowRight, ArrowUpRight, CheckCircle2, History, Landmark, RefreshCw, Wallet } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useAdminTheme } from "@/src/components/AdminTheme";
import { useAdminPagination, useAdminWorkspace } from "./AdminUI";

type Payout = {
  id: string; amountCents: number; currency: string; status: string;
  automatic: boolean; created: number; arrivalDate: number;
};
type BalanceTransaction = {
  id: string; created: number; type: string; description: string | null;
  amountCents: number; feeCents: number; netCents: number;
  currency: string; status: string;
};
type EarningsData = {
  mode: "live" | "test";
  availableCents: number;
  pendingCents: number;
  payoutsEnabled: boolean;
  payoutSchedule: string;
  payoutAccounts: { type: "bank" | "card"; name: string | null; last4: string; defaultForCurrency: boolean | null }[];
  manualPayoutSupported: boolean;
  payouts: Payout[];
  transactions: BalanceTransaction[];
};

const aud = (cents: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);
const date = (seconds: number) => new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeZone: "Australia/Melbourne" }).format(new Date(seconds * 1000));
const payoutUrl = (id: string, mode: "live" | "test") => `https://dashboard.stripe.com/${mode === "test" ? "test/" : ""}payouts/${encodeURIComponent(id)}`;
const dashboardUrl = (mode: "live" | "test") => `https://dashboard.stripe.com/${mode === "test" ? "test/" : ""}payouts`;
const payoutSettingsUrl = (mode: "live" | "test") => `https://dashboard.stripe.com/${mode === "test" ? "test/" : ""}settings/payouts`;

function parseAudCents(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [dollars, cents = ""] = value.trim().split(".");
  const amount = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount >= 100 ? amount : null;
}

export function AdminEarnings() {
  const { confirm } = useAdminWorkspace();
  const { theme } = useAdminTheme();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeView, setActiveView] = useState<"withdraw" | "history">("withdraw");
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/earnings", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load Stripe earnings.");
      setData(result as EarningsData);
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not load Stripe earnings.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { const initial = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(initial); }, [load]);
  const amountCents = parseAudCents(amount);
  const payoutAccounts = data?.payoutAccounts ?? [];
  const { visible: visiblePayouts, pagination: payoutPagination } = useAdminPagination(data?.payouts ?? []);
  const { visible: visibleTransactions, pagination: transactionPagination } = useAdminPagination(data?.transactions ?? []);
  const defaultPayoutAccount = payoutAccounts.find((account) => account.defaultForCurrency === true);
  const canSubmit = Boolean(data && data.payoutsEnabled && data.manualPayoutSupported && amountCents && amountCents <= data.availableCents && confirmation === "WITHDRAW" && !submitting);

  const withdraw = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current || !canSubmit || !data || amountCents === null) return;
    inFlight.current = true;
    try {
      const accepted = await confirm({
        title: data.mode === "live" ? "Confirm live Stripe payout" : "Confirm test Stripe payout",
        description: `Send ${aud(amountCents)} to the default AUD payout account configured in Stripe? This creates a ${data.mode === "live" ? "real" : "test"} standard payout. ${defaultPayoutAccount ? `Stripe identifies the default account as ending ${defaultPayoutAccount.last4}; confirm it in Stripe before continuing.` : "Stripe has not shared the current destination with this page; verify it in Stripe before continuing."}`,
        confirmLabel: `Withdraw ${aud(amountCents)}`,
        destructive: true,
      });
      if (!accepted) return;
      setSubmitting(true); setError(""); setNotice("");
      const response = await fetch("/api/admin/earnings/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ amountCents, confirmation: "WITHDRAW" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Stripe could not confirm the payout.");
      setAmount(""); setConfirmation("");
      setNotice(`${aud(result.amountCents)} payout requested. Stripe status: ${result.status}. Review it in Stripe for its arrival date.`);
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Payout status is unknown. Check Stripe before trying again.");
    } finally { setSubmitting(false); inFlight.current = false; }
  };

  return <div className="mx-auto max-w-4xl space-y-5">
    <header className="admin-page-header flex flex-wrap items-end justify-between gap-4">
      <div><p className="admin-section-kicker">Stripe account</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Earnings wallet</h2><p className="mt-2 max-w-2xl text-sm text-[var(--admin-muted)]">Your Stripe balance and payouts in one place. Figures are account-wide, not a profit report.</p></div>
      <button type="button" className="admin-button min-h-11 gap-2" disabled={loading || submitting} onClick={() => { setLoading(true); void load(); }}><RefreshCw size={16} /> Refresh</button>
    </header>
    {error && <div className="admin-notice is-error" role="alert">{error}</div>}
    {error && !data && <a className="admin-button inline-flex min-h-11 gap-2" href="https://dashboard.stripe.com/payouts" target="_blank" rel="noopener noreferrer">Open Stripe Dashboard <ArrowUpRight size={16} /></a>}
    {notice && <div className="admin-notice is-success" role="status">{notice}</div>}
    {loading && !data && <div className="admin-card p-6 text-sm text-[var(--admin-muted)]" role="status">Loading Stripe balance…</div>}
    {data && <section className="admin-earnings-wallet overflow-hidden rounded-[28px] border border-[var(--wallet-line)] bg-[var(--wallet-bg)] text-[var(--wallet-text)] shadow-[0_18px_48px_rgba(15,47,66,0.08)]" data-theme={theme} aria-label="Stripe earnings wallet">
      <div className="p-5 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--wallet-surface)] text-[var(--wallet-icon)]"><Wallet size={23} aria-hidden="true" /></span><div><h3 className="text-xl font-semibold tracking-wide sm:text-2xl">MY EARNINGS</h3><p className="text-xs text-[var(--wallet-muted)]">Stripe · AUD</p></div></div><span className="rounded-full border border-[var(--wallet-line)] bg-[var(--wallet-badge-bg)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--wallet-icon)]">{data.mode === "live" ? "Live" : "Test mode"}</span></div>
        <div className="mt-9"><p className="text-sm text-[var(--wallet-muted)]">Available Stripe balance</p><strong className="mt-1 block text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">{aud(data.availableCents)}</strong><div className="mt-7 flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--wallet-divider)] pt-4 text-sm"><span className="text-[var(--wallet-muted)]">Pending balance</span><strong className="text-lg font-medium tabular-nums">{aud(data.pendingCents)}</strong></div></div>
        <div className="mt-8 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--wallet-surface)] p-1" role="tablist" aria-label="Earnings views"><button type="button" role="tab" id="earnings-withdraw-tab" aria-selected={activeView === "withdraw"} aria-controls="earnings-withdraw-panel" className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition-colors ${activeView === "withdraw" ? "bg-[var(--wallet-selected-bg)] text-[var(--wallet-text)] shadow-sm" : "text-[var(--wallet-muted)] hover:text-[var(--wallet-text)]"}`} onClick={() => setActiveView("withdraw")}>Withdraw</button><button type="button" role="tab" id="earnings-history-tab" aria-selected={activeView === "history"} aria-controls="earnings-history-panel" className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition-colors ${activeView === "history" ? "bg-[var(--wallet-selected-bg)] text-[var(--wallet-text)] shadow-sm" : "text-[var(--wallet-muted)] hover:text-[var(--wallet-text)]"}`} onClick={() => setActiveView("history")}>History</button></div>
        {activeView === "withdraw" ? <div id="earnings-withdraw-panel" role="tabpanel" aria-labelledby="earnings-withdraw-tab" className="pt-7">
          <form onSubmit={(event) => void withdraw(event)} className="space-y-6">
            <div><label htmlFor="earnings-amount" className="block text-sm font-medium text-[var(--wallet-label)]">Withdrawal amount (AUD)</label><div className="admin-earnings-amount-field mt-2 flex items-center rounded-2xl border border-[var(--wallet-line)] bg-[var(--wallet-field)] px-4"><span className="text-lg text-[var(--wallet-muted)]">$</span><input id="earnings-amount" className="min-h-14 w-full bg-transparent px-3 text-xl tabular-nums text-[var(--wallet-text)] outline-none placeholder:text-[var(--wallet-placeholder)]" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={submitting || !data.payoutsEnabled || !data.manualPayoutSupported} /></div><div className="mt-3 grid grid-cols-4 gap-2">{[100, 250, 500].map((preset) => <button key={preset} type="button" className="min-h-10 rounded-full border border-[var(--wallet-line)] bg-[var(--wallet-bg)] px-2 text-xs font-medium text-[var(--wallet-label)] hover:bg-[var(--wallet-surface)] disabled:opacity-40 sm:text-sm" onClick={() => setAmount(preset.toFixed(2))} disabled={submitting || !data.payoutsEnabled || !data.manualPayoutSupported || data.availableCents < preset * 100}>{aud(preset * 100)}</button>)}<button type="button" className="min-h-10 rounded-full border border-[var(--wallet-max-border)] bg-[var(--wallet-max-bg)] px-2 text-xs font-medium text-[var(--wallet-max-text)] hover:bg-[var(--wallet-max-hover)] disabled:opacity-40 sm:text-sm" onClick={() => setAmount((data.availableCents / 100).toFixed(2))} disabled={submitting || !data.payoutsEnabled || !data.manualPayoutSupported || data.availableCents < 100}>Max</button></div>{amountCents !== null && amountCents > data.availableCents && <p className="mt-2 text-sm text-[var(--wallet-danger)]">Amount exceeds the available balance.</p>}</div>
            <div className="rounded-2xl border border-[var(--wallet-line)] bg-[var(--wallet-surface)] p-4"><p className="text-sm text-[var(--wallet-muted)]">Destination</p>{defaultPayoutAccount ? <div className="mt-3 flex items-center gap-3"><Landmark size={21} className="shrink-0 text-[var(--wallet-accent)]" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="font-medium">{defaultPayoutAccount.name || (defaultPayoutAccount.type === "bank" ? "Linked bank account" : "Linked debit card")}</p><p className="text-sm text-[var(--wallet-muted)]">Account ending in {defaultPayoutAccount.last4} · Default for AUD</p></div><CheckCircle2 size={20} className="shrink-0 text-[var(--wallet-success)]" aria-label="Default account verified by Stripe" /></div> : <div className="mt-3 flex items-start gap-3"><Landmark size={21} className="mt-0.5 shrink-0 text-[var(--wallet-accent)]" aria-hidden="true" /><div><p className="font-medium">Default AUD payout account</p><p className="mt-1 text-sm leading-relaxed text-[var(--wallet-muted)]">Stripe hasn’t shared its bank details with this page. Check the destination in Stripe before withdrawing.</p></div></div>}<a className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-[var(--wallet-accent-text)] underline underline-offset-4" href={payoutSettingsUrl(data.mode)} target="_blank" rel="noopener noreferrer">View payout bank in Stripe <ArrowUpRight size={15} /></a></div>
            {!data.payoutsEnabled && <p className="text-sm text-[var(--wallet-danger)]">Payouts are not enabled on this Stripe account. Complete setup in Stripe first.</p>}
            {!data.manualPayoutSupported && data.payoutsEnabled && <p className="text-sm text-[var(--wallet-muted)]">This balance has multiple payment sources. Use Stripe Dashboard to choose the payout source.</p>}
            <div><label htmlFor="earnings-confirmation" className="block text-sm font-medium text-[var(--wallet-label)]">Type WITHDRAW to confirm</label><input id="earnings-confirmation" className="mt-2 min-h-12 w-full rounded-xl border border-[var(--wallet-line)] bg-[var(--wallet-field)] px-4 text-[var(--wallet-text)] outline-none placeholder:text-[var(--wallet-placeholder)]" type="text" autoComplete="off" placeholder="WITHDRAW" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={submitting || !data.payoutsEnabled || !data.manualPayoutSupported} /></div>
            <button type="submit" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--wallet-cta-bg)] px-5 text-sm font-semibold text-[var(--wallet-cta-text)] transition-colors hover:bg-[var(--wallet-cta-hover)] disabled:cursor-not-allowed disabled:bg-[var(--wallet-cta-disabled-bg)] disabled:text-[var(--wallet-cta-disabled-text)]" disabled={!canSubmit}>{submitting ? "Requesting payout…" : <>Review withdrawal request <ArrowRight size={18} /></>}</button><p className="text-center text-xs leading-relaxed text-[var(--wallet-subtle)]">A second confirmation appears before any payout request. Stripe controls eligibility and arrival time.</p>
          </form>
        </div> : <div id="earnings-history-panel" role="tabpanel" aria-labelledby="earnings-history-tab" className="space-y-7 pt-7"><div><div className="flex items-center gap-2"><History size={18} className="text-[var(--wallet-accent)]" aria-hidden="true" /><h4 className="font-semibold">Recent payouts</h4></div><p className="mt-1 text-xs text-[var(--wallet-subtle)]">Latest automatic and manual payouts.</p><ul className="mt-3 divide-y divide-[var(--wallet-divider)]">{visiblePayouts.map((payout) => <li key={payout.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><p className="font-medium">{payout.currency === "aud" ? aud(payout.amountCents) : `${payout.amountCents / 100} ${payout.currency.toUpperCase()}`}</p><p className="text-xs text-[var(--wallet-subtle)]">{date(payout.created)} · {payout.automatic ? "Automatic" : "Manual"} · {payout.status.replaceAll("_", " ")}</p><p className="text-xs text-[var(--wallet-subtle)]">Expected {date(payout.arrivalDate)}</p></div><a className="inline-flex min-h-9 items-center gap-1 text-xs text-[var(--wallet-accent-text)] underline underline-offset-4" href={payoutUrl(payout.id, data.mode)} target="_blank" rel="noopener noreferrer">Stripe <ArrowUpRight size={14} /></a></li>)}</ul>{payoutPagination}{!data.payouts.length && <p className="py-5 text-sm text-[var(--wallet-subtle)]">No payouts yet.</p>}</div><div className="border-t border-[var(--wallet-divider)] pt-5"><h4 className="font-semibold">Balance activity</h4><p className="mt-1 text-xs text-[var(--wallet-subtle)]">Latest transactions; not a monthly total.</p><ul className="mt-3 divide-y divide-[var(--wallet-divider)]">{visibleTransactions.map((transaction) => <li key={transaction.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><p className="font-medium capitalize">{transaction.type.replaceAll("_", " ")}</p><p className="text-xs text-[var(--wallet-subtle)]">{date(transaction.created)} · {transaction.status}{transaction.description ? ` · ${transaction.description}` : ""}</p></div><div className="text-right"><p className="font-medium tabular-nums">{transaction.currency === "aud" ? aud(transaction.netCents) : `${transaction.netCents / 100} ${transaction.currency.toUpperCase()}`}</p><p className="text-xs text-[var(--wallet-subtle)]">Gross {transaction.currency === "aud" ? aud(transaction.amountCents) : `${transaction.amountCents / 100} ${transaction.currency.toUpperCase()}`} · Fee {transaction.currency === "aud" ? aud(transaction.feeCents) : `${transaction.feeCents / 100} ${transaction.currency.toUpperCase()}`}</p></div></li>)}</ul>{transactionPagination}{!data.transactions.length && <p className="py-5 text-sm text-[var(--wallet-subtle)]">No balance activity yet.</p>}</div></div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--wallet-divider)] bg-[var(--wallet-surface)] px-5 py-4 text-xs text-[var(--wallet-muted)] sm:px-8 lg:px-10"><span>{data.mode === "test" ? "Test mode — no real money moves." : "Live Stripe account · standard payouts."}</span><span>Schedule: {data.payoutsEnabled ? data.payoutSchedule.replaceAll("_", " ") : "Not enabled"}</span><a className="inline-flex items-center gap-1 text-[var(--wallet-accent-text)] underline underline-offset-4" href={dashboardUrl(data.mode)} target="_blank" rel="noopener noreferrer">Open Stripe <ArrowUpRight size={13} /></a></div>
    </section>}
  </div>;
}
