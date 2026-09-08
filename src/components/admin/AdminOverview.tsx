"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AdminTab as Tab } from "@/src/components/SupabaseAdminDashboardV2";
import { addDays, formatAud, formatDateAu, nightsBetween, todayIso } from "@/src/lib/booking";
import { Building2, Filter, Home } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminBadge as StatusBadge } from "./AdminUI";
import { PageHeader } from "./AdminFields";
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
  const filteredEnquiries = useMemo(() => enquiries.filter((enquiry) => dateInOverviewRange(enquiry.created_at ?? enquiry.arrival, range)), [enquiries, range]);
  const activeFilteredBookings = useMemo(() => filteredBookings.filter(isOverviewActiveBooking), [filteredBookings]);
  const upcomingArrivals = useMemo(() => activeFilteredBookings.filter((booking) => dateOnly(booking.check_in) >= today).sort((a, b) => dateOnly(a.check_in).localeCompare(dateOnly(b.check_in))), [activeFilteredBookings, today]);
  const upcomingBlocks = useMemo(() => calendarEvents.filter((event) => event.status === "active" && event.is_blocking !== false && dateOnly(event.end_date) > today && dateOnly(event.start_date) <= range.end).sort((a, b) => dateOnly(a.start_date).localeCompare(dateOnly(b.start_date))), [calendarEvents, today, range.end]);
  const calendarWarnings = useMemo(() => calendarConnections.filter((connection) => Boolean(connection.last_error) || ["error", "conflict"].includes(String(connection.sync_status ?? ""))), [calendarConnections]);
  const currentOccupiedIds = useMemo(() => new Set(bookings.filter(isOverviewActiveBooking).filter((booking) => rangesOverlap(dateOnly(booking.check_in), dateOnly(booking.checkout), today, addDays(today, 1))).map((booking) => String(booking.property_id))), [bookings, today]);
  const currentBlockedIds = useMemo(() => new Set(upcomingBlocks.filter((event) => rangesOverlap(dateOnly(event.start_date), dateOnly(event.end_date), today, addDays(today, 1))).map((event) => String(event.property_id))), [upcomingBlocks, today]);
  const selectedActiveProperties = activeProperties.filter((property) => houseFilter === "all" || String(property.id) === houseFilter);
  const currentOccupiedCount = selectedActiveProperties.filter((property) => currentOccupiedIds.has(String(property.id))).length;
  const currentBlockedCount = selectedActiveProperties.filter((property) => currentBlockedIds.has(String(property.id))).length;
  const availableHouseCount = selectedActiveProperties.filter((property) => !currentOccupiedIds.has(String(property.id)) && !currentBlockedIds.has(String(property.id))).length;
  const paidRevenue = filteredBookings.filter((booking) => String(booking.payment_status ?? "").toLowerCase() === "paid").reduce((sum, booking) => sum + Number(booking.total ?? 0), 0);
  const pendingPaymentBookings = filteredBookings.filter((booking) => String(booking.payment_status ?? "").toLowerCase() === "pending");
  const pendingPaymentValue = pendingPaymentBookings.reduce((sum, booking) => sum + Number(booking.total ?? 0), 0);
  const pendingBookings = filteredBookings.filter((booking) => String(booking.booking_status ?? "").toLowerCase() === "pending_payment");
  const pendingEnquiries = filteredEnquiries.filter((enquiry) => ["new", "pending_approval"].includes(String(enquiry.status ?? "").toLowerCase()));
  const todayCheckIns = activeFilteredBookings.filter((booking) => dateOnly(booking.check_in) === today);
  const todayCheckouts = activeFilteredBookings.filter((booking) => dateOnly(booking.checkout) === today);
  const hasActionAlerts = pendingBookings.length > 0 || pendingPaymentBookings.length > 0 || pendingEnquiries.length > 0 || calendarWarnings.length > 0;
  const buckets = useMemo(() => createOverviewBuckets(range), [range]);
  const bookingSeries: OverviewChartPoint[] = buckets.map((bucket) => ({ label: bucket.label, value: filteredBookings.filter((booking) => dateInOverviewRange(booking.check_in, bucket)).length }));
  const resetFilters = () => { setPeriod("month"); setCustomStart(startOfMonthIso(today)); setCustomEnd(today); setHouseFilter("all"); setBookingTypeFilter("all"); setBookingStatusFilter("all"); };

  return <>
    <PageHeader eyebrow="Dashboard" title="Dashboard" description="The essential booking, payment, and availability information for today." action={<button type="button" className="admin-button admin-button-primary inline-flex items-center gap-2" onClick={() => onNavigate("houses")}><Building2 size={16} /> Manage houses</button>} />
    <section className="admin-overview-filters admin-card" aria-label="Overview filters">
      <div className="admin-overview-filter-heading"><div><p className="admin-section-kicker">Filters</p><h2>Refine the overview</h2><p>Stay dates use Melbourne time. Revenue is shown in AUD.</p></div><Filter size={18} aria-hidden="true" /></div>
      <div className="admin-overview-filter-grid">
        <label>Stay date range<select className="admin-field mt-1" value={period} onChange={(event) => setPeriod(event.target.value as OverviewPeriod)}><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Custom date range</option></select></label>
        {period === "custom" && <><label>From<input className="admin-field mt-1" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label><label>To<input className="admin-field mt-1" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label></>}
        <label>House<select className="admin-field mt-1" value={houseFilter} onChange={(event) => setHouseFilter(event.target.value)}><option value="all">All houses</option>{properties.map((property) => <option key={String(property.id)} value={String(property.id)}>{String(property.name)}</option>)}</select></label>
        <label>Booking type<select className="admin-field mt-1" value={bookingTypeFilter} onChange={(event) => setBookingTypeFilter(event.target.value)}><option value="all">All booking types</option><option value="standard">Standard</option><option value="corporate">Corporate</option><option value="admin">Admin</option></select></label>
        <label>Booking status<select className="admin-field mt-1" value={bookingStatusFilter} onChange={(event) => setBookingStatusFilter(event.target.value)}><option value="all">All booking statuses</option>{OVERVIEW_BOOKING_STATUSES.map((status) => <option key={status} value={status}>{overviewStatusLabel(status)}</option>)}</select></label>
      </div>
      <div className="admin-overview-filter-footer"><p>Showing stay dates from <strong>{rangeLabel}</strong>.</p><button type="button" className="admin-button min-h-9 px-3 text-sm" onClick={resetFilters}>Reset filters</button></div>
    </section>

    <section className="admin-overview-summary mt-5">
      <OverviewSectionHeading eyebrow="At a glance" title="What needs your attention" description={`Live booking and availability information for ${rangeLabel}.`} actionLabel="View all bookings" onAction={() => onNavigate("bookings")} />
      <div className="admin-overview-metrics grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Upcoming bookings" value={upcomingArrivals.length} detail={`Next arrivals · ${rangeLabel}`} onClick={() => onNavigate("bookings")} />
        <Metric label="Pending requests" value={pendingBookings.length + pendingEnquiries.length} detail={`${pendingBookings.length} booking${pendingBookings.length === 1 ? "" : "s"} · ${pendingEnquiries.length} enquir${pendingEnquiries.length === 1 ? "y" : "ies"}`} onClick={() => onNavigate(pendingBookings.length > 0 ? "bookings" : "enquiries")} />
        <Metric label="Today’s check-ins" value={todayCheckIns.length} detail="Active arrivals today" onClick={() => onNavigate("bookings")} />
        <Metric label="Today’s check-outs" value={todayCheckouts.length} detail="Departures today" onClick={() => onNavigate("bookings")} />
        <Metric label="Available houses" value={availableHouseCount} detail={`${currentOccupiedCount} occupied · ${currentBlockedCount} blocked today · ${upcomingBlocks.length} upcoming blocks`} onClick={() => onNavigate("calendar")} />
        <Metric label="Revenue collected" value={formatAud(paidRevenue)} detail={`${pendingPaymentBookings.length} pending payment${pendingPaymentBookings.length === 1 ? "" : "s"} · ${formatAud(pendingPaymentValue)}`} onClick={() => onNavigate("bookings")} />
      </div>
    </section>

    <section className="admin-overview-section"><OverviewSectionHeading eyebrow="Booking activity" title="Upcoming booking activity" description="A short view of live arrivals in the selected stay-date range." actionLabel="View all bookings" onAction={() => onNavigate("bookings")} /><div className="admin-overview-chart-grid"><OverviewChartCard title="Bookings over time" description="Bookings grouped by check-in date." points={bookingSeries} emptyLabel="No bookings in this range." onOpen={() => onNavigate("bookings")} /></div><div className="admin-overview-table-grid mt-4"><OverviewBookingTable title="Upcoming bookings" items={upcomingArrivals.slice(0, 6)} dateField="check_in" emptyLabel="No upcoming bookings in this range." propertyNames={propertyNames} onOpen={() => onNavigate("bookings")} /></div></section>

    <section className="admin-overview-section"><OverviewSectionHeading eyebrow="Action required" title={hasActionAlerts ? "Review these items" : "Nothing needs your attention"} description="Pending requests, payment issues, and calendar warnings appear here when they need action." actionLabel="View calendar alerts" onAction={() => onNavigate("calendar")} /><div className="admin-overview-panel">{hasActionAlerts ? <div className="admin-overview-record-list">
      {pendingBookings.length > 0 && <button type="button" onClick={() => onNavigate("bookings")}><span className="admin-overview-record-main"><strong>{pendingBookings.length} pending booking{pendingBookings.length === 1 ? "" : "s"}</strong><span>Review dates, guest details, and confirmation status.</span></span><StatusBadge tone="warning" label="View bookings" /></button>}
      {pendingPaymentBookings.length > 0 && <button type="button" onClick={() => onNavigate("bookings")}><span className="admin-overview-record-main"><strong>{pendingPaymentBookings.length} pending payment{pendingPaymentBookings.length === 1 ? "" : "s"}</strong><span>{formatAud(pendingPaymentValue)} is awaiting payment.</span></span><StatusBadge tone="warning" label="View payments" /></button>}
       {pendingEnquiries.length > 0 && <button type="button" onClick={() => onNavigate("enquiries")}><span className="admin-overview-record-main"><strong>{pendingEnquiries.length === 1 ? "1 enquiry waiting" : `${pendingEnquiries.length} enquiries waiting`}</strong><span>New or pending corporate requests need a response.</span></span><StatusBadge tone="info" label="View enquiries" /></button>}
      {calendarWarnings.length > 0 && <button type="button" onClick={() => onNavigate("calendar")}><span className="admin-overview-record-main"><strong>{calendarWarnings.length} calendar warning{calendarWarnings.length === 1 ? "" : "s"}</strong><span>Sync errors or conflicts may affect availability.</span></span><StatusBadge tone="danger" label="View calendar" /></button>}
    </div> : <OverviewEmptyState title="No action required" description="There are no pending requests or calendar warnings in the current view." onOpen={() => onNavigate("calendar")} actionLabel="View calendar" />}</div></section>
  </>;
}

