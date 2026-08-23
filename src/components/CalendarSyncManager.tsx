"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarPlus, Check, Copy, ExternalLink, Link2, Pause, Pencil, Play, RefreshCw, Save, ShieldCheck, TestTube2, Trash2, Unplug, X } from "lucide-react";
import { CALENDAR_PLATFORM_LABELS, CALENDAR_PLATFORMS, type CalendarPlatform } from "@/src/lib/calendar/types";
import { todayIso } from "@/src/lib/booking";

type Connection = {
  id: string;
  property_id: string;
  platform: "direct" | CalendarPlatform;
  connection_type: "export" | "import";
  external_calendar_url: string | null;
  is_enabled: boolean;
  last_synced_at: string | null;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_error: string;
  last_imported_event_count: number;
  sync_frequency_minutes: number;
  sync_status: string;
  importedEventCount: number;
  hasExportToken: boolean;
};

type BlockReason = "maintenance" | "owner_use" | "cleaning" | "preparation" | "renovation" | "private_booking" | "other";
type BlockDraft = { startDate: string; endDate: string; blockReason: BlockReason; internalNote: string };
type CalendarItem = { id: string; startDate: string; endDate: string; source: string; label: string };
type CalendarProperty = {
  id: string;
  name: string;
  slug: string;
  connections: Connection[];
  conflicts: Array<{ platform: string; startDate: string; endDate: string }>;
  directBlocks: Array<{ id: string; startDate: string; endDate: string; summary: string; blockReason: BlockReason | null; internalNote: string }>;
  calendarItems: CalendarItem[];
};
type TestResult = { status: "connected" | "no_events" | "invalid_url"; message: string; eventCount?: number };

const BLOCK_REASONS: Array<{ value: BlockReason; label: string }> = [
  { value: "maintenance", label: "Maintenance" },
  { value: "owner_use", label: "Owner use" },
  { value: "cleaning", label: "Cleaning" },
  { value: "preparation", label: "Preparation time" },
  { value: "renovation", label: "Renovation" },
  { value: "private_booking", label: "Private booking" },
  { value: "other", label: "Other" },
];

const emptyBlockDraft = (): BlockDraft => ({ startDate: "", endDate: "", blockReason: "maintenance", internalNote: "" });

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "Australia/Melbourne" }).format(new Date(value));
}

function formatCalendarDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function statusLabel(connection: Connection | undefined) {
  if (!connection) return "Not configured";
  if (!connection.is_enabled) return "Disabled";
  if (connection.sync_status === "conflict") return "Conflict";
  if (connection.sync_status === "error") return "Sync failed";
  if (connection.sync_status === "success") return "Connected";
  return "Waiting for first sync";
}

function statusClass(connection: Connection | undefined) {
  if (connection?.sync_status === "conflict") return "border-amber-400 bg-amber-50 text-amber-900";
  if (connection?.sync_status === "error") return "border-red-300 bg-red-50 text-red-800";
  if (connection?.is_enabled && connection.sync_status === "success") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  return "border-stone-300 bg-stone-100 text-stone-700";
}

