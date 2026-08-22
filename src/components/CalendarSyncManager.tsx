"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarPlus, Check, Copy, ExternalLink, Link2, RefreshCw, Trash2, Unplug } from "lucide-react";
import { CALENDAR_PLATFORM_LABELS, CALENDAR_PLATFORMS, type CalendarPlatform } from "@/src/lib/calendar/types";

type Connection = {
  id: string;
  property_id: string;
  platform: "direct" | CalendarPlatform;
  connection_type: "export" | "import";
  external_calendar_url: string | null;
  is_enabled: boolean;
  last_synced_at: string | null;
  last_success_at: string | null;
  last_error: string;
  sync_status: string;
  importedEventCount: number;
  hasExportToken: boolean;
};

type CalendarProperty = {
  id: string;
  name: string;
  slug: string;
  connections: Connection[];
  conflicts: Array<{ platform: string; startDate: string; endDate: string }>;
  directBlocks: Array<{ id: string; startDate: string; endDate: string; summary: string }>;
};

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(connection: Connection | undefined) {
  if (!connection || !connection.is_enabled) return "Not connected";
  if (connection.sync_status === "conflict") return "Conflict found";
  if (connection.sync_status === "error") return "Sync error";
  if (connection.sync_status === "success") return "Synced";
  return "Ready to sync";
}