function formatOverviewDate(value: unknown) {
  const date = dateOnly(value);
  return date ? formatDateAu(date) : "Date not supplied";
}

function OverviewSectionHeading({ eyebrow, title, description, actionLabel, onAction }: { eyebrow: string; title: string; description: string; actionLabel: string; onAction: () => void }) {
  return <div className="admin-overview-section-heading"><div><p className="admin-section-kicker">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div><button type="button" className="admin-button min-h-9 shrink-0 px-3 text-sm" onClick={onAction}>{actionLabel}</button></div>;
}

function OverviewChartCard({ title, description, points, emptyLabel, valueFormatter = (value: number) => String(value), onOpen }: { title: string; description: string; points: OverviewChartPoint[]; emptyLabel: string; valueFormatter?: (value: number) => string; onOpen: () => void }) {
  const max = Math.max(...points.map((point) => point.value), 0);
  const hasData = points.some((point) => point.value > 0);
  return <section className="admin-overview-panel admin-overview-chart-card"><div className="admin-overview-panel-heading"><div><p className="admin-section-kicker">Data visualisation</p><h3>{title}</h3><p>{description}</p></div><button type="button" className="admin-overview-text-action" onClick={onOpen}>Open records</button></div>{hasData ? <><div className="admin-overview-bars" role="img" aria-label={`${title}: ${points.filter((point) => point.value > 0).map((point) => `${point.label} ${valueFormatter(point.value)}`).join(", ")}`}><div className="admin-overview-bar-grid" aria-hidden="true"><span /><span /><span /><span /></div>{points.map((point) => <div className="admin-overview-bar-item" key={point.label}><div className="admin-overview-bar-track"><span className="admin-overview-bar-fill" style={{ height: `${Math.max(5, (point.value / max) * 100)}%` }} /></div><strong>{point.label}</strong><small>{valueFormatter(point.value)}</small></div>)}</div><details className="admin-overview-data-details"><summary>View data table</summary><table className="admin-overview-data-table"><thead><tr><th>Period</th><th>Value</th></tr></thead><tbody>{points.map((point) => <tr key={`table-${point.label}`}><td>{point.label}</td><td>{valueFormatter(point.value)}</td></tr>)}</tbody></table></details></> : <OverviewEmptyState title={emptyLabel} description="Adjust the date or booking filters to see live records." onOpen={onOpen} actionLabel="Open records" />}</section>;
}

