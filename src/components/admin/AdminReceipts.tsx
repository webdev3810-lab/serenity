"use client";

import { CheckCircle2, Clipboard, Copy, Download, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatAud } from "@/src/lib/booking";
import { formatMelbourneReceiptDate } from "@/src/lib/paymentReceipt";
import { useAdminPagination } from "./AdminUI";

type Receipt = {
  code: string;
  reference: string;
  type: "guest" | "corporate";
  guestName: string;
  companyName: string;
  guestEmail: string;
  homes: string[];
  stays: Array<{ home: string; checkIn: string; checkout: string; total: number }>;
  checkIn: string;
  checkout: string;
  total: number;
  currency: string;
  paidAt: string;
  stripePaymentIntentId: string | null;
};

function receiptPng(receipt: Receipt): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  const stayFields: Array<[string, string]> = receipt.type === "corporate" && receipt.stays?.length
    ? receipt.stays.map((stay, index) => [`House ${index + 1}`, `${stay.home}: ${stay.checkIn} to ${stay.checkout}`])
    : [["Homes", receipt.homes.join(", ")], ["Check-in", receipt.checkIn], ["Checkout", receipt.checkout]];
  const fields: Array<[string, string]> = [
    ["Booking reference", receipt.reference],
    ["Booking type", receipt.type === "corporate" ? "Corporate partner stay" : "Direct guest stay"],
    ["Contact", receipt.guestName],
    ...(receipt.companyName ? [["Company", receipt.companyName] as [string, string]] : []),
    ["Email", receipt.guestEmail],
    ...stayFields,
    ["Paid", `${formatMelbourneReceiptDate(receipt.paidAt)} Melbourne time`],
    ["Stripe payment", receipt.stripePaymentIntentId ?? "Recorded in Stripe"],
  ];
  const totalTop = Math.max(1470, 605 + fields.length * 76 + 30);
  canvas.height = totalTop + 280;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Image export is not supported in this browser."));
  ctx.fillStyle = "#edf3f7";
  ctx.fillRect(0, 0, 1200, 1750);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(72, 72, 1056, canvas.height - 144);
  ctx.fillStyle = "#062b45";
  ctx.fillRect(72, 72, 1056, 280);
  ctx.fillStyle = "#e6c37a";
  ctx.fillRect(72, 345, 1056, 7);

  const draw = (value: string, x: number, y: number, font: string, color: string, maxWidth = 940) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(value, x, y, maxWidth);
  };
  draw("SERENITY", 130, 155, "bold 42px Arial", "#ffffff");
  draw("CORPORATE STAYS  /  PAKENHAM", 130, 197, "20px Arial", "#dce8f0");
  draw("BOOKING & PAYMENT CONFIRMATION", 130, 293, "bold 31px Arial", "#ffffff");
  draw("PAID & CONFIRMED", 130, 424, "bold 25px Arial", "#137a5f");
  draw(receipt.code, 130, 485, "bold 39px Arial", "#062b45");
  draw("Keep this code as proof of your confirmed booking.", 130, 528, "21px Arial", "#526171");

  let y = 605;
  for (const [label, value] of fields) {
    draw(label.toUpperCase(), 130, y, "bold 17px Arial", "#657684");
    draw(value, 130, y + 32, "23px Arial", "#062b45");
    ctx.fillStyle = "#e5ebef";
    ctx.fillRect(130, y + 48, 940, 1);
    y += 76;
  }
  ctx.fillStyle = "#f1f5f8";
  ctx.fillRect(112, totalTop, 976, 120);
  draw("TOTAL PAID", 142, totalTop + 44, "bold 19px Arial", "#526171");
  draw(receipt.currency === "AUD" ? formatAud(receipt.total) : `${receipt.total} ${receipt.currency}`, 142, totalTop + 92, "bold 43px Arial", "#062b45");
  draw("Confirmation only · Not a tax invoice", 130, totalTop + 180, "20px Arial", "#657684");
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create the receipt image.")), "image/png"));
}

