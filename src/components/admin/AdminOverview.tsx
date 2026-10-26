"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AdminTab as Tab } from "@/src/components/SupabaseAdminDashboardV2";
import { addDays, formatAud, formatDateAu, nightsBetween, todayIso } from "@/src/lib/booking";
import { ArrowUpRight, Building2, CalendarClock, CalendarDays, Filter, House, Inbox, RefreshCw, Wallet } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AdminBadge as StatusBadge, useAdminPagination } from "./AdminUI";
import { PageHeader } from "./AdminFields";
import { formatMelbourneCompactDateTime } from "./AdminModels";
type Row = Record<string, any>;
type OverviewPeriod = "today" | "week" | "month" | "year" | "custom";
type OverviewRange = { start: string; end: string };
type OverviewChartPoint = { label: string; value: number; detail?: string };

const OVERVIEW_ACTIVE_BOOKING_STATUSES = ["pending_payment", "confirmed", "corporate", "checked_in"];
const OVERVIEW_BOOKING_STATUSES = ["pending_payment", "confirmed", "corporate", "checked_in", "checked_out", "cancelled", "expired"];

const dateOnly = (value: unknown) => String(value ?? "").slice(0, 10);
const dateInOverviewRange = (value: unknown, range: OverviewRange) => {
  const date = dateOnly(value);
  return Boolean(date) && date >= range.start && date <= range.end;
};
const rangesOverlap = (start: string, end: string, rangeStart: string, rangeEndExclusive: string) => Boolean(start && end) && start < rangeEndExclusive && end > rangeStart;
const isOverviewActiveBooking = (booking: Row) => OVERVIEW_ACTIVE_BOOKING_STATUSES.includes(String(booking.booking_status ?? "").toLowerCase());
const overviewBookingType = (booking: Row) => String(booking.booking_type ?? (String(booking.booking_status ?? "").toLowerCase() === "corporate" ? "corporate" : "standard")).toLowerCase();
const overviewStatusLabel = (status: string) => status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const confirmedStay = (booking: Row) => ["confirmed", "corporate", "checked_in"].includes(String(booking.booking_status ?? "").toLowerCase());
const formatSyncTime = (value: unknown) => {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? "Never" : formatMelbourneCompactDateTime(date);
};

function startOfMonthIso(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function endOfMonthIso(value: string) {
  const [year, month] = value.slice(0, 7).split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function overviewRange(period: OverviewPeriod, customStart: string, customEnd: string): OverviewRange {
  const today = todayIso();
  if (period === "today") return { start: today, end: today };
  if (period === "week") {
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    const start = addDays(today, weekday === 0 ? -6 : 1 - weekday);
    return { start, end: addDays(start, 6) };
  }
  if (period === "year") return { start: `${today.slice(0, 4)}-01-01`, end: `${today.slice(0, 4)}-12-31` };
  if (period === "custom") {
    const start = customStart || startOfMonthIso(today);
    const end = customEnd || today;
    return start <= end ? { start, end } : { start: end, end: start };
  }
  return { start: startOfMonthIso(today), end: endOfMonthIso(today) };
}

function overviewRangeLabel(range: OverviewRange) {
  return range.start === range.end ? formatDateAu(range.start) : `${formatDateAu(range.start)} – ${formatDateAu(range.end)}`;
}

function createOverviewBuckets(range: OverviewRange) {
  const days = nightsBetween(range.start, addDays(range.end, 1));
  if (days <= 31) {
    return Array.from({ length: days }, (_, index) => {
      const date = addDays(range.start, index);
      return { start: date, end: date, label: new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)) };
    });
  }
  const buckets: Array<{ start: string; end: string; label: string }> = [];
  let cursor = startOfMonthIso(range.start);
  while (cursor <= range.end) {
    const monthEnd = endOfMonthIso(cursor);
    const start = cursor < range.start ? range.start : cursor;
    const end = monthEnd > range.end ? range.end : monthEnd;
    buckets.push({ start, end, label: new Intl.DateTimeFormat("en-AU", { month: "short", year: range.start.slice(0, 4) === range.end.slice(0, 4) ? undefined : "numeric", timeZone: "UTC" }).format(new Date(`${cursor}T00:00:00Z`)) });
    cursor = addDays(monthEnd, 1);
  }
  return buckets;
}

