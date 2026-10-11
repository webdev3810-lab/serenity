"use client";

import { addDays,formatAud } from "@/src/lib/booking";
import { ArrowDown,ArrowUp,ArrowUpDown,ChevronRight,Search,X } from "lucide-react";
import { useMemo,useState } from "react";

import { AdminBadge,AdminDialog,useAdminPagination } from "@/src/components/admin/AdminUI";
import { statusPresentation } from "@/src/lib/admin-status";
import { CALENDAR_PLATFORM_LABELS,CALENDAR_PLATFORMS,type CalendarPlatform } from "@/src/lib/calendar/types";
type Row = Record<string, unknown>;
type PropertyRow = Row & { id?: string; name?: string; slug?: string };
type ReservationKind = "booking" | "block" | "enquiry";
type BookingCategory = "standard" | "corporate";
type BookingView = "all" | BookingCategory | CalendarPlatform;
type ReservationItem = {
  id: string;
  kind: ReservationKind;
  reference: string;
  propertyIds: string[];
  propertyLabel: string;
  start: string;
  end: string;
  type: string;
  bookingCategory?: BookingCategory;
  source: string;
  status: string;
  payment: string;
  title: string;
  raw: Row;
};

type Props = {
  bookings: Row[];
  enquiries: Row[];
  calendarEvents: Row[];
  calendarConnections: Row[];
  properties: PropertyRow[];
};


const asObject = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
const asStringArray = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
const cleanLabel = (value: string) => value.replaceAll("_", " ");
const formatDate = (value: string) => value ? new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeZone: "Australia/Melbourne" }).format(new Date(`${value}T00:00:00Z`)) : "—";
const formatSheetDate = (value: string) => value ? new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric", timeZone: "Australia/Melbourne" }).format(new Date(`${value}T00:00:00Z`)) : "—";
const isTruthy = (value: unknown) => value === true || String(value ?? "").toLowerCase() === "true";
const getBookingCategory = (booking: Row): BookingCategory => {
  const corporateDetails = asObject(booking.corporate_details);
  const guestDetails = asObject(booking.guest_details);
  const bookingType = String(booking.booking_type ?? "").trim().toLowerCase();
  const bookingStatus = String(booking.booking_status ?? "").trim().toLowerCase();
  return bookingType === "corporate"
    || bookingStatus === "corporate"
    || isTruthy(booking.corporate)
    || isTruthy(corporateDetails.corporate)
    || isTruthy(guestDetails.corporate)
    ? "corporate"
    : "standard";
};