export function AdminReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/receipts", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load receipts.");
      const items = body.receipts as Receipt[];
      setReceipts(items);
      setSelectedCode((current) => items.some((receipt) => receipt.code === current) ? current : items[0]?.code ?? "");
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not load receipts.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initial);
  }, [load]);

  const selected = receipts.find((receipt) => receipt.code === selectedCode);
  const filtered = receipts.filter((receipt) => [receipt.code, receipt.reference, receipt.guestName, receipt.companyName, ...receipt.homes]
    .some((value) => value.toLowerCase().includes(query.trim().toLowerCase())));
  const { visible: visibleReceipts, pagination } = useAdminPagination(filtered);

  const saveImage = async () => {
    if (!selected) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const blob = await receiptPng(selected);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selected.code}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Receipt image saved.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save receipt image."); }
    finally { setBusy(false); }
  };

  const copyImage = async () => {
    if (!selected) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("Image copy is unavailable in this browser. Use Save image instead.");
      const blob = await receiptPng(selected);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setNotice("Receipt image copied. You can paste it into a message.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not copy receipt image."); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--admin-muted)]">Paid bookings / AUD</p><h2 className="mt-1 text-3xl font-semibold">Receipts</h2><p className="mt-2 text-sm text-[var(--admin-muted)]">Proof of payment for confirmed direct and corporate bookings. Not a tax invoice.</p></div>
      <button type="button" className="admin-button inline-flex items-center gap-2" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Refresh</button>
    </div>
    {error && <p className="admin-notice is-error" role="alert">{error}</p>}
    {notice && <p className="admin-notice is-success" role="status">{notice}</p>}
    <div className="grid gap-5 xl:grid-cols-[minmax(270px,360px)_minmax(0,1fr)]">
      <section className="admin-card p-4 sm:p-5" aria-label="Paid receipt list">
        <label className="admin-field flex items-center gap-2"><span className="sr-only">Search receipts</span><Search size={17} aria-hidden="true" /><input className="w-full bg-transparent outline-none" type="search" placeholder="Search receipts" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className="mt-4 max-h-[680px] space-y-2 overflow-y-auto">
          {loading && <p className="p-4 text-sm text-[var(--admin-muted)]">Loading receipts…</p>}
          {!loading && !filtered.length && <p className="p-4 text-sm text-[var(--admin-muted)]">{receipts.length ? "No matching receipt." : "No paid receipts yet."}</p>}
          {visibleReceipts.map((receipt) => <button key={receipt.code} type="button" onClick={() => { setSelectedCode(receipt.code); setNotice(""); }} className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedCode === receipt.code ? "border-[var(--admin-accent)] bg-[var(--admin-surface-alt)]" : "border-[var(--admin-border)] hover:bg-[var(--admin-surface-alt)]"}`}>
            <span className="flex items-center justify-between gap-2"><strong className="text-sm">{receipt.code}</strong><CheckCircle2 size={16} className="text-emerald-600" aria-label="Paid" /></span>
            <span className="mt-1 block text-sm text-[var(--admin-muted)]">{receipt.guestName} · {receipt.type === "corporate" ? "Corporate" : "Guest"}</span>
            <span className="mt-2 block text-sm font-semibold">{receipt.currency === "AUD" ? formatAud(receipt.total) : `${receipt.total} ${receipt.currency}`}</span>
          </button>)}
        </div>
        {pagination}
      </section>
      {selected && <section className="admin-card overflow-hidden" aria-label="Receipt details">
        <div className="bg-[#062b45] p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e6c37a]">Serenity stays</p><h3 className="mt-3 text-2xl font-semibold">Booking &amp; payment confirmation</h3><p className="mt-2 text-sm text-slate-200">Paid and confirmed · {selected.type === "corporate" ? "Corporate partner stay" : "Direct guest stay"}</p></div>
        <div className="space-y-6 p-6 sm:p-8">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--admin-muted)]">Receipt code</p><p className="mt-1 break-all text-2xl font-bold">{selected.code}</p><p className="mt-1 text-xs text-[var(--admin-muted)]">Use this code to match the guest email and payment record.</p></div>
          <dl className="grid gap-x-8 gap-y-4 border-t border-[var(--admin-border)] pt-5 text-sm sm:grid-cols-2">
            {[
              ["Booking reference", selected.reference], ["Contact", selected.guestName],
              ...(selected.companyName ? [["Company", selected.companyName]] : []),
              ["Email", selected.guestEmail],
              ...(selected.type === "corporate" && selected.stays?.length
                ? selected.stays.map((stay, index) => [`House ${index + 1}`, `${stay.home}: ${stay.checkIn} to ${stay.checkout} · ${selected.currency === "AUD" ? formatAud(stay.total) : `${stay.total} ${selected.currency}`}`])
                : [["Homes", selected.homes.join(", ")], ["Check-in", selected.checkIn], ["Checkout", selected.checkout]]),
              ["Paid", `${formatMelbourneReceiptDate(selected.paidAt)} Melbourne time`],
              ["Stripe payment", selected.stripePaymentIntentId ?? "Recorded in Stripe"],
            ].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}
          </dl>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--admin-surface-alt)] p-5"><span className="text-sm font-semibold">Total paid</span><strong className="text-xl">{selected.currency === "AUD" ? formatAud(selected.total) : `${selected.total} ${selected.currency}`}</strong></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="admin-button inline-flex items-center gap-2" onClick={() => void saveImage()} disabled={busy}><Download size={16} /> Save image</button>
            <button type="button" className="admin-button inline-flex items-center gap-2" onClick={() => void copyImage()} disabled={busy}><Clipboard size={16} /> Copy image</button>
            <button type="button" className="admin-button inline-flex items-center gap-2" onClick={() => { void navigator.clipboard.writeText(selected.code).then(() => setNotice("Receipt code copied.")).catch(() => setError("Could not copy receipt code.")); }}><Copy size={16} /> Copy code</button>
          </div>
          <p className="text-xs text-[var(--admin-muted)]">Confirmation only. This image is not a tax invoice or a replacement for Stripe&apos;s payment records.</p>
        </div>
      </section>}
    </div>
  </div>;
}
