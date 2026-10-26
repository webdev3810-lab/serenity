"use client";

import { useState } from "react";
import { Save, X } from "lucide-react";
import { formatAud, formatDateAu, todayIso } from "@/src/lib/booking";
import { pricingDates } from "@/src/lib/date-pricing";
import { AdminDialog, useAdminWorkspace, useDirtyGuard } from "./AdminUI";
import type { Row } from "./AdminModels";

export function AdminCalendarPricingEditor({ property, date, onClose, onSaved }: {
  property: Row;
  date?: string;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const { confirm } = useAdminWorkspace();
  const initialDate = date ?? todayIso();
  const existing = Array.isArray(property.date_prices) ? property.date_prices.find((price: Row) => price.price_date === initialDate && price.is_active !== false) : undefined;
  const initialRate = String(existing?.nightly_price ?? property.nightly_price ?? 0);
  const initialLabel = String(existing?.label ?? "");
  const [mode, setMode] = useState<"dates" | "default">(date ? "dates" : "default");
  const [start, setStart] = useState(initialDate);
  const [end, setEnd] = useState(initialDate);
  const [rate, setRate] = useState(initialRate);
  const [label, setLabel] = useState(initialLabel);
  const [defaultRate, setDefaultRate] = useState(String(property.nightly_price ?? 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const dirty = !saved && (start !== initialDate || end !== initialDate || rate !== initialRate || label !== initialLabel || defaultRate !== String(property.nightly_price ?? 0));
  useDirtyGuard(dirty);
  let dates: string[] = [];
  try { dates = pricingDates(start, end); } catch { /* Show the range error when saving. */ }
  const overrideCount = Array.isArray(property.date_prices) ? property.date_prices.filter((price: Row) => price.is_active !== false && price.price_date >= start && price.price_date <= end).length : 0;
  const close = async () => {
    if (busy) return;
    if (dirty && !await confirm({ title: "Discard price edits?", description: "Your unsaved price changes will be lost.", confirmLabel: "Discard changes", destructive: true })) return;
    onClose();
  };
  const save = async (action: "default" | "override" | "reset") => {
    if (busy) return;
    setError("");
    try {
      const amount = action === "default" ? defaultRate : rate;
      if (action !== "reset" && (!amount.trim() || !Number.isFinite(Number(amount)) || Number(amount) < 0 || Number(amount) > 100000)) throw new Error("Enter a nightly rate between AUD $0 and AUD $100,000.");
      const selected = action === "default" ? [] : pricingDates(start, end);
      setBusy(true);
      const response = await fetch("/api/admin/calendar/prices", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: property.id, action, rate: action === "reset" ? undefined : Number(amount), startDate: start, endDate: end, label }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Prices could not be saved. Please try again.");
      setSaved(true);
      const message = action === "default"
        ? `${property.name}: default rate updated to ${formatAud(Number(amount))} per night. Dates with a special rate keep their price.`
        : `${property.name}: ${selected.length} ${selected.length === 1 ? "night" : "nights"} ${action === "reset" ? "reset to the default rate" : `updated to ${formatAud(Number(amount))} per night`}.`;
      await onSaved(message);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Prices could not be saved.");
    } finally { setBusy(false); }
  };

  return <AdminDialog label={`Edit nightly prices for ${property.name}`} busy={busy} onClose={() => void close()} className="admin-calendar-pricing-dialog">
    <div className="admin-calendar-panel">
      <header className="admin-calendar-panel-header"><div><p className="admin-calendar-panel-kicker">Nightly pricing · AUD</p><h3>Edit prices</h3><p>{property.name}</p></div><button type="button" className="admin-icon-button" disabled={busy} aria-label="Close price editor" onClick={() => void close()}><X size={18} /></button></header>
      <div className="admin-view-tabs" role="group" aria-label="Price to edit">
        <button type="button" disabled={busy} className={`admin-view-tab ${mode === "dates" ? "is-active" : ""}`} aria-pressed={mode === "dates"} onClick={() => { setMode("dates"); setError(""); }}>Date prices</button>
        <button type="button" disabled={busy} className={`admin-view-tab ${mode === "default" ? "is-active" : ""}`} aria-pressed={mode === "default"} onClick={() => { setMode("default"); setError(""); }}>Default rate</button>
      </div>
      <form className="admin-calendar-pricing-form" onSubmit={(event) => { event.preventDefault(); void save(mode === "default" ? "default" : "override"); }}>
        <fieldset disabled={busy} className="grid min-w-0 gap-5">
          {mode === "default" ? <>
            <div><h4 className="font-semibold">Your usual nightly price</h4><p className="mt-1 text-sm text-[var(--admin-muted)]">Every date without a special rate follows this price automatically, including future dates.</p></div>
            <label>Default rate (AUD / night)<input autoFocus className="admin-field" type="number" min="0" max="100000" step="0.01" required value={defaultRate} onChange={(event) => setDefaultRate(event.target.value)} /></label>
            <p className="admin-calendar-pricing-summary">Holiday and individual date prices stay as you set them. Reset those dates to the default when you want them to follow this rate again.</p>
          </> : <>
            <div><h4 className="font-semibold">Set a special nightly price</h4><p className="mt-1 text-sm text-[var(--admin-muted)]">Choose one night or a range, such as Christmas. The last night is included.</p></div>
            <div className="admin-calendar-fields"><label>First night<input className="admin-field" type="date" required value={start} onChange={(event) => { const next = event.target.value; setStart(next); if (next > end) setEnd(next); }} /></label><label>Last night<input className="admin-field" type="date" min={start} required value={end} onChange={(event) => setEnd(event.target.value)} /></label></div>
            <div className="admin-calendar-fields"><label>Special rate (AUD / night)<input autoFocus className="admin-field" type="number" min="0" max="100000" step="0.01" required value={rate} onChange={(event) => setRate(event.target.value)} /></label><label><span>Label <span className="admin-calendar-optional">optional</span></span><input className="admin-field" placeholder="e.g. Christmas" maxLength={120} value={label} onChange={(event) => setLabel(event.target.value)} /></label></div>
            <div className="admin-calendar-pricing-summary" aria-live="polite">{dates.length ? <><strong>{dates.length} {dates.length === 1 ? "night" : "nights"} selected</strong><span>{formatDateAu(start)}{end !== start ? ` – ${formatDateAu(end)}` : ""}</span><span>Default: {formatAud(Number(property.nightly_price ?? 0))} / night{overrideCount ? ` · ${overrideCount} with a special rate` : ""}</span></> : "Choose a valid date range of up to 730 nights."}</div>
          </>}
          <p className="text-xs leading-relaxed text-[var(--admin-muted)]">Saved prices apply to new standard and corporate bookings. Existing reservations keep their booked total.</p>
          {error && <p className="admin-notice is-error" role="alert">{error}</p>}
          <div className="admin-calendar-pricing-actions">
            {mode === "dates" && <button type="button" className="admin-button" disabled={!dates.length || !overrideCount} onClick={() => void save("reset")}>Reset to default</button>}
            <button type="submit" className="admin-button admin-button-primary inline-flex items-center justify-center gap-2" disabled={mode === "dates" && !dates.length}><Save size={16} />{busy ? "Saving…" : mode === "default" ? "Save default rate" : "Save date prices"}</button>
          </div>
        </fieldset>
      </form>
    </div>
  </AdminDialog>;
}