function OverviewBookingTable({ title, items, dateField, emptyLabel, propertyNames, onOpen }: { title: string; items: Row[]; dateField: "check_in" | "checkout"; emptyLabel: string; propertyNames: Map<string, string>; onOpen: () => void }) {
  return <section className="admin-overview-panel"><div className="admin-overview-panel-heading"><div><p className="admin-section-kicker">Live records</p><h3>{title}</h3></div><button type="button" className="admin-overview-text-action" onClick={onOpen}>Open bookings</button></div>{items.length ? <div className="admin-overview-record-list">{items.map((booking) => <button type="button" key={String(booking.id)} onClick={onOpen}><span className="admin-overview-record-main"><strong>{String(booking.reference || "Booking")}</strong><span>{propertyNames.get(String(booking.property_id)) ?? "Serenity house"}</span></span><span className="admin-overview-record-side"><span>{formatOverviewDate(booking[dateField])}</span><small>{overviewStatusLabel(overviewBookingType(booking))}</small></span></button>)}</div> : <OverviewEmptyState title={emptyLabel} description="No active booking records match the selected range." onOpen={onOpen} actionLabel="Open bookings" />}</section>;
}

function OverviewEmptyState({ title, description, onOpen, actionLabel }: { title: string; description: string; onOpen: () => void; actionLabel: string }) {
  return <div className="admin-overview-empty"><p>{title}</p><span>{description}</span><button type="button" className="admin-overview-text-action" onClick={onOpen}>{actionLabel}</button></div>;
}

function Metric({ label, value, detail, onClick }: { icon?: typeof Home; label: string; value: number | string; detail: string; onClick?: () => void }) {
  const content = <><div className="admin-metric-label"><p className="text-sm font-medium text-[var(--admin-muted)]">{label}</p></div><p className="mt-3 text-3xl font-semibold text-[var(--admin-text)]">{value}</p><p className="mt-1 text-sm text-[var(--admin-muted)]">{detail}</p></>;
  return onClick ? <button type="button" className="admin-card admin-metric admin-metric-button bg-[var(--admin-surface)] p-4 text-left" onClick={onClick} aria-label={`${label}: ${value}. ${detail}`}>{content}</button> : <div className="admin-card admin-metric bg-[var(--admin-surface)] p-4">{content}</div>;
}
