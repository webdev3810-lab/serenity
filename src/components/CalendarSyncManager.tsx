"use client";
import { AdminBadge,useAdminPagination,useAdminWorkspace,useDirtyGuard } from "@/src/components/admin/AdminUI";

import { todayIso } from "@/src/lib/booking";
import { CALENDAR_PLATFORM_LABELS,CALENDAR_PLATFORMS,type CalendarPlatform } from "@/src/lib/calendar/types";
import { AlertTriangle,CalendarPlus,Check,CheckCircle2,Copy,ExternalLink,Link2,LoaderCircle,Pencil,RefreshCw,Save,Trash2,X } from "lucide-react";
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
const BLOCK_REASONS: Array<{ value: BlockReason; label: string }> = [
  { value: "other", label: "Unavailable" },
  { value: "maintenance", label: "Maintenance" },
  { value: "owner_use", label: "Owner use" },
  { value: "cleaning", label: "Cleaning" },
  { value: "preparation", label: "Preparation time" },
  { value: "renovation", label: "Renovation" },
  { value: "private_booking", label: "Private booking" },
];

const emptyBlockDraft = (): BlockDraft => ({ startDate: "", endDate: "", blockReason: "other", internalNote: "" });

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

function ManualBlockList({ blocks, busy, onEdit, onRemove }: {
  blocks: CalendarProperty["directBlocks"];
  busy: string;
  onEdit: (block: CalendarProperty["directBlocks"][number]) => void;
  onRemove: (blockId: string) => void;
}) {
  const { visible, pagination } = useAdminPagination(blocks);
  return <div className="mt-4 grid gap-2">{visible.map((block) => <div key={block.id} className="flex flex-wrap items-center justify-between gap-3 border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-3 text-sm"><div><p className="font-medium">{block.summary} · {formatCalendarDate(block.startDate)} to {formatCalendarDate(block.endDate)}</p><p className="text-sm text-[var(--admin-muted)]">Source: Manual Serenity{block.internalNote ? ` · Private note: ${block.internalNote}` : ""}</p></div><div className="flex gap-2"><button type="button" className="admin-button inline-flex min-h-9 items-center gap-1 text-sm" onClick={() => onEdit(block)}><Pencil size={14} /> Edit</button><button type="button" className="admin-button inline-flex min-h-9 items-center gap-1 text-sm text-[var(--admin-danger-text)]" onClick={() => onRemove(block.id)} disabled={busy === `remove-block:${block.id}`}><Trash2 size={14} /> Remove entire range</button></div></div>)}{pagination}</div>;
}