function MonthlyBlockCalendar({ items }: { items: CalendarItem[] }) {
  const [offset, setOffset] = useState(0);
  const today = new Date(`${todayIso()}T00:00:00Z`);
  const month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1));
  const daysInMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  const leading = month.getUTCDay();
  const label = new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }).format(month);
  const cells = [...Array.from({ length: leading }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const sourceTone: Record<string, string> = { direct: "bg-[#2D2521]", airbnb: "bg-[#C2654D]", vrbo: "bg-[#56706A]", stayz: "bg-[#88715F]" };

  return <div className="border border-[#D8CCC4] bg-white">
    <div className="flex items-center justify-between border-b border-[#D8CCC4] px-3 py-3">
      <button type="button" className="btn-secondary min-h-9 px-3 text-xs" onClick={() => setOffset((current) => current - 1)}>Previous</button>
      <p className="font-extrabold text-[#2D2521]">{label}</p>
      <button type="button" className="btn-secondary min-h-9 px-3 text-xs" onClick={() => setOffset((current) => current + 1)}>Next</button>
    </div>
    <div className="grid grid-cols-7 border-b border-[#D8CCC4] bg-[#F7F4F1] text-center text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="border-r border-[#EAE1DD] py-2 last:border-r-0">{day}</div>)}
    </div>
    <div className="grid grid-cols-7">{cells.map((day, index) => {
      if (!day) return <div key={`empty-${index}`} className="min-h-20 border-b border-r border-[#EAE1DD] bg-[#FBF9F7]" />;
      const iso = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const matches = items.filter((item) => item.startDate <= iso && item.endDate > iso);
      return <div key={iso} className={`min-h-20 border-b border-r border-[#EAE1DD] p-2 ${matches.length ? "bg-[#F2EBE6]" : "bg-white"}`}>
        <span className="text-xs font-bold text-stone-700">{day}</span>
        {matches.slice(0, 2).map((item) => <div key={`${item.id}-${iso}`} className="mt-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.04em] text-stone-600"><span className={`h-2 w-2 shrink-0 ${sourceTone[item.source] ?? "bg-stone-500"}`} /><span className="truncate">{item.source}</span></div>)}
        {matches.length > 2 && <p className="mt-1 text-[9px] font-bold text-stone-500">+{matches.length - 2} more</p>}
      </div>;
    })}</div>
    <div className="flex flex-wrap gap-4 border-t border-[#D8CCC4] px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-stone-600">
      {Object.entries(sourceTone).map(([source, tone]) => <span key={source} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 ${tone}`} />{source === "direct" ? "Serenity / manual" : source}</span>)}
    </div>
  </div>;
}

export default function CalendarSyncManager() {
  const [properties, setProperties] = useState<CalendarProperty[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [tests, setTests] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [wizardPropertyId, setWizardPropertyId] = useState("");
  const [blockDrafts, setBlockDrafts] = useState<Record<string, BlockDraft>>({});
  const [editingBlockId, setEditingBlockId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/calendar/connections", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load calendar connections.");
      const nextProperties = data.properties as CalendarProperty[];
      const nextUrls: Record<string, string> = {};
      for (const property of nextProperties) {
        for (const connection of property.connections) {
          if (connection.connection_type === "import" && connection.external_calendar_url) nextUrls[`${property.id}:${connection.platform}`] = connection.external_calendar_url;
        }
      }
      setProperties(nextProperties);
      setUrls(nextUrls);
      setWizardPropertyId((current) => current || nextProperties[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load calendar connections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedLinks = window.sessionStorage.getItem("serenity-calendar-links");
        if (savedLinks) setLinks(JSON.parse(savedLinks));
      } catch { /* Session storage is optional. */ }
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const request = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers ?? {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The calendar action could not be completed.");
    return data;
  };

  const setSuccess = (value: string) => { setMessage(value); setError(""); };
  const setFailure = (value: unknown, fallback: string) => { setError(value instanceof Error ? value.message : fallback); setMessage(""); };

  const saveConnection = async (property: CalendarProperty, platform: CalendarPlatform) => {
    const key = `${property.id}:${platform}`;
    setBusy(`save:${key}`); setError(""); setMessage("");
    try {
      const data = await request("/api/admin/calendar/connections", { method: "POST", body: JSON.stringify({ propertyId: property.id, platform, externalUrl: urls[key] ?? "" }) });
      setTests((current) => ({ ...current, [key]: data.test }));
      setSuccess(`${CALENDAR_PLATFORM_LABELS[platform]} feed validated and saved for ${property.name}.`);
      await load();
    } catch (saveError) { setFailure(saveError, "Could not save calendar feed."); }
    finally { setBusy(""); }
  };

  const testConnection = async (property: CalendarProperty, platform: CalendarPlatform) => {
    const key = `${property.id}:${platform}`;
    setBusy(`test:${key}`); setError(""); setMessage("");
    try {
      const result = await request("/api/admin/calendar/connections/test", { method: "POST", body: JSON.stringify({ externalUrl: urls[key] ?? "" }) }) as TestResult;
      setTests((current) => ({ ...current, [key]: result }));
      setSuccess(result.message);
    } catch (testError) {
      const testMessage = testError instanceof Error ? testError.message : "Connection test failed.";
      setTests((current) => ({ ...current, [key]: { status: "invalid_url", message: testMessage } }));
      setFailure(testError, "Connection test failed.");
    } finally { setBusy(""); }
  };

  const sync = async (propertyId?: string, platform?: CalendarPlatform) => {
    const key = `sync:${propertyId ?? "all"}:${platform ?? "all"}`;
    setBusy(key); setError(""); setMessage("");
    try {
      const data = await request("/api/admin/calendar/sync", { method: "POST", body: JSON.stringify({ propertyId, platform }) });
      const failed = (data.results as Array<{ status: string }>).filter((result) => result.status === "error").length;
      setSuccess(failed ? `${failed} calendar feed${failed === 1 ? "" : "s"} needs attention.` : "Calendar sync completed.");
      await load();
    } catch (syncError) { setFailure(syncError, "Could not sync calendars."); }
    finally { setBusy(""); }
  };

  const disconnect = async (connection: Connection, property: CalendarProperty) => {
    if (!window.confirm(`Disconnect ${CALENDAR_PLATFORM_LABELS[connection.platform as CalendarPlatform]} from ${property.name}? Imported dates from this feed will stop blocking bookings.`)) return;
    setBusy(`disconnect:${connection.id}`);
    try {
      await request(`/api/admin/calendar/connections/${connection.id}`, { method: "DELETE" });
      setSuccess("Calendar disconnected. Its imported dates are no longer blocking bookings.");
      await load();
    } catch (disconnectError) { setFailure(disconnectError, "Could not disconnect calendar."); }
    finally { setBusy(""); }
  };

  const toggleConnection = async (connection: Connection) => {
    setBusy(`toggle:${connection.id}`);
    try {
      await request(`/api/admin/calendar/connections/${connection.id}`, { method: "PATCH", body: JSON.stringify({ isEnabled: !connection.is_enabled }) });
      setSuccess(connection.is_enabled ? "Calendar connection paused." : "Calendar connection enabled. Sync it now to refresh blocked dates.");
      await load();
    } catch (toggleError) { setFailure(toggleError, "Could not update calendar connection."); }
    finally { setBusy(""); }
  };

  const createLink = async (property: CalendarProperty) => {
    setBusy(`link:${property.id}`); setError(""); setMessage("");
    try {
      const data = await request("/api/admin/calendar/token", { method: "POST", body: JSON.stringify({ propertyId: property.id }) });
      const nextLinks = { ...links, [property.id]: data.url };
      setLinks(nextLinks);
      try { window.sessionStorage.setItem("serenity-calendar-links", JSON.stringify(nextLinks)); } catch { /* Optional. */ }
      setSuccess("Secure Serenity calendar link created. The previous link, if any, is now revoked.");
      await load();
    } catch (linkError) { setFailure(linkError, "Could not create calendar link."); }
    finally { setBusy(""); }
  };

  const updateBlockDraft = (propertyId: string, patch: Partial<BlockDraft>) => setBlockDrafts((current) => ({ ...current, [propertyId]: { ...(current[propertyId] ?? emptyBlockDraft()), ...patch } }));

  const saveBlock = async (property: CalendarProperty) => {
    const draft = blockDrafts[property.id] ?? emptyBlockDraft();
    const editing = property.directBlocks.find((block) => block.id === editingBlockId);
    setBusy(`block:${property.id}`); setError(""); setMessage("");
    try {
      await request(editing ? `/api/admin/calendar/blocks/${editing.id}` : "/api/admin/calendar/blocks", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(editing ? draft : { propertyId: property.id, ...draft }),
      });
      setSuccess(editing ? "Manual block updated." : "Manual block added to public availability and exported calendars.");
      setBlockDrafts((current) => ({ ...current, [property.id]: emptyBlockDraft() }));
      setEditingBlockId("");
      await load();
    } catch (blockError) { setFailure(blockError, "Could not save blocked dates."); }
    finally { setBusy(""); }
  };

  const editBlock = (property: CalendarProperty, block: CalendarProperty["directBlocks"][number]) => {
    setEditingBlockId(block.id);
    setBlockDrafts((current) => ({ ...current, [property.id]: { startDate: block.startDate, endDate: block.endDate, blockReason: block.blockReason ?? "other", internalNote: block.internalNote ?? "" } }));
  };

  const removeBlock = async (blockId: string) => {
    if (!window.confirm("Remove these manually blocked dates?")) return;
    setBusy(`remove-block:${blockId}`);
    try {
      await request(`/api/admin/calendar/blocks/${blockId}`, { method: "DELETE" });
      setSuccess("Manual block removed.");
      if (editingBlockId === blockId) setEditingBlockId("");
      await load();
    } catch (blockError) { setFailure(blockError, "Could not remove blocked dates."); }
    finally { setBusy(""); }
  };

  const copyText = async (value: string, successMessage: string) => {
    await navigator.clipboard.writeText(value);
    setSuccess(successMessage);
  };

  const providerLink = (propertyId: string, platform: CalendarPlatform) => links[propertyId] ? `${links[propertyId]}&source=${platform}` : "";
  const activeProperties = useMemo(() => properties.filter((property) => property.slug), [properties]);
  const wizardProperty = activeProperties.find((property) => property.id === wizardPropertyId) ?? activeProperties[0];

  if (loading) return <div className="card bg-white p-8 text-sm text-stone-600">Loading calendar connections…</div>;

  return <div className="grid gap-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div><p className="admin-eyebrow">Availability protection</p><h2 className="admin-page-title">Calendar sync</h2><p className="admin-page-description">Connect each private iCal feed server-side, export clean Serenity date blocks, and keep a final database conflict check before checkout.</p></div>
      <button type="button" className="btn-primary inline-flex min-h-11 items-center justify-center gap-2" onClick={() => void sync()} disabled={Boolean(busy)}><RefreshCw size={16} className={busy.startsWith("sync:") ? "animate-spin" : ""} /> Sync all calendars</button>
    </div>
    {message && <div className="admin-notice is-success" role="status"><Check size={18} />{message}</div>}
    {error && <div className="admin-notice is-error" role="alert"><AlertTriangle size={18} />{error}</div>}

    <section className="card grid gap-5 bg-white p-5 sm:p-7">
      <div className="border-b border-[#D8CCC4] pb-5"><p className="admin-eyebrow">Guided setup</p><h3 className="mt-2 text-2xl font-extrabold text-[#2D2521]">Connect a house in six steps</h3><p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">Use official iCal export links only. Private feed URLs are fetched by the server and are never exposed on the public website.</p></div>
      <label className="grid max-w-xl gap-1 text-xs font-bold uppercase tracking-[0.1em] text-stone-600">1. Select property<select className="field min-h-11 text-sm normal-case tracking-normal" value={wizardProperty?.id ?? ""} onChange={(event) => setWizardPropertyId(event.target.value)}>{activeProperties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
      {wizardProperty && <div className="grid gap-3 lg:grid-cols-2">
        <div className="border border-[#D8CCC4] bg-[#F7F4F1] p-4"><p className="font-extrabold">2. Copy the Serenity export URL</p><p className="mt-2 text-sm leading-relaxed text-stone-600">Generate the secure URL for {wizardProperty.name}, then paste the provider-safe version into the matching platform.</p><button type="button" className="btn-secondary mt-3 inline-flex items-center gap-2" onClick={() => void createLink(wizardProperty)}><Link2 size={15} />{links[wizardProperty.id] ? "Regenerate secure URL" : "Generate secure URL"}</button></div>
        <div className="border border-[#D8CCC4] p-4"><p className="font-extrabold">3. Connect Airbnb</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-stone-600"><li>Open Host Calendar and select this listing.</li><li>Open Availability → Connect calendars.</li><li>Import the Serenity `.ics` URL.</li><li>Copy Airbnb&apos;s export URL into the Airbnb card below.</li><li>Test, save, then sync now.</li></ol><a className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] underline" href="https://www.airbnb.com/help/article/99" target="_blank" rel="noreferrer">Official Airbnb guide <ExternalLink size={13} /></a></div>
        <div className="border border-[#D8CCC4] p-4"><p className="font-extrabold">4. Connect Vrbo / Stayz</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-stone-600"><li>Open Owner Dashboard → Calendar.</li><li>Open Settings → Availability → Calendar sync.</li><li>Import the Serenity `.ics` URL.</li><li>Export Vrbo/Stayz and paste that URL below.</li><li>Test, save, then sync now.</li></ol><a className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] underline" href="https://help.vrbo.com/articles/How-do-I-import-my-iCal-or-Google-calendar" target="_blank" rel="noreferrer">Official Vrbo guide <ExternalLink size={13} /></a></div>
        <div className="border border-[#D8CCC4] bg-[#2D2521] p-4 text-white"><p className="font-extrabold">5–6. Test, sync, and verify</p><p className="mt-2 text-sm leading-relaxed text-stone-200">A valid connection can be connected with events or connected with no events. After syncing, test one blocked night and one direct booking. iCal is delayed: Serenity checks every 15 minutes, while each external platform controls when it refreshes Serenity&apos;s export.</p><div className="mt-3 flex items-start gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#DCC8B8]"><ShieldCheck size={16} />Final availability is always checked again on the server.</div></div>
      </div>}
    </section>

    {activeProperties.map((property) => {
      const direct = property.connections.find((connection) => connection.connection_type === "export");
      const blockDraft = blockDrafts[property.id] ?? emptyBlockDraft();
      return <section key={property.id} className="card bg-white p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-4 border-b border-[#EAE1DD] pb-5 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B6B55]">Property calendar</p><h3 className="mt-2 text-2xl font-extrabold text-[#2D2521]">{property.name}</h3><p className="mt-1 text-sm text-stone-500">Australia/Melbourne · {property.slug}</p></div><button type="button" className="btn-secondary inline-flex min-h-10 items-center justify-center gap-2" onClick={() => void sync(property.id)} disabled={Boolean(busy)}><RefreshCw size={15} /> Sync property</button></div>
        {property.conflicts.length > 0 && <div className="mt-5 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex items-start gap-3"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><strong>Calendar conflict.</strong><p className="mt-1">An imported block overlaps an existing Serenity booking. The existing booking has not been changed.</p>{property.conflicts.map((conflict, index) => <p key={`${conflict.platform}-${conflict.startDate}-${index}`} className="mt-1 font-semibold">{conflict.platform.toUpperCase()}: {formatCalendarDate(conflict.startDate)} – {formatCalendarDate(conflict.endDate)}</p>)}</div></div></div>}

        <div className="mt-6 border border-[#D8CCC4] bg-[#FBF9F7] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-extrabold text-[#2D2521]">Direct Serenity calendar</h4><span className={`border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${statusClass(direct)}`}>{direct?.hasExportToken ? "Enabled" : "Not configured"}</span></div><p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">Exports confirmed and pending Serenity holds, corporate bookings, manual blocks, maintenance, cleaning, and preparation dates without guest or payment details.</p></div><button type="button" className="btn-primary inline-flex min-h-11 shrink-0 items-center justify-center gap-2" onClick={() => void createLink(property)} disabled={busy === `link:${property.id}`}><Link2 size={15} /> {direct?.hasExportToken ? "Regenerate secure URL" : "Generate secure URL"}</button></div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input aria-label={`${property.name} Serenity export URL`} className="field min-h-11 flex-1 font-mono text-xs" readOnly value={links[property.id] ?? (direct?.hasExportToken ? "A secure URL exists. Regenerate it to reveal and copy a new token." : "Generate a secure URL to begin.")} />{links[property.id] && <><button type="button" className="btn-secondary inline-flex items-center justify-center gap-2" onClick={() => void copyText(links[property.id], "Serenity calendar URL copied.")}><Copy size={15} /> Copy</button><a className="btn-secondary inline-flex items-center justify-center gap-2" href={links[property.id]} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Test export</a></>}</div>
          <p className="mt-3 text-xs text-stone-500">Secure tokens are stored only as one-way hashes. A newly generated raw link is retained only in this signed-in browser tab session.</p>
        </div>

        <div className="mt-5 grid gap-4">
          {CALENDAR_PLATFORMS.map((platform) => {
            const connection = property.connections.find((item) => item.platform === platform && item.connection_type === "import");
            const key = `${property.id}:${platform}`;
            const test = tests[key];
            const safeExportLink = providerLink(property.id, platform);
            return <div key={platform} className="border border-[#D8CCC4] p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-extrabold text-[#2D2521]">{CALENDAR_PLATFORM_LABELS[platform]}</h4><span className={`border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${statusClass(connection)}`}>{statusLabel(connection)}</span><span className="border border-stone-300 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-stone-600">{connection?.is_enabled ? "Enabled" : "Disabled"}</span></div><p className="mt-2 text-sm text-stone-600">Private {CALENDAR_PLATFORM_LABELS[platform]} export feed for {property.name}.</p></div><div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-stone-600 sm:grid-cols-4"><div><span className="block font-bold uppercase tracking-[0.06em]">Last success</span>{formatDate(connection?.last_success_at ?? null)}</div><div><span className="block font-bold uppercase tracking-[0.06em]">Last attempt</span>{formatDate(connection?.last_attempt_at ?? connection?.last_synced_at ?? null)}</div><div><span className="block font-bold uppercase tracking-[0.06em]">Frequency</span>{connection?.sync_frequency_minutes ?? 15} minutes</div><div><span className="block font-bold uppercase tracking-[0.06em]">Active dates</span>{connection?.importedEventCount ?? connection?.last_imported_event_count ?? 0}</div></div></div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2"><label className="text-xs font-bold uppercase tracking-[0.08em] text-stone-600">Serenity export URL<input className="field mt-1 min-h-11 font-mono text-xs normal-case tracking-normal" readOnly value={safeExportLink || "Generate the Direct Serenity URL above."} /></label><label className="text-xs font-bold uppercase tracking-[0.08em] text-stone-600">External calendar import URL<input aria-label={`${CALENDAR_PLATFORM_LABELS[platform]} iCal URL`} className="field mt-1 min-h-11 font-mono text-xs normal-case tracking-normal" type="text" inputMode="url" placeholder="https://…/calendar.ics or webcal://…" value={urls[key] ?? ""} onChange={(event) => setUrls((current) => ({ ...current, [key]: event.target.value }))} /></label></div>
              <div className="mt-3 flex flex-wrap gap-2">{safeExportLink && <button type="button" className="btn-secondary inline-flex min-h-10 items-center gap-2 text-xs" onClick={() => void copyText(safeExportLink, `${CALENDAR_PLATFORM_LABELS[platform]}-safe Serenity URL copied.`)}><Copy size={14} /> Copy Serenity URL</button>}<button type="button" className="btn-secondary inline-flex min-h-10 items-center gap-2 text-xs" onClick={() => void testConnection(property, platform)} disabled={busy === `test:${key}`}><TestTube2 size={14} /> {busy === `test:${key}` ? "Testing…" : "Test connection"}</button><button type="button" className="btn-primary inline-flex min-h-10 items-center gap-2 text-xs" onClick={() => void saveConnection(property, platform)} disabled={busy === `save:${key}`}><Save size={14} /> {busy === `save:${key}` ? "Saving…" : "Save connection"}</button>{connection && <><button type="button" className="btn-secondary inline-flex min-h-10 items-center gap-2 text-xs" onClick={() => void sync(property.id, platform)} disabled={!connection.is_enabled || Boolean(busy)}><RefreshCw size={14} /> Sync now</button><button type="button" className="btn-secondary inline-flex min-h-10 items-center gap-2 text-xs" onClick={() => void toggleConnection(connection)} disabled={busy === `toggle:${connection.id}`}>{connection.is_enabled ? <Pause size={14} /> : <Play size={14} />}{connection.is_enabled ? "Disable" : "Enable"}</button><button type="button" className="btn-secondary inline-flex min-h-10 items-center gap-2 text-xs text-[#8A3325]" onClick={() => void disconnect(connection, property)} disabled={busy === `disconnect:${connection.id}`}><Unplug size={14} /> Disconnect</button></>}</div>
              {test && <div className={`mt-3 border p-3 text-sm ${test.status === "invalid_url" ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}><strong>{test.status === "connected" ? "Connected" : test.status === "no_events" ? "No events found" : "Invalid URL"}.</strong> {test.message}{typeof test.eventCount === "number" ? ` (${test.eventCount} blocking event${test.eventCount === 1 ? "" : "s"})` : ""}</div>}
              {connection?.last_error && <p className="mt-3 border-l-2 border-red-400 pl-3 text-sm text-red-700">{connection.last_error}</p>}
            </div>;
          })}
        </div>

        <div className="mt-6 border border-[#D8CCC4] bg-[#FBF9F7] p-4 sm:p-5">
          <div><h4 className="font-extrabold text-[#2D2521]">Manual availability blocks</h4><p className="mt-1 text-sm leading-relaxed text-stone-600">Use Melbourne local dates. The end date is checkout-style and becomes available again. Internal notes stay admin-only and never enter iCal exports.</p></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.1fr_1.5fr_auto]"><label className="text-xs font-bold uppercase tracking-[0.08em]">Start<input className="field mt-1 min-h-11" type="date" value={blockDraft.startDate} onChange={(event) => updateBlockDraft(property.id, { startDate: event.target.value })} /></label><label className="text-xs font-bold uppercase tracking-[0.08em]">End<input className="field mt-1 min-h-11" type="date" value={blockDraft.endDate} onChange={(event) => updateBlockDraft(property.id, { endDate: event.target.value })} /></label><label className="text-xs font-bold uppercase tracking-[0.08em]">Reason<select className="field mt-1 min-h-11 text-sm normal-case tracking-normal" value={blockDraft.blockReason} onChange={(event) => updateBlockDraft(property.id, { blockReason: event.target.value as BlockReason })}>{BLOCK_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-[0.08em]">Internal note<input className="field mt-1 min-h-11 text-sm normal-case tracking-normal" maxLength={1000} value={blockDraft.internalNote} onChange={(event) => updateBlockDraft(property.id, { internalNote: event.target.value })} placeholder="Optional private note" /></label><div className="flex items-end gap-2"><button type="button" className="btn-primary inline-flex min-h-11 items-center justify-center gap-2" onClick={() => void saveBlock(property)} disabled={busy === `block:${property.id}`}><CalendarPlus size={15} />{editingBlockId ? "Save block" : "Add block"}</button>{editingBlockId && <button type="button" className="btn-secondary inline-flex min-h-11 items-center justify-center" aria-label="Cancel editing" onClick={() => { setEditingBlockId(""); setBlockDrafts((current) => ({ ...current, [property.id]: emptyBlockDraft() })); }}><X size={15} /></button>}</div></div>
          {property.directBlocks.length > 0 && <div className="mt-4 grid gap-2">{property.directBlocks.map((block) => <div key={block.id} className="flex flex-wrap items-center justify-between gap-3 border border-[#EAE1DD] bg-white px-3 py-3 text-sm"><div><p className="font-bold">{block.summary} · {formatCalendarDate(block.startDate)} to {formatCalendarDate(block.endDate)}</p><p className="text-xs text-stone-500">Source: Manual Serenity{block.internalNote ? ` · Private note: ${block.internalNote}` : ""}</p></div><div className="flex gap-2"><button type="button" className="btn-secondary inline-flex min-h-9 items-center gap-1 text-xs" onClick={() => editBlock(property, block)}><Pencil size={14} /> Edit</button><button type="button" className="btn-secondary inline-flex min-h-9 items-center gap-1 text-xs text-[#8A3325]" onClick={() => void removeBlock(block.id)} disabled={busy === `remove-block:${block.id}`}><Trash2 size={14} /> Remove</button></div></div>)}</div>}
          <div className="mt-5"><MonthlyBlockCalendar items={property.calendarItems ?? []} /></div>
        </div>
      </section>;
    })}
    {!activeProperties.length && <div className="card bg-white p-8 text-sm text-stone-600">No target properties were found. Add serenity-7, serenity-9, or serenity-11 to Supabase before configuring feeds.</div>}
  </div>;
}
