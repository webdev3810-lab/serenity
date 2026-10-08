"use client";
import { AdminBadge,useAdminWorkspace,useDirtyGuard } from "@/src/components/admin/AdminUI";

import { todayIso } from "@/src/lib/booking";
import { CALENDAR_PLATFORM_LABELS,CALENDAR_PLATFORMS,type CalendarPlatform } from "@/src/lib/calendar/types";
import { AlertTriangle,CalendarPlus,Check,CheckCircle2,Copy,ExternalLink,Link2,LoaderCircle,Pause,Pencil,Play,RefreshCw,Save,TestTube2,Trash2,Unplug,X } from "lucide-react";
import { useEffect,useMemo,useState } from "react";

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
  uploadedCalendar: { eventCount: number };
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


function MonthlyBlockCalendar({ items }: { items: CalendarItem[] }) {
  const [offset, setOffset] = useState(0);
  const today = new Date(`${todayIso()}T00:00:00Z`);
  const month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1));
  const daysInMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  const leading = month.getUTCDay();
  const label = new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }).format(month);
  const cells = [...Array.from({ length: leading }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const sourceTone: Record<string, string> = { direct: "bg-[var(--admin-accent)]", uploaded: "bg-[var(--admin-accent)]", airbnb: "bg-[var(--admin-info-text)]", vrbo: "bg-[var(--admin-info-text)]", stayz: "bg-[var(--admin-info-text)]" };
  const visibleSources = [...new Set(items.map((item) => item.source))];

  return <div className="admin-calendar-grid">
    <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-3 py-3">
      <button type="button" className="admin-button min-h-9 px-3 text-sm" onClick={() => setOffset((current) => current - 1)}>Previous</button>
      <p className="font-semibold text-[var(--admin-text)]">{label}</p>
      <button type="button" className="admin-button min-h-9 px-3 text-sm" onClick={() => setOffset((current) => current + 1)}>Next</button>
    </div>
    <div className="grid grid-cols-7 border-b border-[var(--admin-border)] bg-[var(--admin-surface-alt)] text-center text-sm font-medium text-[var(--admin-muted)]">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="border-r border-[var(--admin-border)] py-2 last:border-r-0">{day}</div>)}
    </div>
    <div className="grid grid-cols-7">{cells.map((day, index) => {
      if (!day) return <div key={`empty-${index}`} className="min-h-16 border-b border-r border-[var(--admin-border)] bg-[var(--admin-surface-alt)]" />;
      const iso = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const matches = items.filter((item) => item.startDate <= iso && item.endDate > iso);
      return <div key={iso} title={matches.length ? `${iso}: ${matches.map((item) => item.source).join(", ")}` : iso} className={`min-h-16 border-b border-r border-[var(--admin-border)] p-2 ${matches.length ? "bg-[var(--admin-info-bg)]" : "bg-[var(--admin-surface)]"}`}>
        <span className="text-sm font-medium text-[var(--admin-text)]">{day}</span>
        {matches.slice(0, 1).map((item) => <div key={`${item.id}-${iso}`} className="mt-1 flex items-center gap-1 text-xs font-semibold text-[var(--admin-info-text)]"><span className={`h-2 w-2 shrink-0 rounded-full ${sourceTone[item.source] ?? "bg-[var(--admin-info-text)]"}`} /><span className="truncate">{item.source === "direct" ? "Serenity" : item.source}</span></div>)}
        {matches.length > 1 && <p className="mt-0.5 text-xs font-medium text-[var(--admin-muted)]">+{matches.length - 1} more</p>}
      </div>;
    })}</div>
    <div className="flex flex-wrap gap-4 border-t border-[var(--admin-border)] px-3 py-3 text-sm font-medium text-[var(--admin-muted)]">
      {visibleSources.length === 0 ? <span>No blocked dates in this preview.</span> : visibleSources.map((source) => <span key={source} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${sourceTone[source] ?? "bg-[var(--admin-info-text)]"}`} />{source === "direct" ? "Serenity / manual" : source}</span>)}
    </div>
  </div>;
}

export default function CalendarSyncManager() {
  const { confirm } = useAdminWorkspace();
  const [properties, setProperties] = useState<CalendarProperty[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [tests, setTests] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [blockDrafts, setBlockDrafts] = useState<Record<string, BlockDraft>>({});
  const [editingBlockId, setEditingBlockId] = useState("");
  const [previewPropertyId, setPreviewPropertyId] = useState("");
  useDirtyGuard(Boolean(busy) || Object.values(blockDrafts).some(draft => Boolean(draft.startDate || draft.endDate || draft.internalNote)) || properties.some(property => property.connections.some(connection => connection.connection_type === "import" && (urls[`${property.id}:${connection.platform}`] ?? "") !== (connection.external_calendar_url ?? ""))));

  const load = async () => {
    setLoading(true); setError("");
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
      if (data.sync?.status === "error") {
        setFailure(new Error(`${CALENDAR_PLATFORM_LABELS[platform]} link saved for ${property.name}, but dates could not be checked: ${data.sync.message}`), "Calendar check failed.");
      } else if (data.sync?.status === "conflict") {
        setFailure(new Error(`${CALENDAR_PLATFORM_LABELS[platform]} dates overlap an existing booking for ${property.name}. Review the warning below.`), "Calendar dates overlap.");
      } else {
        setSuccess(`${CALENDAR_PLATFORM_LABELS[platform]} linked to ${property.name}. Its booked dates now block availability on this site.`);
      }
      await load();
    } catch (saveError) { setFailure(saveError, "Could not save calendar feed."); }
    finally { setBusy(""); }
  };

  const clearUploadedCalendar = async (property: CalendarProperty) => {
    if (!await confirm(`Clear the uploaded calendar snapshot for ${property.name}? Live feed connections and manual blocks will remain.`)) return;
    setBusy(`clear-upload:${property.id}`); setError(""); setMessage("");
    try {
      await request(`/api/admin/calendar/upload?propertyId=${encodeURIComponent(property.id)}`, { method: "DELETE" });
      setSuccess(`Uploaded calendar snapshot cleared for ${property.name}.`);
      await load();
    } catch (clearError) { setFailure(clearError, "Could not clear the uploaded calendar snapshot."); }
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
      if (failed) setFailure(new Error(`${failed} calendar link${failed === 1 ? "" : "s"} needs attention.`), "Calendar refresh failed.");
      else setSuccess("Booked dates refreshed.");
      await load();
    } catch (syncError) { setFailure(syncError, "Could not sync calendars."); }
    finally { setBusy(""); }
  };

  const disconnect = async (connection: Connection, property: CalendarProperty) => {
    if (!await confirm(`Disconnect ${CALENDAR_PLATFORM_LABELS[connection.platform as CalendarPlatform]} from ${property.name}? Imported dates from this feed will stop blocking bookings.`)) return;
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
    if (!await confirm("Remove these manually blocked dates?")) return;
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
  const previewProperty = activeProperties.find((property) => property.id === previewPropertyId) ?? activeProperties[0];

  if (loading) return <div className="admin-card admin-loading-state" role="status"><LoaderCircle size={18} className="animate-spin" aria-hidden="true" /><span>Loading calendar connections…</span></div>;

  return <div className="grid gap-6">
    <header className="admin-page-header flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div><p className="admin-eyebrow">Availability</p><h2 className="admin-page-title">House calendars</h2><p className="admin-page-description">See which houses are connected to Airbnb and refresh their booked dates.</p></div>
      <button type="button" className="admin-button admin-button-primary inline-flex min-h-11 items-center justify-center gap-2" onClick={() => void sync()} disabled={Boolean(busy)}><RefreshCw size={16} className={busy.startsWith("sync:") ? "animate-spin" : ""} /> Refresh all</button>
    </header>
    {message && <div className="admin-notice is-success" role="status"><Check size={18} />{message}</div>}
    {error && <div className="admin-notice is-error" role="alert"><AlertTriangle size={18} />{error}<button type="button" className="admin-button" onClick={() => void load()}>Retry</button></div>}

    {previewProperty && <section className="admin-card bg-[var(--admin-surface)] p-5 sm:p-6" aria-labelledby="calendar-preview-heading">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h3 id="calendar-preview-heading" className="text-xl font-semibold text-[var(--admin-text)]">Calendar preview</h3><p className="mt-1 text-sm text-[var(--admin-muted)]">Choose a house to see its unavailable dates.</p></div>
        <div className="flex flex-wrap gap-2" aria-label="Choose a house calendar">
          {activeProperties.map((property) => <button key={property.id} type="button" aria-pressed={property.id === previewProperty.id} className={`admin-button min-h-10 text-sm ${property.id === previewProperty.id ? "admin-button-primary" : ""}`} onClick={() => setPreviewPropertyId(property.id)}>{property.name.replace(/\s+-\s+Whole$/, "")}</button>)}
        </div>
      </div>
      <div className="mt-5"><MonthlyBlockCalendar key={previewProperty.id} items={previewProperty.calendarItems ?? []} /></div>
      <p className="mt-3 text-sm text-[var(--admin-muted)]">Coloured dates are unavailable. A checkout date becomes available again.</p>
    </section>}

    <details className="admin-card group bg-[var(--admin-surface)] p-5 sm:p-6">
      <summary className="cursor-pointer font-semibold text-[var(--admin-text)]">How does this work?</summary>
      <div className="mt-4 grid gap-3 text-sm leading-relaxed text-[var(--admin-muted)] sm:grid-cols-3">
        <p>Airbnb sends its booked dates to this site through the link saved for each house.</p>
        <p>Use <strong className="text-[var(--admin-text)]">Refresh all</strong> to check for new dates now. Automatic updates need a scheduled sync on your host.</p>
        <p>To block Airbnb when a booking is made here, add the Serenity export link from Advanced tools to Airbnb.</p>
      </div>
    </details>

    {activeProperties.map((property) => {
      const direct = property.connections.find((connection) => connection.connection_type === "export");
      const airbnb = property.connections.find((connection) => connection.platform === "airbnb" && connection.connection_type === "import");
      const airbnbKey = `${property.id}:airbnb`;
      const airbnbUrlChanged = Boolean(airbnb && (urls[airbnbKey] ?? "") !== (airbnb.external_calendar_url ?? ""));
      const airbnbConnected = Boolean(airbnb?.is_enabled && airbnb.sync_status === "success" && airbnb.last_success_at && !airbnbUrlChanged);
      const blockDraft = blockDrafts[property.id] ?? emptyBlockDraft();
      return <section key={property.id} className="admin-card bg-[var(--admin-surface)] p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--admin-border)] pb-5 sm:flex-row sm:items-center">
          <div><h3 className="text-2xl font-semibold text-[var(--admin-text)]">{property.name}</h3><p className="mt-1 text-sm text-[var(--admin-muted)]">{airbnbConnected ? `Airbnb checked ${formatDate(airbnb?.last_success_at ?? null)}` : "Airbnb availability"}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            {airbnbConnected ? <span className="admin-badge gap-1.5" data-tone="success"><CheckCircle2 size={14} aria-hidden="true" /> Connected</span> : <AdminBadge domain="calendar" value={airbnbUrlChanged ? "waiting" : !airbnb ? "not_configured" : !airbnb.is_enabled ? "disabled" : airbnb.sync_status === "error" ? "error" : airbnb.sync_status === "conflict" ? "conflict" : "waiting"} label={airbnbUrlChanged ? "Unsaved link" : statusLabel(airbnb)} />}
            {airbnb && <button type="button" className="admin-button inline-flex min-h-10 items-center gap-2" onClick={() => void sync(property.id, "airbnb")} disabled={!airbnb.is_enabled || Boolean(busy)}><RefreshCw size={15} className={busy === `sync:${property.id}:airbnb` ? "animate-spin" : ""} /> Refresh dates</button>}
          </div>
        </div>
        {property.conflicts.length > 0 && <div className="mt-5 border border-[var(--admin-warning-border)] bg-[var(--admin-warning-bg)] p-4 text-sm text-[var(--admin-warning-text)]"><div className="flex items-start gap-3"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><strong>Calendar conflict.</strong><p className="mt-1">An imported block overlaps an existing Serenity booking. The existing booking has not been changed.</p>{property.conflicts.map((conflict, index) => <p key={`${conflict.platform}-${conflict.startDate}-${index}`} className="mt-1 font-semibold">{conflict.platform.toUpperCase()}: {formatCalendarDate(conflict.startDate)} – {formatCalendarDate(conflict.endDate)}</p>)}</div></div></div>}

        <div className="mt-5 rounded-xl bg-[var(--admin-surface-alt)] p-4 sm:p-5">
          <p className="text-sm leading-relaxed text-[var(--admin-muted)]">{airbnbConnected ? "Booked dates from Airbnb are blocking availability on your website." : airbnb?.sync_status === "error" ? "Airbnb could not be checked. Check the link below and try again." : "Paste this house’s Airbnb calendar link to block its booked dates here."}</p>
          {airbnb?.last_error && <p className="mt-2 text-sm text-[var(--admin-danger-text)]" role="alert">{airbnb.last_error}</p>}
          {airbnb ? <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-[var(--admin-text)]">Change Airbnb link</summary>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input aria-label={`${property.name} Airbnb calendar link`} className="admin-field min-h-11 flex-1 font-mono text-sm" type="url" value={urls[airbnbKey] ?? ""} onChange={(event) => setUrls((current) => ({ ...current, [airbnbKey]: event.target.value }))} /><button type="button" className="admin-button admin-button-primary" onClick={() => void saveConnection(property, "airbnb")} disabled={Boolean(busy) || !airbnbUrlChanged}><Save size={15} /> Save and check</button></div>
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="admin-button text-sm" onClick={() => void toggleConnection(airbnb)} disabled={Boolean(busy)}>{airbnb.is_enabled ? "Pause connection" : "Resume connection"}</button><button type="button" className="admin-button text-sm text-[var(--admin-danger-text)]" onClick={() => void disconnect(airbnb, property)} disabled={Boolean(busy)}>Disconnect</button></div>
          </details> : <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input aria-label={`${property.name} Airbnb calendar link`} className="admin-field min-h-11 flex-1 font-mono text-sm" type="url" placeholder="Paste Airbnb’s iCal link" value={urls[airbnbKey] ?? ""} onChange={(event) => setUrls((current) => ({ ...current, [airbnbKey]: event.target.value }))} /><button type="button" className="admin-button admin-button-primary" onClick={() => void saveConnection(property, "airbnb")} disabled={Boolean(busy) || !urls[airbnbKey]?.trim()}><Save size={15} /> Connect Airbnb</button></div>}
        </div>

        <details className="mt-4 border-t border-[var(--admin-border)] pt-4">
          <summary className="cursor-pointer font-semibold text-[var(--admin-text)]">Advanced calendar tools</summary>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">Use these only if you need to send Serenity bookings to Airbnb, connect another platform, or block dates manually.</p>

        <div className="mt-6 border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-[var(--admin-text)]">Direct Serenity calendar</h4><AdminBadge domain="calendar" value={direct?.hasExportToken ? "connected" : "not_configured"} label={direct?.hasExportToken ? "Enabled" : "Not configured"} /></div><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--admin-muted)]">Exports confirmed and pending Serenity holds, corporate bookings, manual blocks, maintenance, cleaning, and preparation dates without guest or payment details.</p></div><button type="button" className="admin-button admin-button-primary inline-flex min-h-11 shrink-0 items-center justify-center gap-2" onClick={() => void createLink(property)} disabled={busy === `link:${property.id}`}><Link2 size={15} /> {direct?.hasExportToken ? "Regenerate secure URL" : "Generate secure URL"}</button></div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input aria-label={`${property.name} Serenity export URL`} className="admin-field min-h-11 flex-1 font-mono text-sm" readOnly value={links[property.id] ?? (direct?.hasExportToken ? "A secure URL exists. Regenerate it to reveal and copy a new token." : "Generate a secure URL to begin.")} />{links[property.id] && <><button type="button" className="admin-button inline-flex items-center justify-center gap-2" onClick={() => void copyText(links[property.id], "Serenity calendar URL copied.")}><Copy size={15} /> Copy</button><a className="admin-button inline-flex items-center justify-center gap-2" href={links[property.id]} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Test export</a></>}</div>
          <p className="mt-3 text-sm text-[var(--admin-muted)]">Secure tokens are stored only as one-way hashes. A newly generated raw link is retained only in this signed-in browser tab session.</p>
        </div>

        <div className="mt-5 grid gap-4">
          {CALENDAR_PLATFORMS.filter((platform) => platform !== "airbnb").map((platform) => {
            const connection = property.connections.find((item) => item.platform === platform && item.connection_type === "import");
            const key = `${property.id}:${platform}`;
            const test = tests[key];
            const safeExportLink = providerLink(property.id, platform);
            const hasUnsavedUrl = Boolean(connection && (urls[key] ?? "") !== (connection.external_calendar_url ?? ""));
            const isConnected = Boolean(connection?.is_enabled && connection.sync_status === "success" && connection.last_success_at && !hasUnsavedUrl);
            return <div key={platform} className="border border-[var(--admin-border)] p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-[var(--admin-text)]">{CALENDAR_PLATFORM_LABELS[platform]}</h4>{isConnected ? <span className="admin-badge gap-1.5" data-tone="success"><CheckCircle2 size={14} aria-hidden="true" /> Connected</span> : hasUnsavedUrl ? <AdminBadge domain="calendar" value="waiting" label="Unsaved changes" /> : <AdminBadge domain="calendar" value={!connection ? "not_configured" : !connection.is_enabled ? "disabled" : connection.sync_status === "error" ? "error" : connection.sync_status === "conflict" ? "conflict" : "waiting"} label={statusLabel(connection)} />}<span className="border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-1 text-sm font-medium text-[var(--admin-muted)]">{connection?.is_enabled ? "Enabled" : "Disabled"}</span></div><p className="mt-2 text-sm text-[var(--admin-muted)]">Private {CALENDAR_PLATFORM_LABELS[platform]} export feed for {property.name}.</p></div><div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-[var(--admin-muted)] sm:grid-cols-4"><div><span className="block font-medium">Last success</span>{formatDate(connection?.last_success_at ?? null)}</div><div><span className="block font-medium">Last attempt</span>{formatDate(connection?.last_attempt_at ?? connection?.last_synced_at ?? null)}</div><div><span className="block font-medium">Frequency</span>{connection?.sync_frequency_minutes ?? 15} minutes</div><div><span className="block font-medium">Active dates</span>{connection?.importedEventCount ?? connection?.last_imported_event_count ?? 0}</div></div></div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2"><label className="text-sm font-medium text-[var(--admin-muted)]">Serenity export URL<input className="admin-field mt-1 min-h-11 font-mono text-sm normal-case tracking-normal" readOnly value={safeExportLink || "Generate the Direct Serenity URL above."} /></label><label className="text-sm font-medium text-[var(--admin-muted)]">External calendar import URL<input aria-label={`${CALENDAR_PLATFORM_LABELS[platform]} iCal URL`} className="admin-field mt-1 min-h-11 font-mono text-sm normal-case tracking-normal" type="text" inputMode="url" placeholder="https://…/calendar.ics or webcal://…" value={urls[key] ?? ""} onChange={(event) => setUrls((current) => ({ ...current, [key]: event.target.value }))} /></label></div>
              <div className="mt-3 flex flex-wrap gap-2">{safeExportLink && <button type="button" className="admin-button inline-flex min-h-10 items-center gap-2 text-sm" onClick={() => void copyText(safeExportLink, `${CALENDAR_PLATFORM_LABELS[platform]}-safe Serenity URL copied.`)}><Copy size={14} /> Copy Serenity URL</button>}<button type="button" className="admin-button inline-flex min-h-10 items-center gap-2 text-sm" onClick={() => void testConnection(property, platform)} disabled={busy === `test:${key}`}><TestTube2 size={14} /> {busy === `test:${key}` ? "Testing…" : "Test connection"}</button><button type="button" className="admin-button admin-button-primary inline-flex min-h-10 items-center gap-2 text-sm" onClick={() => void saveConnection(property, platform)} disabled={busy === `save:${key}`}><Save size={14} /> {busy === `save:${key}` ? "Saving…" : "Save connection"}</button>{connection && <><button type="button" className="admin-button inline-flex min-h-10 items-center gap-2 text-sm" onClick={() => void sync(property.id, platform)} disabled={!connection.is_enabled || Boolean(busy)}><RefreshCw size={14} /> Sync now</button><button type="button" className="admin-button inline-flex min-h-10 items-center gap-2 text-sm" onClick={() => void toggleConnection(connection)} disabled={busy === `toggle:${connection.id}`}>{connection.is_enabled ? <Pause size={14} /> : <Play size={14} />}{connection.is_enabled ? "Disable" : "Enable"}</button><button type="button" className="admin-button inline-flex min-h-10 items-center gap-2 text-sm text-[var(--admin-danger-text)]" onClick={() => void disconnect(connection, property)} disabled={busy === `disconnect:${connection.id}`}><Unplug size={14} /> Disconnect</button></>}</div>
              {test && <div className={`mt-3 border p-3 text-sm ${test.status === "invalid_url" ? "border-[var(--admin-danger-border)] bg-[var(--admin-danger-bg)] text-[var(--admin-danger-text)]" : "border-[var(--admin-success-border)] bg-[var(--admin-success-bg)] text-[var(--admin-success-text)]"}`}><strong>{test.status === "connected" ? "Connected" : test.status === "no_events" ? "No events found" : "Invalid URL"}.</strong> {test.message}{typeof test.eventCount === "number" ? ` (${test.eventCount} blocking event${test.eventCount === 1 ? "" : "s"})` : ""}</div>}
              {connection?.last_error && <p className="mt-3 border-l-2 border-[var(--admin-danger-border)] pl-3 text-sm text-[var(--admin-danger-text)]">{connection.last_error}</p>}
            </div>;
          })}
        </div>

        {(property.uploadedCalendar?.eventCount ?? 0) > 0 && <div className="mt-5 border border-[var(--admin-warning-border)] bg-[var(--admin-warning-bg)] p-4 sm:p-5">
          <h4 className="font-semibold text-[var(--admin-warning-text)]">Old calendar file dates</h4>
          <p className="mt-1 text-sm leading-relaxed text-[var(--admin-warning-text)]">{property.uploadedCalendar.eventCount} date block(s) came from a one-time file upload. Once your live calendar link is connected, clear these old blocks so they do not stay unavailable after Airbnb changes.</p>
          <button type="button" className="admin-button mt-3 min-h-11 text-sm" disabled={Boolean(busy)} onClick={() => void clearUploadedCalendar(property)}>Clear old file dates</button>
        </div>}

        <div className="mt-6 border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4 sm:p-5">
          <div><h4 className="font-semibold text-[var(--admin-text)]">Manual availability blocks</h4><p className="mt-1 text-sm leading-relaxed text-[var(--admin-muted)]">Use Melbourne local dates. The end date is checkout-style and becomes available again. Internal notes stay admin-only and never enter iCal exports.</p></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.1fr_1.5fr_auto]"><label className="text-sm font-medium">Start<input className="admin-field mt-1 min-h-11" type="date" value={blockDraft.startDate} onChange={(event) => updateBlockDraft(property.id, { startDate: event.target.value })} /></label><label className="text-sm font-medium">End<input className="admin-field mt-1 min-h-11" type="date" value={blockDraft.endDate} onChange={(event) => updateBlockDraft(property.id, { endDate: event.target.value })} /></label><label className="text-sm font-medium">Reason<select className="admin-field mt-1 min-h-11 text-sm normal-case tracking-normal" value={blockDraft.blockReason} onChange={(event) => updateBlockDraft(property.id, { blockReason: event.target.value as BlockReason })}>{BLOCK_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select></label><label className="text-sm font-medium">Internal note<input className="admin-field mt-1 min-h-11 text-sm normal-case tracking-normal" maxLength={1000} value={blockDraft.internalNote} onChange={(event) => updateBlockDraft(property.id, { internalNote: event.target.value })} placeholder="Optional private note" /></label><div className="flex items-end gap-2"><button type="button" className="admin-button admin-button-primary inline-flex min-h-11 items-center justify-center gap-2" onClick={() => void saveBlock(property)} disabled={busy === `block:${property.id}`}><CalendarPlus size={15} />{editingBlockId ? "Save block" : "Add block"}</button>{editingBlockId && <button type="button" className="admin-button inline-flex min-h-11 items-center justify-center" aria-label="Cancel editing" onClick={() => { setEditingBlockId(""); setBlockDrafts((current) => ({ ...current, [property.id]: emptyBlockDraft() })); }}><X size={15} /></button>}</div></div>
          {property.directBlocks.length > 0 && <div className="mt-4 grid gap-2">{property.directBlocks.map((block) => <div key={block.id} className="flex flex-wrap items-center justify-between gap-3 border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-3 text-sm"><div><p className="font-medium">{block.summary} · {formatCalendarDate(block.startDate)} to {formatCalendarDate(block.endDate)}</p><p className="text-sm text-[var(--admin-muted)]">Source: Manual Serenity{block.internalNote ? ` · Private note: ${block.internalNote}` : ""}</p></div><div className="flex gap-2"><button type="button" className="admin-button inline-flex min-h-9 items-center gap-1 text-sm" onClick={() => editBlock(property, block)}><Pencil size={14} /> Edit</button><button type="button" className="admin-button inline-flex min-h-9 items-center gap-1 text-sm text-[var(--admin-danger-text)]" onClick={() => void removeBlock(block.id)} disabled={busy === `remove-block:${block.id}`}><Trash2 size={14} /> Remove</button></div></div>)}</div>}
        </div>
        </details>
      </section>;
    })}
    {!activeProperties.length && <div className="admin-card bg-[var(--admin-surface)] p-8 text-sm text-[var(--admin-muted)]">No target properties were found. Add serenity-7, serenity-9, or serenity-11 to Supabase before configuring feeds.</div>}
  </div>;
}
