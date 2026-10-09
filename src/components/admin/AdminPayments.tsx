"use client";

import { ArrowUpRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type PaymentBooking = {
  id: string;
  reference: string;
  total: number;
  currency: string;
  payment_status: string;
  booking_status: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
};

type PaymentEvent = {
  stripe_event_id: string;
  event_type: string;
  processing_status: "processing" | "processed" | "failed" | "ignored";
  booking_reference: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  outcome: string;
  failure_code: string | null;
  failure_message: string | null;
  last_error: string | null;
  livemode: boolean;
  event_created_at: string;
  attempts: number;
};

type PaymentData = {
  mode: "live" | "test" | "not configured";
  webhookConfigured: boolean;
  currency: "AUD";
  events: PaymentEvent[];
  bookings: PaymentBooking[];
};

const money = (amount: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
const dateTime = (value: string) => new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "Australia/Melbourne" }).format(new Date(value));
const paymentUrl = (id: string, live: boolean) => `https://dashboard.stripe.com/${live ? "" : "test/"}payments/${encodeURIComponent(id)}`;
const eventUrl = (id: string, live: boolean) => `https://dashboard.stripe.com/${live ? "" : "test/"}events/${encodeURIComponent(id)}`;

function Status({ value }: { value: string }) {
  const tone = value === "paid" || value === "succeeded" || value === "processed" ? "var(--admin-success-bg)"
    : value === "failed" || value === "declined" || value === "refunded" ? "var(--admin-danger-bg)"
      : "var(--admin-surface-alt)";
  return <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize" style={{ background: tone }}>{value.replaceAll("_", " ")}</span>;
}

export function AdminPayments() {
  const [data, setData] = useState<PaymentData | null>(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/payments", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load payments.");
      setData(body as PaymentData);
      setUpdatedAt(new Date().toISOString());
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not load payments.");
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 30_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [load]);

  const bookings = data?.bookings ?? [];
  const events = data?.events ?? [];
  const paid = bookings.filter((booking) => booking.payment_status === "paid");
  const declined = events.filter((event) => event.outcome === "declined").length;
  const failedDeliveries = events.filter((event) => event.processing_status === "failed").length;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--admin-muted)]">Stripe / AUD</p><h2 className="mt-1 text-3xl font-semibold">Payments &amp; webhook activity</h2><p className="mt-2 text-sm text-[var(--admin-muted)]">Latest 100 Stripe bookings and verified webhook events. Refreshes every 30 seconds while this tab is open.</p></div>
      <button type="button" className="admin-button inline-flex min-h-11 items-center gap-2" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button>
    </div>
    {error && <div className="admin-notice is-error" role="alert">{error}</div>}
    {!data && !error && <div className="admin-card p-5 text-sm text-[var(--admin-muted)]" role="status">Loading payment activity…</div>}
    <div className="admin-card flex flex-wrap items-center gap-3 p-4 text-sm">
      <Status value={data?.mode ?? "not configured"} />
      <span>Webhook: <strong>{data?.webhookConfigured ? "configured" : "not configured"}</strong></span>
      <span>Currency: <strong>AUD</strong></span>
      {updatedAt && <span className="text-[var(--admin-muted)]">Updated {dateTime(updatedAt)} Melbourne time</span>}
    </div>
    <div className="grid gap-3 sm:grid-cols-4">
      {[
        ["Paid bookings", String(paid.length)],
        ["Paid total", money(paid.reduce((sum, booking) => sum + Number(booking.total), 0))],
        ["Declined attempts", String(declined)],
        ["Webhook errors", String(failedDeliveries)],
      ].map(([label, value]) => <div key={label} className="admin-card p-5"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">{label}</p><strong className="mt-2 block text-2xl">{value}</strong></div>)}
    </div>
    <section className="admin-card overflow-x-auto p-4 sm:p-6" aria-labelledby="stripe-bookings-heading">
      <h3 id="stripe-bookings-heading" className="text-xl font-semibold">Checkout transactions</h3>
      <p className="mt-1 text-sm text-[var(--admin-muted)]">Booking status is the app’s current record. Stripe links open the matching payment in your dashboard.</p>
      <table className="mt-4 w-full min-w-[800px] text-left text-sm"><thead><tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted)]"><th className="p-3">Created</th><th className="p-3">Booking</th><th className="p-3">Amount</th><th className="p-3">Payment</th><th className="p-3">Reservation</th><th className="p-3">Stripe</th></tr></thead><tbody>{bookings.map((booking) => <tr key={booking.id} className="border-b border-[var(--admin-border)] last:border-0"><td className="p-3 whitespace-nowrap">{dateTime(booking.created_at)}</td><td className="p-3 font-semibold">{booking.reference}</td><td className="p-3 whitespace-nowrap">{booking.currency === "AUD" ? money(Number(booking.total)) : `${booking.total} ${booking.currency}`}</td><td className="p-3"><Status value={booking.payment_status} /></td><td className="p-3"><Status value={booking.booking_status} /></td><td className="p-3">{booking.stripe_payment_intent_id ? <a className="inline-flex items-center gap-1 underline" href={paymentUrl(booking.stripe_payment_intent_id, data?.mode === "live")} target="_blank" rel="noopener noreferrer">Payment <ArrowUpRight size={14} /></a> : <span className="text-[var(--admin-muted)]">Awaiting payment</span>}</td></tr>)}</tbody></table>
      {!bookings.length && <p className="p-5 text-center text-sm text-[var(--admin-muted)]">No Stripe checkouts recorded yet.</p>}
    </section>
    <section className="admin-card overflow-x-auto p-4 sm:p-6" aria-labelledby="stripe-events-heading">
      <h3 id="stripe-events-heading" className="text-xl font-semibold">Verified webhook deliveries</h3>
      <p className="mt-1 text-sm text-[var(--admin-muted)]">Declined attempts are logged without cancelling an open checkout. Failed deliveries are retried by Stripe.</p>
      <table className="mt-4 w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted)]"><th className="p-3">Time</th><th className="p-3">Event</th><th className="p-3">Booking</th><th className="p-3">Amount / refunded</th><th className="p-3">Outcome</th><th className="p-3">Processing</th><th className="p-3">Details</th></tr></thead><tbody>{events.map((event) => <tr key={event.stripe_event_id} className="border-b border-[var(--admin-border)] align-top last:border-0"><td className="p-3 whitespace-nowrap">{dateTime(event.event_created_at)}</td><td className="p-3"><a className="inline-flex items-center gap-1 font-medium underline" href={eventUrl(event.stripe_event_id, event.livemode)} target="_blank" rel="noopener noreferrer">{event.event_type}<ArrowUpRight size={14} /></a></td><td className="p-3">{event.booking_reference || "Unlinked"}</td><td className="p-3 whitespace-nowrap">{event.amount_cents !== null && event.currency === "AUD" ? money(event.amount_cents / 100) : event.currency ?? "—"}</td><td className="p-3"><Status value={event.outcome} /></td><td className="p-3"><Status value={event.processing_status} />{event.attempts > 1 && <small className="ml-2">{event.attempts} attempts</small>}</td><td className="max-w-60 p-3 text-xs text-[var(--admin-muted)]">{event.failure_message || event.failure_code || event.last_error || "—"}</td></tr>)}</tbody></table>
      {!events.length && <p className="p-5 text-center text-sm text-[var(--admin-muted)]">No verified Stripe webhooks recorded yet.</p>}
    </section>
  </div>;
}