export default function CalendarSyncManager() {
  const { confirm } = useAdminWorkspace();
  const [properties, setProperties] = useState<CalendarProperty[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [blockDrafts, setBlockDrafts] = useState<Record<string, BlockDraft>>({});
  const [editingBlockId, setEditingBlockId] = useState("");
  const [previewPropertyId, setPreviewPropertyId] = useState("");
  useDirtyGuard(Boolean(busy) || Object.values(blockDrafts).some(draft => Boolean(draft.startDate || draft.endDate || draft.internalNote)) || properties.some(property => CALENDAR_PLATFORMS.some(platform => {
    const connection = property.connections.find(item => item.connection_type === "import" && item.platform === platform);
    return (urls[`${property.id}:${platform}`] ?? "") !== (connection?.external_calendar_url ?? "");
  })));

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
    if (!await confirm("Remove this entire manually blocked range? Every night in it will become available unless another booking or calendar feed blocks it.")) return;
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
  const { visible: visibleProperties, pagination: settingsPagination } = useAdminPagination(activeProperties);
  const previewProperty = activeProperties.find((property) => property.id === previewPropertyId) ?? activeProperties[0];

  if (loading) return <div className="admin-card admin-loading-state" role="status"><LoaderCircle size={18} className="animate-spin" aria-hidden="true" /><span>Loading calendar connections…</span></div>;

  return <div className="grid gap-6">
    <header className="admin-page-header flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div><p className="admin-eyebrow">Availability / connections</p><h2 className="admin-page-title">Calendar sync settings</h2><p className="admin-page-description">Connect each house’s Airbnb, Vrbo, and Stayz iCal links to keep booked dates blocked in the main calendar.</p></div>
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
        <p>Paste each platform’s exported iCal URL below. Its booked dates will block availability on this site after a successful check.</p>
        <p>Use <strong className="text-[var(--admin-text)]">Refresh all</strong> to check for new dates now. Automatic updates need a scheduled sync on your host.</p>
        <p>To send Serenity bookings back to a platform, use its matching Serenity export link under Advanced calendar tools.</p>
      </div>
    </details>

    {visibleProperties.map((property) => {
      const direct = property.connections.find((connection) => connection.connection_type === "export");
      const importConnections = property.connections.filter((connection) => connection.connection_type === "import");
      const connectedCount = CALENDAR_PLATFORMS.filter((platform) => {
        const connection = importConnections.find((item) => item.platform === platform);
        const key = `${property.id}:${platform}`;
        return connection?.is_enabled && connection.sync_status === "success" && connection.last_success_at && (urls[key] ?? "") === (connection.external_calendar_url ?? "");
      }).length;
      const blockDraft = blockDrafts[property.id] ?? emptyBlockDraft();
      return <section key={property.id} className="admin-card bg-[var(--admin-surface)] p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--admin-border)] pb-5 sm:flex-row sm:items-center">
          <div><h3 className="text-2xl font-semibold text-[var(--admin-text)]">{property.name}</h3><p className="mt-1 text-sm text-[var(--admin-muted)]">{connectedCount} of {CALENDAR_PLATFORMS.length} calendar links connected</p></div>
        </div>
        {property.conflicts.length > 0 && <div className="mt-5 border border-[var(--admin-warning-border)] bg-[var(--admin-warning-bg)] p-4 text-sm text-[var(--admin-warning-text)]"><div className="flex items-start gap-3"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><strong>Calendar conflict.</strong><p className="mt-1">An imported block overlaps an existing Serenity booking. The existing booking has not been changed.</p>{property.conflicts.map((conflict, index) => <p key={`${conflict.platform}-${conflict.startDate}-${index}`} className="mt-1 font-semibold">{conflict.platform.toUpperCase()}: {formatCalendarDate(conflict.startDate)} – {formatCalendarDate(conflict.endDate)}</p>)}</div></div></div>}

        <div className="mt-5 grid gap-3">
          {CALENDAR_PLATFORMS.map((platform) => {
            const connection = importConnections.find((item) => item.platform === platform);
            const key = `${property.id}:${platform}`;
            const urlChanged = Boolean(connection && (urls[key] ?? "") !== (connection.external_calendar_url ?? ""));
            const connected = Boolean(connection?.is_enabled && connection.sync_status === "success" && connection.last_success_at && !urlChanged);
            const label = CALENDAR_PLATFORM_LABELS[platform];
            return <div key={platform} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-[var(--admin-text)]">{label}</h4>{connected ? <span className="admin-badge gap-1.5" data-tone="success"><CheckCircle2 size={14} aria-hidden="true" /> Connected</span> : <AdminBadge domain="calendar" value={urlChanged ? "waiting" : !connection ? "not_configured" : !connection.is_enabled ? "disabled" : connection.sync_status === "error" ? "error" : connection.sync_status === "conflict" ? "conflict" : "waiting"} label={urlChanged ? "Unsaved link" : statusLabel(connection)} />}</div>
                {connection && <button type="button" className="admin-button inline-flex min-h-10 items-center gap-2 text-sm" onClick={() => void sync(property.id, platform)} disabled={!connection.is_enabled || Boolean(busy)}><RefreshCw size={15} className={busy === `sync:${property.id}:${platform}` ? "animate-spin" : ""} /> Refresh dates</button>}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--admin-muted)]">{connected ? `Booked dates from ${label} are blocking availability. Last checked ${formatDate(connection?.last_success_at ?? null)}.` : connection?.sync_status === "error" ? `${label} could not be checked. Review its link and try again.` : `Paste this house’s ${label} iCal URL to block its booked dates here.`}</p>
              {connection?.last_error && <p className="mt-2 text-sm text-[var(--admin-danger-text)]" role="alert">{connection.last_error}</p>}
              {connection ? <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-[var(--admin-text)]">Change {label} link</summary>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input aria-label={`${property.name} ${label} calendar link`} className="admin-field min-h-11 flex-1 font-mono text-sm" type="text" inputMode="url" value={urls[key] ?? ""} onChange={(event) => setUrls((current) => ({ ...current, [key]: event.target.value }))} /><button type="button" className="admin-button admin-button-primary inline-flex items-center justify-center gap-2" onClick={() => void saveConnection(property, platform)} disabled={Boolean(busy) || !urlChanged || !urls[key]?.trim()}><Save size={15} /> Save and check</button></div>
                <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="admin-button text-sm" onClick={() => void toggleConnection(connection)} disabled={Boolean(busy)}>{connection.is_enabled ? "Pause connection" : "Resume connection"}</button><button type="button" className="admin-button text-sm text-[var(--admin-danger-text)]" onClick={() => void disconnect(connection, property)} disabled={Boolean(busy)}>Disconnect</button></div>
              </details> : <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input aria-label={`${property.name} ${label} calendar link`} className="admin-field min-h-11 flex-1 font-mono text-sm" type="text" inputMode="url" placeholder={`Paste ${label}’s iCal link`} value={urls[key] ?? ""} onChange={(event) => setUrls((current) => ({ ...current, [key]: event.target.value }))} /><button type="button" className="admin-button admin-button-primary inline-flex items-center justify-center gap-2" onClick={() => void saveConnection(property, platform)} disabled={Boolean(busy) || !urls[key]?.trim()}><Save size={15} /> Connect {label}</button></div>}
            </div>;
          })}
        </div>

        <details className="mt-4 border-t border-[var(--admin-border)] pt-4">
          <summary className="cursor-pointer font-semibold text-[var(--admin-text)]">Advanced calendar tools</summary>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">Use these to send Serenity bookings to external platforms or to block dates manually.</p>

        <div className="mt-6 border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-[var(--admin-text)]">Direct Serenity calendar</h4><AdminBadge domain="calendar" value={direct?.hasExportToken ? "connected" : "not_configured"} label={direct?.hasExportToken ? "Enabled" : "Not configured"} /></div><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--admin-muted)]">Exports confirmed and pending Serenity holds, corporate bookings, manual blocks, maintenance, cleaning, and preparation dates without guest or payment details.</p></div><button type="button" className="admin-button admin-button-primary inline-flex min-h-11 shrink-0 items-center justify-center gap-2" onClick={() => void createLink(property)} disabled={busy === `link:${property.id}`}><Link2 size={15} /> {direct?.hasExportToken ? "Regenerate secure URL" : "Generate secure URL"}</button></div>
          <p className="mt-3 text-sm text-[var(--admin-muted)]">Use the matching URL below in each platform’s import-calendar settings. Each one leaves out that platform’s own dates to avoid sending them back in a loop.</p>
          <div className="mt-4 grid gap-3">
            {CALENDAR_PLATFORMS.map((platform) => {
              const label = CALENDAR_PLATFORM_LABELS[platform];
              const url = providerLink(property.id, platform);
              return <div key={platform} className="flex flex-col gap-2 sm:flex-row sm:items-end"><label className="min-w-0 flex-1 text-sm font-medium text-[var(--admin-text)]">For {label}<input className="admin-field mt-1 min-h-11 w-full font-mono text-sm normal-case tracking-normal" readOnly value={url || (direct?.hasExportToken ? "Regenerate the secure URL to reveal it." : "Generate a secure URL to begin.")} /></label>{url && <button type="button" className="admin-button inline-flex min-h-11 items-center justify-center gap-2" onClick={() => void copyText(url, `Serenity URL for ${label} copied.`)}><Copy size={15} /> Copy URL</button>}</div>;
            })}
          </div>
          {links[property.id] && <a className="admin-button mt-3 inline-flex items-center justify-center gap-2" href={links[property.id]} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Test export</a>}
          <p className="mt-3 text-sm text-[var(--admin-muted)]">Secure tokens are stored only as one-way hashes. A newly generated raw link is retained only in this signed-in browser tab session.</p>
        </div>

        {(property.uploadedCalendar?.eventCount ?? 0) > 0 && <div className="mt-5 border border-[var(--admin-warning-border)] bg-[var(--admin-warning-bg)] p-4 sm:p-5">
          <h4 className="font-semibold text-[var(--admin-warning-text)]">Old calendar file dates</h4>
          <p className="mt-1 text-sm leading-relaxed text-[var(--admin-warning-text)]">{property.uploadedCalendar.eventCount} date block(s) came from a one-time file upload. Once a live platform link is connected, clear these old blocks so they do not stay unavailable after external bookings change.</p>
          <button type="button" className="admin-button mt-3 min-h-11 text-sm" disabled={Boolean(busy)} onClick={() => void clearUploadedCalendar(property)}>Clear old file dates</button>
        </div>}

        <div className="mt-6 border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4 sm:p-5">
          <div><h4 className="font-semibold text-[var(--admin-text)]">Manual availability blocks</h4><p className="mt-1 text-sm leading-relaxed text-[var(--admin-muted)]">Use Melbourne local dates. The end date is checkout-style and becomes available again. Internal notes stay admin-only and never enter iCal exports.</p></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.1fr_1.5fr_auto]"><label className="text-sm font-medium">Start<input className="admin-field mt-1 min-h-11" type="date" value={blockDraft.startDate} onChange={(event) => updateBlockDraft(property.id, { startDate: event.target.value })} /></label><label className="text-sm font-medium">End<input className="admin-field mt-1 min-h-11" type="date" value={blockDraft.endDate} onChange={(event) => updateBlockDraft(property.id, { endDate: event.target.value })} /></label><label className="text-sm font-medium">Reason<select className="admin-field mt-1 min-h-11 text-sm normal-case tracking-normal" value={blockDraft.blockReason} onChange={(event) => updateBlockDraft(property.id, { blockReason: event.target.value as BlockReason })}>{BLOCK_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select></label><label className="text-sm font-medium">Internal note<input className="admin-field mt-1 min-h-11 text-sm normal-case tracking-normal" maxLength={1000} value={blockDraft.internalNote} onChange={(event) => updateBlockDraft(property.id, { internalNote: event.target.value })} placeholder="Optional private note" /></label><div className="flex items-end gap-2"><button type="button" className="admin-button admin-button-primary inline-flex min-h-11 items-center justify-center gap-2" onClick={() => void saveBlock(property)} disabled={busy === `block:${property.id}`}><CalendarPlus size={15} />{editingBlockId ? "Save block" : "Add block"}</button>{editingBlockId && <button type="button" className="admin-button inline-flex min-h-11 items-center justify-center" aria-label="Cancel editing" onClick={() => { setEditingBlockId(""); setBlockDrafts((current) => ({ ...current, [property.id]: emptyBlockDraft() })); }}><X size={15} /></button>}</div></div>
          {property.directBlocks.length > 0 && <ManualBlockList blocks={property.directBlocks} busy={busy} onEdit={(block) => editBlock(property, block)} onRemove={(blockId) => void removeBlock(blockId)} />}
        </div>
        </details>
      </section>;
    })}
    {settingsPagination}
    {!activeProperties.length && <div className="admin-card bg-[var(--admin-surface)] p-8 text-sm text-[var(--admin-muted)]">No target properties were found. Add a house to Supabase before configuring feeds.</div>}
  </div>;
}
