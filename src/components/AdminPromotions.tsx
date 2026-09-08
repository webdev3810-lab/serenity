"use client";

import type { PromotionRecord,PromotionStatus } from "@/src/lib/promotions";
import { Check,Copy,Eye,LoaderCircle,Pencil,Plus,Save,X } from "lucide-react";
import { useEffect,useMemo,useState } from "react";

import { AdminBadge,useAdminPagination,useAdminWorkspace,useDirtyGuard } from "@/src/components/admin/AdminUI";
type AdminPromotion = PromotionRecord & { status: PromotionStatus; remaining_redemptions: number | null };
type PropertyOption = { id: string; name: string };
type PromotionForm = {
  name: string;
  badge_text: string;
  message: string;
  mobile_message: string;
  code: string;
  discount_type: "percentage" | "fixed_aud";
  discount_value: string;
  starts_at: string;
  ends_at: string;
  max_redemptions: string;
  minimum_booking_amount: string;
  minimum_nights: string;
  applicable_property_ids: string[];
  applies_to_corporate: boolean;
  stackable: boolean;
  restore_on_refund: boolean;
  active: boolean;
  published: boolean;
  header_visible: boolean;
};

const emptyForm = (): PromotionForm => ({
  name: "", badge_text: "BOOK DIRECT", message: "Save on your stay with code", mobile_message: "Save with code", code: "",
  discount_type: "percentage", discount_value: "5", starts_at: "", ends_at: "", max_redemptions: "",
  minimum_booking_amount: "0", minimum_nights: "0", applicable_property_ids: [], applies_to_corporate: false,
  stackable: false, restore_on_refund: false, active: true, published: true, header_visible: true,
});

const toInputDate = (value: string | null) => {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return get("year") + "-" + get("month") + "-" + get("day") + "T" + (get("hour") === "24" ? "00" : get("hour")) + ":" + get("minute");
};

const toMelbourneIso = (value: string) => {
  if (!value) return null;
  const candidate = new Date(value + ":00Z");
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Australia/Melbourne", timeZoneName: "longOffset", hour: "numeric" }).formatToParts(candidate);
  const zone = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = zone.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  const offsetMinutes = match ? (Number(match[2]) * 60 + Number(match[3] ?? 0)) * (match[1] === "-" ? -1 : 1) : 0;
  return new Date(candidate.getTime() - offsetMinutes * 60000).toISOString();
};

const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "Australia/Melbourne" }).format(new Date(value)) : "No limit";