export default function CalendarSyncManager() {
  const [properties, setProperties] = useState<CalendarProperty[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [blockDrafts, setBlockDrafts] = useState<Record<string, { startDate: string; endDate: string; blockType: "blocked" | "maintenance" | "preparation" }>>({});

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
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load calendar connections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const request = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers ?? {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The calendar action could not be completed.");
    return data;
  };

  const saveConnection = async (property: CalendarProperty, platform: CalendarPlatform) => {
    const key = `${property.id}:${platform}`;
    setBusy(key); setError(""); setMessage("");
    try {
      await request("/api/admin/calendar/connections", { method: "POST", body: JSON.stringify({ propertyId: property.id, platform, externalUrl: urls[key] ?? "" }) });
      setMessage(`${CALENDAR_PLATFORM_LABELS[platform]} feed saved for ${property.name}.`);
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save calendar feed."); }
    finally { setBusy(""); }
  };

  const sync = async (propertyId?: string, platform?: CalendarPlatform) => {
    const key = `sync:${propertyId ?? "all"}:${platform ?? "all"}`;
    setBusy(key); setError(""); setMessage("");
    try {
      const data = await request("/api/admin/calendar/sync", { method: "POST", body: JSON.stringify({ propertyId, platform }) });
      const failed = (data.results as Array<{ status: string }>).filter((result) => result.status === "error").length;
      setMessage(failed ? `${failed} calendar feed${failed === 1 ? "" : "s"} needs attention.` : "Calendar sync completed.");
      await load();
    } catch (syncError) { setError(syncError instanceof Error ? syncError.message : "Could not sync calendars."); }
    finally { setBusy(""); }
  };

  const disconnect = async (connection: Connection, property: CalendarProperty) => {
    if (!window.confirm(`Disconnect ${CALENDAR_PLATFORM_LABELS[connection.platform as CalendarPlatform]} from ${property.name}?`)) return;
    setBusy(connection.id); setError(""); setMessage("");
    try {
      await request(`/api/admin/calendar/connections/${connection.id}`, { method: "DELETE" });
      setMessage("Calendar disconnected. Its imported dates are no longer blocking bookings.");
      await load();
    } catch (disconnectError) { setError(disconnectError instanceof Error ? disconnectError.message : "Could not disconnect calendar."); }
    finally { setBusy(""); }
  };

  const createLink = async (property: CalendarProperty) => {
    setBusy(`link:${property.id}`); setError(""); setMessage("");
    try {
      const data = await request("/api/admin/calendar/token", { method: "POST", body: JSON.stringify({ propertyId: property.id }) });
      setLinks((current) => ({ ...current, [property.id]: data.url }));
      setMessage("Secure Serenity calendar link created. Copy it now; the link is not shown again after refresh.");
    } catch (linkError) { setError(linkError instanceof Error ? linkError.message : "Could not create calendar link."); }
    finally { setBusy(""); }
  };

  const addBlock = async (property: CalendarProperty) => {
    const draft = blockDrafts[property.id];
    if (!draft) return;
    setBusy(`block:${property.id}`); setError(""); setMessage("");
    try {
      await request("/api/admin/calendar/blocks", { method: "POST", body: JSON.stringify({ propertyId: property.id, ...draft }) });
      setMessage("Blocked dates added to availability and calendar exports.");
      setBlockDrafts((current) => ({ ...current, [property.id]: { ...draft, startDate: "", endDate: "" } }));
      await load();
    } catch (blockError) { setError(blockError instanceof Error ? blockError.message : "Could not add blocked dates."); }
    finally { setBusy(""); }
  };

  const removeBlock = async (blockId: string) => {
    if (!window.confirm("Remove these blocked dates?")) return;
    setBusy(`remove-block:${blockId}`); setError(""); setMessage("");
    try {
      await request(`/api/admin/calendar/blocks/${blockId}`, { method: "DELETE" });
      setMessage("Blocked dates removed.");
      await load();
    } catch (blockError) { setError(blockError instanceof Error ? blockError.message : "Could not remove blocked dates."); }
    finally { setBusy(""); }
  };

  const copyLink = async (propertyId: string) => {
    const link = links[propertyId];
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setMessage("Calendar link copied.");
  };

  const copyPlatformLink = async (propertyId: string, platform: CalendarPlatform) => {
    const link = links[propertyId];
    if (!link) return;
    await navigator.clipboard.writeText(`${link}&source=${platform}`);
    setMessage(`${CALENDAR_PLATFORM_LABELS[platform]} Serenity link copied.`);
  };

  const activeProperties = useMemo(() => properties.filter((property) => property.slug), [properties]);

  if (loading) return <div className="card bg-white p-8 text-sm text-stone-600">Loading calendar connections…</div>;

  return <div className="grid gap-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div><p className="admin-eyebrow">Availability protection</p><h2 className="admin-page-title">Calendar sync</h2><p className="admin-page-description">Keep Airbnb, Vrbo, Stayz, and Serenity bookings aligned without sending calendar files through the app server.</p></div>
      <button type="button" className="btn-primary inline-flex min-h-11 items-center justify-center gap-2" onClick={() => void sync()} disabled={Boolean(busy)}><RefreshCw size={16} className={busy.startsWith("sync:") ? "animate-spin" : ""} /> Sync all calendars</button>
    </div>
    {message && <div className="admin-notice is-success" role="status"><Check size={18} />{message}</div>}
    {error && <div className="admin-notice is-error" role="alert"><AlertTriangle size={18} />{error}</div>}
    <div className="rounded-none border border-[#D8CCC4] bg-[#F7F4F1] p-5 text-sm leading-relaxed text-stone-700"><strong>How it works.</strong> Paste each platform&apos;s private iCal export URL below. Serenity fetches those feeds on the server, stores only date blocks, and rejects new bookings that overlap an active imported reservation. Generate one secure Serenity link per house and paste that link into Airbnb, Vrbo, and Stayz.</div>
    {activeProperties.map((property) => {
      const direct = property.connections.find((connection) => connection.connection_type === "export");
      return <section key={property.id} className="card bg-white p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-4 border-b border-[#EAE1DD] pb-5 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B6B55]">Property calendar</p><h3 className="mt-2 text-2xl font-extrabold text-[#2D2521]">{property.name}</h3><p className="mt-1 text-sm text-stone-500">{property.slug}</p></div><button type="button" className="btn-secondary inline-flex min-h-10 items-center justify-center gap-2" onClick={() => void sync(property.id)} disabled={Boolean(busy)}><RefreshCw size={15} /> Sync property</button></div>
        {property.conflicts.length > 0 && <div className="mt-5 flex items-start gap-3 rounded-none border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><span><strong>Calendar conflict.</strong> An imported reservation overlaps a Serenity booking. Review the source platform before accepting any further changes.</span></div>}
        <div className="mt-6 grid gap-4">
          {CALENDAR_PLATFORMS.map((platform) => {
            const connection = property.connections.find((item) => item.platform === platform && item.connection_type === "import");
            const key = `${property.id}:${platform}`;
            return <div key={platform} className="rounded-none border border-[#EAE1DD] p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h4 className="font-extrabold text-[#2D2521]">{CALENDAR_PLATFORM_LABELS[platform]}</h4><p className="mt-1 text-xs text-stone-500">{statusLabel(connection)}{connection?.last_synced_at ? ` · Last checked ${formatDate(connection.last_synced_at)}` : ""}</p></div>{connection && <span className={`rounded-none px-3 py-1 text-xs font-bold ${connection.sync_status === "error" || connection.sync_status === "conflict" ? "bg-red-100 text-red-800" : "bg-[#EAE1DD] text-[#5A463A]"}`}>{connection.importedEventCount} active block{connection.importedEventCount === 1 ? "" : "s"}</span>}</div><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input aria-label={`${CALENDAR_PLATFORM_LABELS[platform]} iCal URL`} className="field min-h-11 flex-1" type="url" placeholder="https://…/calendar.ics" value={urls[key] ?? ""} onChange={(event) => setUrls((current) => ({ ...current, [key]: event.target.value }))} /><button type="button" className="btn-primary inline-flex min-h-11 items-center justify-center gap-2" onClick={() => void saveConnection(property, platform)} disabled={busy === key}><Link2 size={15} /> {busy === key ? "Saving…" : "Save feed"}</button>{connection && <button type="button" className="btn-secondary inline-flex min-h-11 items-center justify-center gap-2" onClick={() => void disconnect(connection, property)} disabled={busy === connection.id}><Unplug size={15} /> Disconnect</button>}</div>{connection?.last_error && <p className="mt-3 text-sm text-red-700">{connection.last_error}</p>}</div>;
          })}
        </div>
        <div className="mt-6 rounded-none border border-[#D8CCC4] bg-[#FBF9F7] p-4 sm:p-5"><div className="flex items-start gap-3"><CalendarPlus size={20} className="mt-0.5 text-[#8B6B55]" /><div><h4 className="font-extrabold text-[#2D2521]">Serenity blocked dates</h4><p className="mt-1 text-sm leading-relaxed text-stone-600">Add maintenance, preparation, or other unavailable periods. These dates block new bookings and are included in the exported calendar.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1.2fr_auto]"><input aria-label="Block start date" className="field min-h-11" type="date" value={blockDrafts[property.id]?.startDate ?? ""} onChange={(event) => setBlockDrafts((current) => ({ ...current, [property.id]: { startDate: event.target.value, endDate: current[property.id]?.endDate ?? "", blockType: current[property.id]?.blockType ?? "blocked" } }))} /><input aria-label="Block end date" className="field min-h-11" type="date" value={blockDrafts[property.id]?.endDate ?? ""} onChange={(event) => setBlockDrafts((current) => ({ ...current, [property.id]: { startDate: current[property.id]?.startDate ?? "", endDate: event.target.value, blockType: current[property.id]?.blockType ?? "blocked" } }))} /><select aria-label="Block type" className="field min-h-11" value={blockDrafts[property.id]?.blockType ?? "blocked"} onChange={(event) => setBlockDrafts((current) => ({ ...current, [property.id]: { startDate: current[property.id]?.startDate ?? "", endDate: current[property.id]?.endDate ?? "", blockType: event.target.value as "blocked" | "maintenance" | "preparation" } }))}><option value="blocked">Unavailable</option><option value="maintenance">Maintenance</option><option value="preparation">Preparation</option></select><button type="button" className="btn-primary inline-flex min-h-11 items-center justify-center gap-2" onClick={() => void addBlock(property)} disabled={busy === `block:${property.id}`}><CalendarPlus size={15} /> Add block</button></div>{property.directBlocks.length > 0 && <div className="mt-4 grid gap-2">{property.directBlocks.map((block) => <div key={block.id} className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-[#EAE1DD] bg-white px-3 py-3 text-sm"><div><p className="font-bold">{block.summary}</p><p className="text-xs text-stone-500">{block.startDate} to {block.endDate} (checkout date is free)</p></div><button type="button" className="btn-secondary inline-flex min-h-9 items-center gap-1 text-xs text-[#8A3325]" onClick={() => void removeBlock(block.id)} disabled={busy === `remove-block:${block.id}`}><Trash2 size={14} /> Remove</button></div>)}</div>}</div>
        <div className="mt-6 rounded-none border border-[#D8CCC4] bg-[#FBF9F7] p-4 sm:p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h4 className="font-extrabold text-[#2D2521]">Serenity export link</h4><p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600">Use this secure link as the iCal import URL on each booking platform. The raw token is never stored or displayed after this screen is refreshed.</p>{direct?.hasExportToken && !links[property.id] && <p className="mt-2 text-xs font-semibold text-stone-500">A link already exists. Generate a new one only if you need to revoke the old link.</p>}</div><button type="button" className="btn-primary inline-flex min-h-11 shrink-0 items-center justify-center gap-2" onClick={() => void createLink(property)} disabled={busy === `link:${property.id}`}><Link2 size={15} /> {direct?.hasExportToken ? "Regenerate link" : "Generate link"}</button></div>{links[property.id] && <div className="mt-4 grid gap-3"><div className="flex flex-col gap-3 sm:flex-row"><input aria-label="New Serenity iCal link" className="field min-h-11 flex-1 font-mono text-xs" readOnly value={links[property.id]} /><button type="button" className="btn-secondary inline-flex min-h-11 items-center justify-center gap-2" onClick={() => void copyLink(property.id)}><Copy size={15} /> Copy base link</button><a className="btn-secondary inline-flex min-h-11 items-center justify-center gap-2" href={links[property.id]} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Test feed</a></div><div className="flex flex-wrap gap-2"><span className="self-center text-xs font-bold text-stone-500">Provider-safe links:</span>{CALENDAR_PLATFORMS.map((platform) => <button key={platform} type="button" className="btn-secondary min-h-9 text-xs" onClick={() => void copyPlatformLink(property.id, platform)}>Copy for {CALENDAR_PLATFORM_LABELS[platform]}</button>)}</div></div>}</div>
      </section>;
    })}
    {!activeProperties.length && <div className="card bg-white p-8 text-sm text-stone-600">No target properties were found. Add serenity-7, serenity-9, or serenity-11 to Supabase before configuring feeds.</div>}
  </div>;
}