export function Overview({ properties, enquiries, bookings, calendarEvents, calendarConnections, onNavigate }: { properties: Row[]; enquiries: Row[]; bookings: Row[]; calendarEvents: Row[]; calendarConnections: Row[]; onNavigate: (tab: Tab) => void }) {
  const today = todayIso();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const [period, setPeriod] = useState<OverviewPeriod>("month");
  const [customStart, setCustomStart] = useState(startOfMonthIso(today));
  const [customEnd, setCustomEnd] = useState(today);
  const [houseFilter, setHouseFilter] = useState("all");
  const [bookingTypeFilter, setBookingTypeFilter] = useState("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const range = useMemo(() => overviewRange(period, customStart, customEnd), [period, customStart, customEnd]);
  const rangeLabel = overviewRangeLabel(range);
  const activeProperties = useMemo(() => properties.filter((property) => property.published === true), [properties]);
  const propertyNames = useMemo(() => new Map(properties.map((property) => [String(property.id), String(property.name || "Serenity house")])), [properties]);
  const filteredBookings = useMemo(() => bookings.filter((booking) => dateInOverviewRange(booking.check_in, range)
    && (houseFilter === "all" || String(booking.property_id) === houseFilter)
    && (bookingTypeFilter === "all" || overviewBookingType(booking) === bookingTypeFilter)
    && (bookingStatusFilter === "all" || String(booking.booking_status ?? "") === bookingStatusFilter)), [bookings, range, houseFilter, bookingTypeFilter, bookingStatusFilter]);
  const activeFilteredBookings = useMemo(() => filteredBookings.filter(isOverviewActiveBooking), [filteredBookings]);
  const upcomingArrivals = useMemo(() => activeFilteredBookings.filter((booking) => dateOnly(booking.check_in) >= today).sort((a, b) => dateOnly(a.check_in).localeCompare(dateOnly(b.check_in))), [activeFilteredBookings, today]);
  const imports = useMemo(() => calendarConnections.filter((connection) => connection.connection_type === "import" && connection.is_enabled === true && (houseFilter === "all" || String(connection.property_id) === houseFilter)), [calendarConnections, houseFilter]);
  const calendarWarnings = useMemo(() => imports.filter((connection) => Boolean(connection.last_error) || ["error", "conflict"].includes(String(connection.sync_status ?? "")) || (now !== null && (!connection.last_success_at || now - new Date(connection.last_success_at).getTime() > 45 * 60_000))), [imports, now]);
  const currentBookings = useMemo(() => bookings.filter(isOverviewActiveBooking).filter((booking) => rangesOverlap(dateOnly(booking.check_in), dateOnly(booking.checkout), today, addDays(today, 1))), [bookings, today]);
  const currentOccupiedIds = new Set(currentBookings.filter(confirmedStay).map((booking) => String(booking.property_id)));
  const currentHeldIds = new Set(currentBookings.filter((booking) => !confirmedStay(booking)).map((booking) => String(booking.property_id)));
  const currentBlockedIds = useMemo(() => new Set(calendarEvents.filter((event) => event.status === "active" && event.is_blocking !== false && rangesOverlap(dateOnly(event.start_date), dateOnly(event.end_date), today, addDays(today, 1))).map((event) => String(event.property_id))), [calendarEvents, today]);
  const selectedActiveProperties = activeProperties.filter((property) => houseFilter === "all" || String(property.id) === houseFilter);
  const currentOccupiedCount = selectedActiveProperties.filter((property) => currentOccupiedIds.has(String(property.id))).length;
  const currentHeldCount = selectedActiveProperties.filter((property) => !currentOccupiedIds.has(String(property.id)) && currentHeldIds.has(String(property.id))).length;
  const currentBlockedCount = selectedActiveProperties.filter((property) => !currentOccupiedIds.has(String(property.id)) && !currentHeldIds.has(String(property.id)) && currentBlockedIds.has(String(property.id))).length;
  const availableHouseCount = selectedActiveProperties.length - currentOccupiedCount - currentHeldCount - currentBlockedCount;
  const paidRevenue = filteredBookings.filter((booking) => String(booking.payment_status ?? "").toLowerCase() === "paid" && !["cancelled", "expired"].includes(String(booking.booking_status ?? "").toLowerCase())).reduce((sum, booking) => sum + Number(booking.total ?? 0), 0);
  const pendingPaymentBookings = bookings.filter((booking) => (houseFilter === "all" || String(booking.property_id) === houseFilter) && String(booking.booking_status ?? "").toLowerCase() === "pending_payment" && ["pending", "failed"].includes(String(booking.payment_status ?? "").toLowerCase()));
  const pendingPaymentValue = pendingPaymentBookings.reduce((sum, booking) => sum + Number(booking.total ?? 0), 0);
  const pendingBookings = bookings.filter((booking) => (houseFilter === "all" || String(booking.property_id) === houseFilter) && String(booking.booking_status ?? "").toLowerCase() === "pending_payment");
  const pendingEnquiries = enquiries.filter((enquiry) => ["new", "pending_approval"].includes(String(enquiry.status ?? "").toLowerCase()));
  const todayCheckIns = currentBookings.filter(confirmedStay).filter((booking) => dateOnly(booking.check_in) === today && (houseFilter === "all" || String(booking.property_id) === houseFilter));
  const todayCheckouts = bookings.filter(confirmedStay).filter((booking) => dateOnly(booking.checkout) === today && (houseFilter === "all" || String(booking.property_id) === houseFilter));
  const hasActionAlerts = pendingBookings.length > 0 || pendingPaymentBookings.length > 0 || pendingEnquiries.length > 0 || calendarWarnings.length > 0;
  const buckets = useMemo(() => createOverviewBuckets(range), [range]);
  const paidValueSeries: OverviewChartPoint[] = buckets.map((bucket) => ({
    label: bucket.label,
    value: filteredBookings.filter((booking) => dateInOverviewRange(booking.check_in, bucket) && String(booking.payment_status ?? "").toLowerCase() === "paid" && !["cancelled", "expired"].includes(String(booking.booking_status ?? "").toLowerCase()))
      .reduce((sum, booking) => sum + (Number(booking.total) || 0), 0),
  }));
  const resetFilters = () => { setPeriod("month"); setCustomStart(startOfMonthIso(today)); setCustomEnd(today); setHouseFilter("all"); setBookingTypeFilter("all"); setBookingStatusFilter("all"); };
  const availabilityTotal = selectedActiveProperties.length;
  const availabilityShare = (count: number) => availabilityTotal ? (count / availabilityTotal) * 100 : 0;
  const availableEnd = availabilityShare(availableHouseCount);
  const occupiedEnd = availableEnd + availabilityShare(currentOccupiedCount);
  const heldEnd = occupiedEnd + availabilityShare(currentHeldCount);
  const availabilityBackground = availabilityTotal
    ? `conic-gradient(var(--admin-accent) 0 ${availableEnd}%, #eba55f ${availableEnd}% ${occupiedEnd}%, #83b9ef ${occupiedEnd}% ${heldEnd}%, #cbd3e1 ${heldEnd}% 100%)`
    : "conic-gradient(#e8edf0 0 100%)";

  return <>
    <PageHeader eyebrow="Workspace" title="Dashboard" description={`Your Serenity stays at a glance · ${formatOverviewDate(today)} in Melbourne`} action={<button type="button" className="admin-button admin-button-primary inline-flex items-center gap-2" onClick={() => onNavigate("houses")}><Building2 size={16} /> Manage houses</button>} />
    <div className="admin-overview-workspace">
      <section className="admin-overview-kpi-strip" aria-label="Key figures">
        <Metric icon={<Wallet size={18} />} label="Paid booking value" value={formatAud(paidRevenue)} detail="Arrivals in selected period" onClick={() => onNavigate("payments")} />
        <Metric icon={<CalendarDays size={18} />} label="Upcoming arrivals" value={upcomingArrivals.length} detail="Active bookings in period" onClick={() => onNavigate("bookings")} />
        <Metric icon={<House size={18} />} label="Available today" value={availableHouseCount} detail={`${availabilityTotal} published houses`} onClick={() => onNavigate("calendar")} />
        <Metric icon={<Inbox size={18} />} label="Open requests" value={pendingBookings.length + pendingEnquiries.length} detail="Bookings and enquiries" onClick={() => onNavigate(pendingBookings.length > 0 ? "bookings" : "enquiries")} />
      </section>
      <OverviewChartCard title="Booking performance" description={`Paid booking value by arrival date · ${rangeLabel}`} points={paidValueSeries} emptyLabel="No paid bookings in this range." kind="line" valueFormatter={formatAud} onOpen={() => onNavigate("payments")} headerAction={<div className="admin-overview-chart-controls"><label><span className="sr-only">Period</span><select className="admin-field" value={period} onChange={(event) => setPeriod(event.target.value as OverviewPeriod)}><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Custom</option></select></label><label><span className="sr-only">House</span><select className="admin-field" value={houseFilter} onChange={(event) => setHouseFilter(event.target.value)}><option value="all">All houses</option>{properties.map((property) => <option key={String(property.id)} value={String(property.id)}>{String(property.name)}</option>)}</select></label></div>} />
      <details className="admin-overview-more-filters"><summary><Filter size={15} aria-hidden="true" /> More filters <span>{bookingTypeFilter !== "all" || bookingStatusFilter !== "all" || period === "custom" ? "Applied" : "Optional"}</span></summary><div className="admin-overview-filter-grid">
        {period === "custom" && <><label>From<input className="admin-field mt-1" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label><label>To<input className="admin-field mt-1" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label></>}
        <label>Booking type<select className="admin-field mt-1" value={bookingTypeFilter} onChange={(event) => setBookingTypeFilter(event.target.value)}><option value="all">All booking types</option><option value="standard">Standard</option><option value="corporate">Corporate</option><option value="admin">Admin</option></select></label>
        <label>Booking status<select className="admin-field mt-1" value={bookingStatusFilter} onChange={(event) => setBookingStatusFilter(event.target.value)}><option value="all">All booking statuses</option>{OVERVIEW_BOOKING_STATUSES.map((status) => <option key={status} value={status}>{overviewStatusLabel(status)}</option>)}</select></label>
      </div><button type="button" className="admin-overview-reset" onClick={resetFilters}>Reset all filters</button></details>
      <div className="admin-overview-insights-grid">
        <section className="admin-overview-arrivals"><OverviewBookingTable title="Upcoming arrivals" items={upcomingArrivals} dateField="check_in" emptyLabel="No upcoming bookings in this range." propertyNames={propertyNames} onOpen={() => onNavigate("bookings")} /></section>
        <section className="admin-overview-panel admin-overview-availability"><div className="admin-overview-panel-heading"><div><h3>House availability</h3><p>Live status of published houses today</p></div><button type="button" className="admin-overview-text-action" onClick={() => onNavigate("calendar")}>Calendar <ArrowUpRight size={14} aria-hidden="true" /></button></div><div className="admin-overview-donut-layout"><div className="admin-overview-donut" role="img" aria-label={`${availableHouseCount} available, ${currentOccupiedCount} occupied, ${currentHeldCount} held, ${currentBlockedCount} blocked`} style={{ background: availabilityBackground }}><div><strong>{availabilityTotal}</strong><span>houses</span></div></div><div className="admin-overview-donut-legend"><span><i className="is-available" />Available <strong>{availableHouseCount}</strong></span><span><i className="is-occupied" />Occupied <strong>{currentOccupiedCount}</strong></span><span><i className="is-held" />Payment hold <strong>{currentHeldCount}</strong></span><span><i className="is-blocked" />Externally blocked <strong>{currentBlockedCount}</strong></span></div></div></section>
      </div>

    <section className="admin-overview-section admin-overview-operations" aria-label="Today's operations">
      <OverviewSectionHeading eyebrow="Live operations" title="Today at your houses" description={`${todayCheckIns.length} check-in${todayCheckIns.length === 1 ? "" : "s"} · ${todayCheckouts.length} check-out${todayCheckouts.length === 1 ? "" : "s"} · Melbourne time`} actionLabel="Open calendar" onAction={() => onNavigate("calendar")} />
      <div className="admin-overview-operations-grid">
        <div className="admin-overview-panel"><div className="admin-overview-panel-heading"><div><h3>House status</h3><p>Current stays and imported blocks are shown separately.</p></div><span className="admin-overview-panel-count">{selectedActiveProperties.length} published</span></div>
          <div className="admin-overview-house-list">{selectedActiveProperties.length ? selectedActiveProperties.map((property) => {
            const id = String(property.id);
            const status = currentOccupiedIds.has(id) ? "Occupied" : currentHeldIds.has(id) ? "Payment hold" : currentBlockedIds.has(id) ? "Blocked externally" : "Available";
            const next = bookings.filter(isOverviewActiveBooking).filter((booking) => String(booking.property_id) === id && dateOnly(booking.check_in) > today).sort((a, b) => dateOnly(a.check_in).localeCompare(dateOnly(b.check_in)))[0];
            return <button className="admin-overview-house-row" type="button" key={id} onClick={() => onNavigate(status === "Blocked externally" ? "calendar" : "bookings")}><span><strong>{String(property.name || "Serenity house")}</strong><small>{next ? `Next arrival ${formatOverviewDate(next.check_in)}` : "No upcoming direct booking"}</small></span><span className={`admin-overview-state admin-overview-state-${status === "Available" ? "good" : status === "Occupied" ? "info" : "warning"}`}>{status}</span></button>;
          }) : <p className="admin-overview-muted">No published houses match this filter.</p>}</div>
        </div>
        <div className="admin-overview-panel"><div className="admin-overview-panel-heading"><div><h3>Calendar connections</h3><p>Last successful Airbnb or partner import for each house.</p></div><RefreshCw size={17} aria-hidden="true" /></div>
          <div className="admin-overview-house-list">{imports.length ? imports.map((connection) => {
            const stale = now !== null && (!connection.last_success_at || now - new Date(connection.last_success_at).getTime() > 45 * 60_000);
            const warning = Boolean(connection.last_error) || ["error", "conflict"].includes(String(connection.sync_status ?? "")) || stale;
            return <button className="admin-overview-house-row" type="button" key={String(connection.id)} onClick={() => onNavigate("calendar")}><span><strong>{propertyNames.get(String(connection.property_id)) ?? "Serenity house"} · {overviewStatusLabel(String(connection.platform ?? "calendar"))}</strong><small>Last success: {formatSyncTime(connection.last_success_at)}{warning && connection.last_attempt_at ? ` · Last attempt: ${formatSyncTime(connection.last_attempt_at)}` : ""}</small></span><span className={`admin-overview-state admin-overview-state-${warning ? "warning" : "good"}`}>{warning ? "Check sync" : "Connected"}</span></button>;
          }) : <p className="admin-overview-muted">No active calendar imports are configured.</p>}</div>
          <p className="admin-overview-panel-note"><CalendarClock size={15} aria-hidden="true" /> Imports normally run every 15 minutes. “Last success” is not the same as the last scheduled attempt.</p>
        </div>
      </div>
    </section>

    <section className="admin-overview-section admin-overview-attention"><OverviewSectionHeading eyebrow="Action required" title={hasActionAlerts ? "Needs attention" : "All clear"} description="Open requests and calendar warnings, across all dates." actionLabel="View calendar" onAction={() => onNavigate("calendar")} /><div className="admin-overview-panel">{hasActionAlerts ? <div className="admin-overview-record-list">
      {pendingBookings.length > 0 && <button type="button" onClick={() => onNavigate("bookings")}><span className="admin-overview-record-main"><strong>{pendingBookings.length} pending booking{pendingBookings.length === 1 ? "" : "s"}</strong><span>Review dates, guest details, and confirmation status.</span></span><StatusBadge tone="warning" label="View bookings" /></button>}
      {pendingPaymentBookings.length > 0 && <button type="button" onClick={() => onNavigate("bookings")}><span className="admin-overview-record-main"><strong>{pendingPaymentBookings.length} pending payment{pendingPaymentBookings.length === 1 ? "" : "s"}</strong><span>{formatAud(pendingPaymentValue)} is awaiting payment.</span></span><StatusBadge tone="warning" label="View payments" /></button>}
       {pendingEnquiries.length > 0 && <button type="button" onClick={() => onNavigate("enquiries")}><span className="admin-overview-record-main"><strong>{pendingEnquiries.length === 1 ? "1 enquiry waiting" : `${pendingEnquiries.length} enquiries waiting`}</strong><span>New or pending corporate requests need a response.</span></span><StatusBadge tone="info" label="View enquiries" /></button>}
      {calendarWarnings.length > 0 && <button type="button" onClick={() => onNavigate("calendar")}><span className="admin-overview-record-main"><strong>{calendarWarnings.length} calendar warning{calendarWarnings.length === 1 ? "" : "s"}</strong><span>Sync errors or conflicts may affect availability.</span></span><StatusBadge tone="danger" label="View calendar" /></button>}
    </div> : <OverviewEmptyState title="No action required" description="There are no pending requests or calendar warnings in the current view." onOpen={() => onNavigate("calendar")} actionLabel="View calendar" />}</div></section>
    </div>
  </>;
}

function formatOverviewDate(value: unknown) {
  const date = dateOnly(value);
  return date ? formatDateAu(date) : "Date not supplied";
}

function OverviewSectionHeading({ eyebrow, title, description, actionLabel, onAction }: { eyebrow: string; title: string; description: string; actionLabel: string; onAction: () => void }) {
  return <div className="admin-overview-section-heading"><div><p className="admin-section-kicker">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div><button type="button" className="admin-button min-h-9 shrink-0 px-3 text-sm" onClick={onAction}>{actionLabel}<ArrowUpRight size={15} aria-hidden="true" /></button></div>;
}

function OverviewChartCard({ title, description, points, emptyLabel, kind, valueFormatter = (value: number) => String(value), onOpen, headerAction }: { title: string; description: string; points: OverviewChartPoint[]; emptyLabel: string; kind: "bar" | "line"; valueFormatter?: (value: number) => string; onOpen: () => void; headerAction?: ReactNode }) {
  const { visible: visiblePoints, pagination } = useAdminPagination(points);
  const max = Math.max(...points.map((point) => point.value), 0);
  const hasData = points.some((point) => point.value > 0);
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const linePoints = points.map((point, index) => ({
    x: 16 + (points.length === 1 ? 0.5 : index / (points.length - 1)) * 608,
    y: 170 - (point.value / (max || 1)) * 140,
  }));
  const linePath = linePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = linePoints.length ? `${linePath} L ${linePoints[linePoints.length - 1].x} 170 L ${linePoints[0].x} 170 Z` : "";
  const chartLabel = `${title}: ${points.map((point) => `${point.label} ${valueFormatter(point.value)}`).join(", ")}`;
  return <section className={`admin-overview-panel admin-overview-chart-card admin-overview-chart-${kind}`}>
    <div className="admin-overview-panel-heading"><div><p className="admin-section-kicker">{kind === "line" ? "Performance trend" : "Arrival trend"}</p><h3>{title}</h3><p>{description}</p></div><div className="admin-overview-chart-heading-side"><span className="admin-overview-chart-total">{valueFormatter(total)}<small>in range</small></span>{headerAction}</div></div>
    {kind === "bar" ? <div className="admin-overview-bars" role="img" aria-label={chartLabel}>{points.map((point, index) => <div className="admin-overview-bar-item" key={`${point.label}-${index}`} title={`${point.label}: ${valueFormatter(point.value)}`}><div className="admin-overview-bar-track"><span className="admin-overview-bar-fill" style={{ height: `${point.value ? Math.max(6, (point.value / max) * 100) : 0}%` }} /></div><strong>{point.label}</strong></div>)}</div> : <div className="admin-overview-line-chart" role="img" aria-label={chartLabel}>
        <div className="admin-overview-line-scale"><span>{valueFormatter(max)}</span><span>0</span></div>
        <svg viewBox="0 0 640 190" preserveAspectRatio="none" aria-hidden="true"><line className="admin-overview-line-grid" x1="16" x2="624" y1="30" y2="30" /><line className="admin-overview-line-grid" x1="16" x2="624" y1="100" y2="100" /><line className="admin-overview-line-grid" x1="16" x2="624" y1="170" y2="170" /><path className="admin-overview-line-area" d={areaPath} /><path className="admin-overview-line-path" d={linePath} />{linePoints.map((point, index) => <circle className="admin-overview-line-point" key={`${points[index].label}-${index}`} cx={point.x} cy={point.y} r="4" />)}</svg>
        <div className="admin-overview-line-labels"><span>{points[0]?.label}</span>{points.length > 2 && <span>{points[Math.floor((points.length - 1) / 2)]?.label}</span>}{points.length > 1 && <span>{points[points.length - 1]?.label}</span>}</div>
      </div>}
    {!hasData && <p className="admin-overview-chart-empty">{emptyLabel} The graph still shows the selected period.</p>}
    <div className="admin-overview-chart-footer"><details className="admin-overview-data-details"><summary>Exact values</summary><div className="admin-table-shell"><table className="admin-overview-data-table"><thead><tr><th>Period</th><th>Value</th></tr></thead><tbody>{visiblePoints.map((point, index) => <tr key={`table-${point.label}-${index}`}><td>{point.label}</td><td>{valueFormatter(point.value)}</td></tr>)}</tbody></table></div>{pagination}</details><button type="button" className="admin-overview-text-action" onClick={onOpen}>Open records <ArrowUpRight size={14} aria-hidden="true" /></button></div>
  </section>;
}

function OverviewBookingTable({ title, items, dateField, emptyLabel, propertyNames, onOpen }: { title: string; items: Row[]; dateField: "check_in" | "checkout"; emptyLabel: string; propertyNames: Map<string, string>; onOpen: () => void }) {
  const { visible, pagination } = useAdminPagination(items);
  return <section className="admin-overview-panel"><div className="admin-overview-panel-heading"><div><p className="admin-section-kicker">Live records</p><h3>{title}</h3></div><button type="button" className="admin-overview-text-action" onClick={onOpen}>Open bookings</button></div>{items.length ? <div className="admin-overview-record-list">{visible.map((booking) => <button type="button" key={String(booking.id)} onClick={onOpen}><span className="admin-overview-record-main"><strong>{String(booking.reference || "Booking")}</strong><span>{propertyNames.get(String(booking.property_id)) ?? "Serenity house"}</span></span><span className="admin-overview-record-side"><span>{formatOverviewDate(booking[dateField])}</span><small>{overviewStatusLabel(overviewBookingType(booking))}</small></span></button>)}</div> : <OverviewEmptyState title={emptyLabel} description="No active booking records match the selected range." onOpen={onOpen} actionLabel="Open bookings" />}{pagination}</section>;
}

function OverviewEmptyState({ title, description, onOpen, actionLabel }: { title: string; description: string; onOpen: () => void; actionLabel: string }) {
  return <div className="admin-overview-empty"><p>{title}</p><span>{description}</span><button type="button" className="admin-overview-text-action" onClick={onOpen}>{actionLabel}</button></div>;
}

function Metric({ icon, label, value, detail, onClick }: { icon: ReactNode; label: string; value: number | string; detail: string; onClick?: () => void }) {
  const content = <><div className="admin-metric-label"><span className="admin-metric-icon" aria-hidden="true">{icon}</span><p>{label}</p></div><p className="admin-metric-value">{value}</p><p className="admin-metric-detail">{detail}</p></>;
  return onClick ? <button type="button" className="admin-card admin-metric admin-metric-button bg-[var(--admin-surface)] p-4 text-left" onClick={onClick} aria-label={`${label}: ${value}. ${detail}`}>{content}</button> : <div className="admin-card admin-metric bg-[var(--admin-surface)] p-4">{content}</div>;
}