export default function AdminReservationsManager({ bookings, enquiries, calendarEvents, calendarConnections, properties }: Props) {
  const [requestedBookingView, setBookingView] = useState<BookingView>("all");
  const [query, setQuery] = useState("");
  const [propertyId, setPropertyId] = useState("all");
  const [type, setType] = useState("all");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState<ReservationItem | null>(null);
  const connectedPlatforms = CALENDAR_PLATFORMS.filter((platform) => calendarConnections.some((connection) => String(connection.platform).toLowerCase() === platform && connection.connection_type === "import" && isTruthy(connection.is_enabled)));
  const bookingView = CALENDAR_PLATFORMS.some((platform) => platform === requestedBookingView) && !connectedPlatforms.some((platform) => platform === requestedBookingView) ? "all" : requestedBookingView;
  const selectedPlatform = connectedPlatforms.find((platform) => platform === bookingView);

  const propertyMap = useMemo(() => new Map(properties.map((property) => [String(property.id), String(property.name ?? property.slug ?? "House")])), [properties]);
  const items = useMemo<ReservationItem[]>(() => {
    const bookingItems = bookings.map((booking): ReservationItem => {
      const guest = asObject(booking.guest_details);
      const guestName = [guest.companyName, guest.contactName, [guest.firstName, guest.lastName].filter(Boolean).join(" "), guest.email].map((value) => String(value ?? "").trim()).find(Boolean) ?? "Guest booking";
      const property = String(booking.property_id ?? "");
      const category = getBookingCategory(booking);
      return {
        id: String(booking.id), kind: "booking", reference: String(booking.reference ?? ""), propertyIds: [property], propertyLabel: propertyMap.get(property) ?? "House",
        start: String(booking.check_in ?? ""), end: String(booking.checkout ?? ""), type: String(booking.booking_type ?? (category === "corporate" ? "corporate" : "standard")), bookingCategory: category,
        source: String(booking.booking_source ?? "website"), status: String(booking.booking_status ?? "pending_payment"), payment: String(booking.payment_status ?? "pending"),
        title: guestName, raw: booking,
      };
    });
    const blockItems = calendarEvents.filter((event) => event.status === "active").map((event): ReservationItem => {
      const property = String(event.property_id ?? "");
      return {
        id: String(event.id), kind: "block", reference: String(event.external_event_id ?? event.id ?? ""), propertyIds: [property], propertyLabel: propertyMap.get(property) ?? "House",
        start: String(event.start_date ?? ""), end: String(event.end_date ?? ""), type: "blocked dates", source: event.connection_id ? String(event.source_platform ?? "external") : "admin",
        status: String(event.status ?? "active"), payment: "not applicable", title: String(event.summary ?? "Unavailable"), raw: event,
      };
    });
    const enquiryItems = enquiries.map((enquiry): ReservationItem => {
      const ids = asStringArray(enquiry.property_ids);
      return {
        id: String(enquiry.id), kind: "enquiry", reference: String(enquiry.reference ?? enquiry.id ?? ""), propertyIds: ids, propertyLabel: ids.map((id) => propertyMap.get(id) ?? "House").join(", ") || `${enquiry.houses_needed ?? 1} house(s)`,
        start: String(enquiry.arrival ?? ""), end: String(enquiry.departure ?? ""), type: "corporate enquiry", source: String(enquiry.source ?? "corporate_page"), status: String(enquiry.status ?? "new"), payment: "not applicable",
        title: String(enquiry.company_name ?? enquiry.contact_name ?? "Corporate enquiry"), raw: enquiry,
      };
    });
    return [...bookingItems, ...blockItems, ...enquiryItems].sort((a, b) => a.start.localeCompare(b.start) || a.reference.localeCompare(b.reference));
  }, [bookings, enquiries, calendarEvents, propertyMap]);

  const matchesFilters = (item: ReservationItem) => {
    const haystack = `${item.reference} ${item.title} ${item.propertyLabel} ${item.source} ${item.status}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase()))
      && (propertyId === "all" || item.propertyIds.includes(propertyId))
      && (type === "all" || item.type === type)
      && (source === "all" || item.source === source)
      && (status === "all" || item.status === status)
      && (payment === "all" || item.payment === payment)
      && (!fromDate || item.end > fromDate)
      && (!toDate || item.start < addDays(toDate, 1));
  };
  const filteredBeforeBookingView = items.filter(matchesFilters);
  const bookingViewCounts = {
    all: filteredBeforeBookingView.length,
    standard: filteredBeforeBookingView.filter((item) => item.kind === "booking" && item.bookingCategory === "standard").length,
    corporate: filteredBeforeBookingView.filter((item) => item.kind === "booking" && item.bookingCategory === "corporate").length,
    airbnb: filteredBeforeBookingView.filter((item) => item.kind === "block" && item.source.toLowerCase() === "airbnb").length,
    vrbo: filteredBeforeBookingView.filter((item) => item.kind === "block" && item.source.toLowerCase() === "vrbo").length,
    stayz: filteredBeforeBookingView.filter((item) => item.kind === "block" && item.source.toLowerCase() === "stayz").length,
  };
  const filtered = filteredBeforeBookingView.filter((item) => bookingView === "all" || (bookingView === "standard" || bookingView === "corporate" ? item.kind === "booking" && item.bookingCategory === bookingView : item.kind === "block" && item.source.toLowerCase() === bookingView));
  const hasActiveFilters = Boolean(query || propertyId !== "all" || type !== "all" || source !== "all" || status !== "all" || payment !== "all" || fromDate || toDate || bookingView !== "all");

  return <>
    <header className="admin-page-header admin-bookings-header">
      <div><p className="admin-section-kicker">Reservations</p><h2>Bookings &amp; reservations</h2><p>View direct and corporate stays, enquiries, and calendar blocks. Create and manage reservations in Calendar.</p></div>
    </header>

    <section className="admin-filter-panel admin-booking-filters" aria-label="Filter reservations">
      <div className="admin-booking-filters-heading"><div><h3>Find a reservation</h3><p>{filtered.length} matching {filtered.length === 1 ? "record" : "records"}</p></div><button type="button" className="admin-booking-clear" disabled={!hasActiveFilters} onClick={() => { setQuery(""); setPropertyId("all"); setType("all"); setSource("all"); setStatus("all"); setPayment("all"); setFromDate(""); setToDate(""); setBookingView("all"); }}>Clear filters</button></div>
      <div className="admin-booking-filters-grid">
        <label className="admin-booking-filter is-search"><span>Search</span><div className="admin-booking-search"><Search size={17} aria-hidden="true" /><input className="admin-field" aria-label="Search guest, company, reference, or house" placeholder="Name, reference or house" value={query} onChange={(event) => setQuery(event.target.value)} /></div></label>
        <label className="admin-booking-filter is-house"><span>House</span><select className="admin-field" aria-label="Filter by house" value={propertyId} onChange={(event) => setPropertyId(event.target.value)}><option value="all">All houses</option>{properties.map((property) => <option key={String(property.id)} value={String(property.id)}>{String(property.name)}</option>)}</select></label>
        <label className="admin-booking-filter is-type"><span>Type</span><select className="admin-field" aria-label="Filter by type" value={type} onChange={(event) => setType(event.target.value)}><option value="all">All types</option>{Array.from(new Set(items.map((item) => item.type))).map((value) => <option key={value} value={value}>{statusPresentation("source", value).label}</option>)}</select></label>
        <label className="admin-booking-filter is-source"><span>Source</span><select className="admin-field" aria-label="Filter by source" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">All sources</option>{Array.from(new Set(items.map((item) => item.source))).map((value) => <option key={value} value={value}>{statusPresentation("source", value).label}</option>)}</select></label>
        <label className="admin-booking-filter is-status"><span>Status</span><select className="admin-field" aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{Array.from(new Set(items.map((item) => item.status))).map((value) => <option key={value} value={value}>{statusPresentation("source", value).label}</option>)}</select></label>
        <label className="admin-booking-filter is-payment"><span>Payment</span><select className="admin-field" aria-label="Filter by payment" value={payment} onChange={(event) => setPayment(event.target.value)}><option value="all">All payments</option>{Array.from(new Set(items.map((item) => item.payment))).map((value) => <option key={value} value={value}>{statusPresentation("source", value).label}</option>)}</select></label>
        <label className="admin-booking-filter is-from"><span>From</span><input className="admin-field" aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
        <label className="admin-booking-filter is-to"><span>To</span><input className="admin-field" aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
      </div>
    </section>

    <div className="admin-booking-controls"><div className="admin-booking-type-tabs" role="group" aria-label="Booking type">
      {(["all", "standard", "corporate", ...connectedPlatforms] as BookingView[]).map((category) => (
        <button key={category} type="button" aria-pressed={bookingView === category} data-booking-type={category} className={`admin-booking-type-tab ${bookingView === category ? "is-active" : ""}`} onClick={() => setBookingView(category)}>
          <span>{category === "all" ? "All" : category === "standard" ? "Standard" : category === "corporate" ? "Corporate" : CALENDAR_PLATFORM_LABELS[category]}</span>
          <strong>{bookingViewCounts[category]}</strong>
        </button>
      ))}
    </div>

    </div>
    {selectedPlatform && <p className="admin-booking-source-note">{CALENDAR_PLATFORM_LABELS[selectedPlatform]} iCal shows blocked dates only. Reservation and guest details stay in {CALENDAR_PLATFORM_LABELS[selectedPlatform]}.</p>}
    <div id="admin-booking-records" aria-label="Reservation results"><ReservationList items={filtered} onSelect={setSelected} /></div>

    {selected && <ReservationPreview item={selected} onClose={() => setSelected(null)} />}
  </>;
}

type SheetSortKey = "reference" | "title" | "propertyLabel" | "start" | "end" | "type" | "source" | "status" | "payment";
const sheetColumns: { key: SheetSortKey; label: string }[] = [
  { key: "reference", label: "Reference" },
  { key: "title", label: "Guest / event" },
  { key: "propertyLabel", label: "House" },
  { key: "start", label: "Check-in" },
  { key: "end", label: "Checkout" },
  { key: "type", label: "Type" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status" },
  { key: "payment", label: "Payment" },
];

function ReservationList({ items, onSelect }: { items: ReservationItem[]; onSelect: (item: ReservationItem) => void }) {
  const [sort, setSort] = useState<{ key: SheetSortKey; direction: "asc" | "desc" }>({ key: "start", direction: "asc" });
  const sorted = useMemo(() => [...items].sort((a, b) => {
    const comparison = String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? ""), "en-AU", { numeric: true, sensitivity: "base" });
    return (sort.direction === "asc" ? comparison : -comparison) || a.reference.localeCompare(b.reference);
  }), [items, sort]);
  const { visible, pagination, page, pageSize } = useAdminPagination(sorted);
  const changeSort = (key: SheetSortKey) => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));

  return <section className="admin-booking-sheet" aria-label="Booking spreadsheet">
    <div className="admin-booking-sheet-toolbar"><div><strong>Reservation sheet</strong><span>{items.length} matching {items.length === 1 ? "record" : "records"}</span></div><p>Choose a column to sort · Open a row for full details</p></div>
    <div className="admin-booking-sheet-scroll" role="region" aria-label="Scrollable booking table" tabIndex={0}>
      <table className="admin-booking-sheet-table">
        <colgroup><col className="admin-sheet-col-number" /><col className="admin-sheet-col-reference" /><col className="admin-sheet-col-guest" /><col className="admin-sheet-col-house" /><col className="admin-sheet-col-date" /><col className="admin-sheet-col-date" /><col className="admin-sheet-col-type" /><col className="admin-sheet-col-source" /><col className="admin-sheet-col-status" /><col className="admin-sheet-col-payment" /><col className="admin-sheet-col-action" /></colgroup>
        <thead><tr><th scope="col" className="admin-sheet-row-number">#</th>{sheetColumns.map((column) => <th key={column.key} scope="col" aria-sort={sort.key === column.key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}><button type="button" onClick={() => changeSort(column.key)}>{column.label}{sort.key === column.key ? sort.direction === "asc" ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" /> : <ArrowUpDown size={12} aria-hidden="true" />}</button></th>)}<th scope="col">Details</th></tr></thead>
        <tbody>{visible.map((item, index) => <tr key={`${item.kind}:${item.id}`}>
          <th scope="row" className="admin-sheet-row-number">{(page - 1) * pageSize + index + 1}</th>
          <td className="admin-sheet-reference"><span title={item.reference}>{item.reference || "—"}</span></td>
          <td><span className="admin-sheet-cell-clip" title={item.title}>{item.title}</span></td>
          <td><span className="admin-sheet-cell-clip" title={item.propertyLabel}>{item.propertyLabel}</span></td>
          <td className="admin-sheet-date">{formatSheetDate(item.start)}</td>
          <td className="admin-sheet-date">{formatSheetDate(item.end)}</td>
          <td>{item.bookingCategory ? `${item.bookingCategory === "corporate" ? "Corporate" : "Standard"} booking` : statusPresentation("source", item.type).label}</td>
          <td><AdminBadge domain="source" value={item.source} /></td>
          <td><AdminBadge domain={item.kind === "enquiry" ? "enquiry" : item.kind === "block" ? "calendar" : "booking"} value={item.status} /></td>
          <td><AdminBadge domain="payment" value={item.payment} /></td>
          <td><button type="button" className="admin-sheet-open" onClick={() => onSelect(item)} aria-label={`Open details for ${item.reference || item.title}`}>View <ChevronRight size={14} aria-hidden="true" /></button></td>
        </tr>)}</tbody>
      </table>
      {!items.length && <p className="admin-booking-sheet-empty">No reservations match these filters.</p>}
    </div>
    <p className="admin-booking-sheet-mobile-hint">Scroll sideways to view every column.</p>
    <div className="admin-booking-sheet-pagination">{pagination}</div>
  </section>;
}

function ReservationPreview({ item, onClose }: { item: ReservationItem; onClose: () => void }) {
  const guest = asObject(item.raw.guest_details);
  const details = item.kind === "booking" ? [
    ["Booking status", cleanLabel(item.status)],
    ["Payment", cleanLabel(item.payment)],
    ["Total", formatAud(Number(item.raw.total ?? 0))],
    ["Email", String(guest.email ?? "—")],
    ["Phone", String(guest.phone ?? "—")],
    ["Guests", `${Number(item.raw.adults ?? 0)} adults · ${Number(item.raw.children ?? 0)} children · ${Number(item.raw.infants ?? 0)} infants · ${Number(item.raw.pets ?? 0)} pets`],
  ] : item.kind === "enquiry" ? [["Status", cleanLabel(item.status)], ["Notes", String(item.raw.notes ?? "—")]] : [["Status", cleanLabel(item.status)], ["Note", String(item.raw.internal_note ?? item.raw.summary ?? "—")]];
  return <AdminDialog label="Reservation preview" drawer onClose={onClose}>
    <aside className="w-full p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--admin-border)] pb-5"><div><p className="text-sm font-semibold text-[var(--admin-text)]">{cleanLabel(item.kind)} · preview</p><h2 className="mt-1 break-all text-2xl font-semibold tracking-[-0.04em]">{item.reference || item.title}</h2></div><button type="button" className="admin-button min-h-10 px-3" onClick={onClose} aria-label="Close preview"><X size={17} /></button></div>
      <dl className="grid grid-cols-2 border-b border-[var(--admin-border)] text-sm"><Detail label="Guest / event" value={item.title} /><Detail label="House" value={item.propertyLabel} /><Detail label="Check-in" value={formatDate(item.start)} /><Detail label="Checkout" value={formatDate(item.end)} /><Detail label="Type" value={item.bookingCategory ? `${item.bookingCategory === "corporate" ? "Corporate" : "Standard"} booking` : cleanLabel(item.type)} /><Detail label="Source" value={cleanLabel(item.source)} />{details.map(([label, value]) => <Detail key={label} label={label} value={value} />)}</dl>
      <p className="mt-5 text-sm text-[var(--admin-muted)]">This is a read-only preview. Use Calendar to manage bookings and blocked dates.</p>
    </aside>
  </AdminDialog>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="border-b border-r border-[var(--admin-border)] p-4"><dt className="text-sm font-semibold text-[var(--admin-muted)]">{label}</dt><dd className="mt-1 font-medium text-[var(--admin-text)]">{value}</dd></div>; }