export default function AdminPromotions({ properties }: { properties: PropertyOption[] }) {
  const { confirm } = useAdminWorkspace();
  const [baseline, setBaseline] = useState<PromotionForm>(emptyForm());
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [form, setForm] = useState<PromotionForm>(emptyForm());
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<AdminPromotion | null>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  useDirtyGuard(dirty);
  const filtered = promotions.filter(p => `${p.name} ${p.code}`.toLowerCase().includes(query.toLowerCase()) && (filterStatus === "all" || p.status === filterStatus));
  const { visible, pagination } = useAdminPagination(filtered);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/promotions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load promotions.");
      setPromotions((data.promotions ?? []) as AdminPromotion[]);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load promotions."); }
    finally { setLoading(false); }
  };

  /* Loading is intentionally client-side so the admin session stays in the browser. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { void load(); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const update = <K extends keyof PromotionForm>(key: K, value: PromotionForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const edit = async (promotion: AdminPromotion) => {
    if (dirty && !await confirm({ title: "Discard promotion edits?", description: "Your unsaved campaign changes will be lost.", confirmLabel: "Discard changes", destructive: true })) return;
    setEditingId(promotion.id);
    const next: PromotionForm = {
      name: promotion.name, badge_text: promotion.badge_text, message: promotion.message, mobile_message: promotion.mobile_message, code: promotion.code,
      discount_type: promotion.discount_type, discount_value: String(promotion.discount_value), starts_at: toInputDate(promotion.starts_at), ends_at: toInputDate(promotion.ends_at),
      max_redemptions: promotion.max_redemptions === null ? "" : String(promotion.max_redemptions), minimum_booking_amount: String(promotion.minimum_booking_amount),
      minimum_nights: String(promotion.minimum_nights), applicable_property_ids: promotion.applicable_property_ids, applies_to_corporate: promotion.applies_to_corporate,
      stackable: promotion.stackable, restore_on_refund: promotion.restore_on_refund, active: promotion.active, published: promotion.published, header_visible: promotion.header_visible,
    }; setForm(next); setBaseline(next);
    setError(""); setMessage(""); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const reset = () => { setEditingId(""); setForm(emptyForm()); setBaseline(emptyForm()); setError(""); setPreview(null); };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      discount_value: Number(form.discount_value),
      starts_at: toMelbourneIso(form.starts_at),
      ends_at: toMelbourneIso(form.ends_at),
      max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
      minimum_booking_amount: Number(form.minimum_booking_amount),
      minimum_nights: Number(form.minimum_nights),
    };
    try {
      const response = await fetch(editingId ? "/api/admin/promotions/" + editingId : "/api/admin/promotions", {
        method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save promotion.");
      setMessage(editingId ? "Promotion updated." : "Promotion created.");
      reset();
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save promotion."); }
    finally { setSaving(false); }
  };

  const toggle = async (promotion: AdminPromotion) => {
    setError(""); setMessage(""); setBusyId(promotion.id);
    try {
      const response = await fetch("/api/admin/promotions/" + promotion.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !promotion.active }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update promotion status.");
      setMessage(promotion.active ? "Promotion disabled." : "Promotion activated.");
      await load();
    } catch (toggleError) { setError(toggleError instanceof Error ? toggleError.message : "Could not update promotion status."); }
    finally { setBusyId(""); }
  };

  const propertyNames = useMemo(() => new Map(properties.map((property) => [property.id, property.name])), [properties]);

  return (
    <div className="grid gap-6">
      <header className="admin-page-header flex flex-wrap items-start justify-between gap-4">
        <div><p className="admin-section-kicker">Revenue and offers</p><h2 className="mt-1 text-2xl font-semibold">Promotions</h2><p className="mt-1 max-w-3xl text-sm text-[var(--admin-muted)]">Create voucher campaigns with clear dates, limits, house rules, and safe Stripe redemption tracking. Currency is AUD and dates use Australia/Melbourne.</p></div>
        <button type="button" className="admin-button admin-button-primary inline-flex items-center gap-2" onClick={async () => { if (!dirty || await confirm({ title: "Start a new promotion?", description: "Unsaved campaign edits will be discarded.", confirmLabel: "Discard and start new", destructive: true })) reset(); }}><Plus size={16} /> New promotion</button>
      </header>
      {message && <div className="admin-notice is-success" role="status"><Check size={17} />{message}</div>}
      {error && <div className="admin-notice is-error" role="alert"><X size={17} />{error}<button type="button" className="admin-button" onClick={() => void load()}>Retry loading</button></div>}
      {busyId && <div className="admin-notice" role="status"><LoaderCircle size={17} className="animate-spin" aria-hidden="true" />Updating promotion status…</div>}

      <form onSubmit={save} className="admin-card grid gap-5 bg-[var(--admin-surface)] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--admin-border)] pb-4"><div><p className="admin-section-kicker">{editingId ? "Edit promotion" : "New promotion"}</p><h3 className="mt-1 text-lg font-semibold">{editingId ? "Update campaign details" : "Build a voucher campaign"}</h3></div>{editingId && <button type="button" className="admin-button text-sm" onClick={reset}>Clear form</button>}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Promotion name" value={form.name} onChange={(value) => update("name", value)} maxLength={80} />
          <Field label="Badge text" value={form.badge_text} onChange={(value) => update("badge_text", value)} maxLength={40} />
          <Field label="Desktop message" value={form.message} onChange={(value) => update("message", value)} maxLength={140} />
          <Field label="Mobile message" value={form.mobile_message} onChange={(value) => update("mobile_message", value)} maxLength={90} />
          <Field label="Voucher code" value={form.code} onChange={(value) => update("code", value.toUpperCase())} maxLength={40} mono />
          <label className="text-sm font-medium text-[var(--admin-text)]">Discount type<select className="admin-field mt-1 w-full" value={form.discount_type} onChange={(event) => update("discount_type", event.target.value as PromotionForm["discount_type"])}><option value="percentage">Percentage</option><option value="fixed_aud">Fixed AUD</option></select></label>
          <Field label={form.discount_type === "percentage" ? "Discount percentage" : "Discount value (AUD)"} value={form.discount_value} onChange={(value) => update("discount_value", value)} type="number" min="0" step="0.01" />
          <Field label="Maximum successful redemptions" value={form.max_redemptions} onChange={(value) => update("max_redemptions", value)} type="number" min="1" step="1" placeholder="No limit" />
          <Field label="Minimum booking amount (AUD)" value={form.minimum_booking_amount} onChange={(value) => update("minimum_booking_amount", value)} type="number" min="0" step="0.01" />
          <Field label="Minimum nights" value={form.minimum_nights} onChange={(value) => update("minimum_nights", value)} type="number" min="0" step="1" />
          <Field label="Starts (Melbourne time)" value={form.starts_at} onChange={(value) => update("starts_at", value)} type="datetime-local" />
          <Field label="Ends (Melbourne time)" value={form.ends_at} onChange={(value) => update("ends_at", value)} type="datetime-local" />
        </div>
        <div className="grid gap-3 border-t border-[var(--admin-border)] pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Toggle label="Active" checked={form.active} onChange={(value) => update("active", value)} />
          <Toggle label="Published in CMS" checked={form.published} onChange={(value) => update("published", value)} />
          <Toggle label="Show in header" checked={form.header_visible} onChange={(value) => update("header_visible", value)} />
          <Toggle label="Available to corporate" checked={form.applies_to_corporate} onChange={(value) => update("applies_to_corporate", value)} />
          <Toggle label="Stack with house discount" checked={form.stackable} onChange={(value) => update("stackable", value)} />
          <Toggle label="Restore capacity after refund" checked={form.restore_on_refund} onChange={(value) => update("restore_on_refund", value)} />
        </div>
        <fieldset className="border-t border-[var(--admin-border)] pt-5"><legend className="text-sm font-semibold text-[var(--admin-text)]">Applicable houses</legend><p className="mt-1 text-sm text-[var(--admin-muted)]">Leave all unchecked to apply to every published house.</p><div className="mt-3 grid gap-2 sm:grid-cols-3">{properties.map((property) => <label key={property.id} className="flex items-center gap-2 border border-[var(--admin-border)] p-3 text-sm font-semibold"><input type="checkbox" checked={form.applicable_property_ids.includes(property.id)} onChange={(event) => update("applicable_property_ids", event.target.checked ? [...form.applicable_property_ids, property.id] : form.applicable_property_ids.filter((id) => id !== property.id))} />{property.name}</label>)}</div></fieldset>
        <div className="flex flex-wrap gap-3 border-t border-[var(--admin-border)] pt-5"><button type="submit" className="admin-button admin-button-primary inline-flex items-center gap-2" disabled={saving}><Save size={16} />{saving ? "Saving…" : editingId ? "Save promotion" : "Create promotion"}</button><p className="self-center text-sm text-[var(--admin-muted)]">Successful redemption count is controlled by paid Stripe bookings.</p></div>
      </form>

      <div className="admin-filter-panel flex flex-wrap gap-3 p-4"><input className="admin-field flex-1" aria-label="Search promotions" placeholder="Search campaign or code" value={query} onChange={e => setQuery(e.target.value)} /><select className="admin-field flex-1" aria-label="Promotion status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="all">All statuses</option>{["active","scheduled","draft","expired","sold_out","disabled"].map(value => <option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}</select><button type="button" className="admin-button" onClick={() => { setQuery(""); setFilterStatus("all"); }}>Reset filters</button></div>
      {loading ? <div className="admin-card admin-loading-state" role="status"><LoaderCircle size={18} className="animate-spin" aria-hidden="true" /><span>Loading promotions…</span></div> : <div className="grid gap-3">{!error && filtered.length === 0 && <div className="admin-card bg-[var(--admin-surface)] p-8 text-sm text-[var(--admin-muted)]">{promotions.length ? "No promotions match these filters." : "No promotions yet. Create the first campaign above."}</div>}{visible.map((promotion) => <article key={promotion.id} className="admin-card bg-[var(--admin-surface)] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><AdminBadge domain="promotion" value={promotion.status} /><span className="font-mono text-sm font-semibold">{promotion.code}</span></div><h3 className="mt-2 text-lg font-semibold">{promotion.name}</h3><p className="mt-1 text-sm text-[var(--admin-muted)]">{promotion.message}</p></div><div className="flex flex-wrap gap-2"><button type="button" className="admin-button inline-flex items-center gap-2 text-sm" onClick={() => setPreview(preview?.id === promotion.id ? null : promotion)}><Eye size={15} /> Preview</button><button type="button" className="admin-button inline-flex items-center gap-2 text-sm" onClick={() => edit(promotion)}><Pencil size={15} /> Edit</button><button type="button" className="admin-button text-sm" disabled={Boolean(busyId)} onClick={() => void toggle(promotion)}>{promotion.active ? "Disable" : "Activate"}</button></div></div><div className="mt-4 grid gap-3 border-t border-[var(--admin-border)] pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><Metric label="Discount" value={promotion.discount_type === "percentage" ? promotion.discount_value + "%" : "AUD " + promotion.discount_value} /><Metric label="Redemptions" value={String(promotion.successful_redemptions) + (promotion.max_redemptions === null ? "" : " / " + promotion.max_redemptions)} /><Metric label="Remaining" value={promotion.remaining_redemptions === null ? "Unlimited" : String(promotion.remaining_redemptions)} /><Metric label="Window" value={dateLabel(promotion.starts_at) + " → " + dateLabel(promotion.ends_at)} /></div>{promotion.applicable_property_ids.length > 0 && <p className="mt-3 text-sm text-[var(--admin-muted)]">Houses: {promotion.applicable_property_ids.map((id) => propertyNames.get(id) ?? id).join(", ")}</p>}{preview?.id === promotion.id && <div className="admin-guest-preview mt-4 border border-[#5A463A] bg-[#1C1917] p-4 text-sm text-white"><p className="font-black uppercase tracking-[0.12em] text-[#D8CCC4]">{promotion.badge_text}</p><div className="mt-2 flex flex-wrap items-center gap-3"><span>{promotion.message}</span><button type="button" className="inline-flex items-center gap-2 border border-[#A99B8E] px-3 py-1.5 font-mono text-xs font-bold hover:bg-white hover:text-[#1C1917]" onClick={() => void navigator.clipboard?.writeText(promotion.code)}><Copy size={13} />{promotion.code}</button></div></div>}</article>)}</div>}
      {!loading && pagination}
    </div>
  );
}

function Field({ label, value, onChange, maxLength, mono, ...props }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number; mono?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "maxLength">) {
  return <label className="text-sm font-medium text-[var(--admin-text)]">{label}<input {...props} className={"admin-field mt-1 w-full " + (mono ? "font-mono" : "")} value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2 border border-[var(--admin-border)] p-3 text-sm font-semibold"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-sm font-semibold text-[var(--admin-muted)]">{label}</p><p className="mt-1 font-medium text-[var(--admin-text)]">{value}</p></div>;
}
