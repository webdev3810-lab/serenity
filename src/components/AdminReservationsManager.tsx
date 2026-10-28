"use client";

import { addDays,formatAud } from "@/src/lib/booking";
import { cancellationRefundPreview, isWithinFreeCancellation } from "@/src/lib/cancellationPolicy";
import { Archive,ArrowDown,ArrowUp,ArrowUpDown,ChevronRight,LockKeyhole,RotateCcw,Search,X } from "lucide-react";
import { useMemo,useState } from "react";

import { AdminBadge,AdminDialog,useAdminPagination,useAdminWorkspace } from "@/src/components/admin/AdminUI";
import { statusPresentation } from "@/src/lib/admin-status";
import { CALENDAR_PLATFORM_LABELS,CALENDAR_PLATFORMS,type CalendarPlatform } from "@/src/lib/calendar/types";
import { isAppManagedBookingSource } from "@/src/lib/booking-source";
type Row = Record<string, unknown>;
type PropertyRow = Row & { id?: string; name?: string; slug?: string };
type ReservationKind = "booking" | "block";
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
  calendarEvents: Row[];
  calendarConnections: Row[];
  properties: PropertyRow[];
  reload: () => Promise<void>;
};


const asObject = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
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
const isReadOnlyReservation = (item: ReservationItem) => item.kind === "booking" ? !isAppManagedBookingSource(item.source) : item.source !== "admin";


export default function AdminReservationsManager({ bookings, calendarEvents, calendarConnections, properties, reload }: Props) {
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
  const [archiveView, setArchiveView] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
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
        source: String(booking.booking_source ?? "website"), status: String(booking.booking_status ?? "pending_payment"), payment: ["pending", "requires_action"].includes(String(booking.refund_status ?? "")) ? "refund_pending" : ["failed", "canceled"].includes(String(booking.refund_status ?? "")) ? "refund_failed" : String(booking.payment_status ?? "pending"),
        title: guestName, raw: booking,
      };
    });
    const blockItems = calendarEvents.filter((event) => event.status === "active").map((event): ReservationItem => {
      const property = String(event.property_id ?? "");
      return {
        id: String(event.id), kind: "block", reference: String(event.external_event_id ?? event.id ?? ""), propertyIds: [property], propertyLabel: propertyMap.get(property) ?? "House",
        start: String(event.start_date ?? ""), end: String(event.end_date ?? ""), type: "blocked dates", source: event.source_platform === "direct" && !event.connection_id && !String(event.external_event_id ?? "").startsWith("ical-upload:") ? "admin" : event.source_platform === "direct" ? "uploaded calendar" : String(event.source_platform ?? "external"),
        status: String(event.status ?? "active"), payment: "not applicable", title: String(event.summary ?? "Unavailable"), raw: event,
      };
    });
    return [...bookingItems, ...blockItems].sort((a, b) => a.start.localeCompare(b.start) || a.reference.localeCompare(b.reference));
  }, [bookings, calendarEvents, propertyMap]);

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
  const filteredBeforeBookingView = items.filter((item) => (archiveView ? item.kind === "booking" && Boolean(item.raw.archived_at) : item.kind !== "booking" || !item.raw.archived_at) && matchesFilters(item));
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
  const changeBooking = async (item: ReservationItem, changes: Row) => {
    setActionError(""); setNotice("");
    const response = await fetch(`/api/admin/bookings/${encodeURIComponent(item.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(String(result.error ?? "Could not update this booking."));
    await reload();
    setSelected(null);
    setNotice(changes.archived === true ? "Booking archived. You can find it in Archived." : changes.archived === false ? "Booking restored to the main list." : changes.internalNotes !== undefined ? "Internal notes saved." : result.refund ? `Booking cancelled. Stripe refund of ${formatAud(result.refund.amount / 100)} is ${result.refund.status}. The original payment processing fee remains your cost.` : result.retainedFeeCents ? `Booking cancelled. ${formatAud(result.retainedFeeCents / 100)} cancellation fee retained; no refund is due.` : "Booking cancelled. Its dates are available again.");
  };

  return <>
    <header className="admin-page-header admin-bookings-header">
      <div><p className="admin-section-kicker">Reservations</p><h2>Bookings &amp; reservations</h2><p>See the important details at a glance. Open View for the full record and booking actions.</p></div>
    </header>

    {notice && <p className="admin-notice is-success" role="status">{notice}</p>}
    {actionError && <p className="admin-notice is-error" role="alert">{actionError}</p>}
    <div className="admin-view-tabs" role="group" aria-label="Reservation archive">
      <button type="button" className={`admin-view-tab ${!archiveView ? "is-active" : ""}`} aria-pressed={!archiveView} onClick={() => { setArchiveView(false); setSelected(null); }}>Current</button>
      <button type="button" className={`admin-view-tab ${archiveView ? "is-active" : ""}`} aria-pressed={archiveView} onClick={() => { setArchiveView(true); setSelected(null); }}>Archived ({bookings.filter((booking) => Boolean(booking.archived_at)).length})</button>
    </div>

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
    {selected && <ReservationPreview key={`${selected.kind}:${selected.id}`} item={selected} onClose={() => setSelected(null)} onChange={async (changes) => { try { await changeBooking(selected, changes); } catch (error) { const message = error instanceof Error ? error.message : "Could not update this booking."; setActionError(message); throw error; } }} />}
  </>;
}

type SheetSortKey = "reference" | "propertyLabel" | "start" | "status";
const sheetColumns: { key: SheetSortKey; label: string }[] = [
  { key: "reference", label: "Reservation" },
  { key: "propertyLabel", label: "House" },
  { key: "start", label: "Stay" },
  { key: "status", label: "Status" },
];

function ReservationList({ items, onSelect }: { items: ReservationItem[]; onSelect: (item: ReservationItem) => void }) {
  const [sort, setSort] = useState<{ key: SheetSortKey; direction: "asc" | "desc" }>({ key: "start", direction: "asc" });
  const sorted = useMemo(() => [...items].sort((a, b) => {
    const comparison = String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? ""), "en-AU", { numeric: true, sensitivity: "base" });
    return (sort.direction === "asc" ? comparison : -comparison) || a.reference.localeCompare(b.reference);
  }), [items, sort]);
  const { visible, pagination } = useAdminPagination(sorted);
  const changeSort = (key: SheetSortKey) => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));

  return <section className="admin-booking-sheet" aria-label="Reservations">
    <div className="admin-booking-sheet-toolbar"><div><strong>Reservations</strong><span>{items.length} matching {items.length === 1 ? "record" : "records"}</span></div><p>Use View for more details</p></div>
    <div className="admin-booking-sheet-scroll">
      <table className="admin-booking-sheet-table">
        <colgroup><col className="admin-sheet-col-reservation" /><col className="admin-sheet-col-house" /><col className="admin-sheet-col-stay" /><col className="admin-sheet-col-status" /><col className="admin-sheet-col-action" /></colgroup>
        <thead><tr>{sheetColumns.map((column) => <th key={column.key} scope="col" aria-sort={sort.key === column.key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}><button type="button" onClick={() => changeSort(column.key)}>{column.label}{sort.key === column.key ? sort.direction === "asc" ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" /> : <ArrowUpDown size={12} aria-hidden="true" />}</button></th>)}<th scope="col">Details</th></tr></thead>
        <tbody>{visible.map((item) => <tr key={`${item.kind}:${item.id}`}>
          <td className="admin-sheet-reservation"><span className="admin-sheet-reservation-text"><strong title={item.reference}>{item.reference || item.title}</strong><small title={item.title}>{item.title}</small></span></td>
          <td><strong className="admin-sheet-cell-clip" title={item.propertyLabel}>{item.propertyLabel}</strong><small className="admin-sheet-subline">{statusPresentation("source", item.source).label}</small></td>
          <td className="admin-sheet-date"><strong>{formatSheetDate(item.start)}</strong><small className="admin-sheet-subline">to {formatSheetDate(item.end)}</small></td>
          <td><AdminBadge domain={item.kind === "block" ? "calendar" : "booking"} value={item.status} />{item.kind === "booking" && <small className="admin-sheet-subline">{statusPresentation("payment", item.payment).label} payment</small>}{isReadOnlyReservation(item) && <small className="admin-sheet-subline">Read only</small>}</td>
          <td><button type="button" className="admin-sheet-open" onClick={() => onSelect(item)} aria-label={`View details for ${item.reference || item.title}${isReadOnlyReservation(item) ? ", read only" : ""}`}>View <ChevronRight size={14} aria-hidden="true" /></button></td>
        </tr>)}</tbody>
      </table>
      {!items.length && <p className="admin-booking-sheet-empty">No reservations match these filters.</p>}
    </div>
    <div className="admin-booking-sheet-pagination">{pagination}</div>
  </section>;
}

function ReservationPreview({ item, onClose, onChange }: { item: ReservationItem; onClose: () => void; onChange: (changes: Row) => Promise<void> }) {
  const { confirm } = useAdminWorkspace();
  const [reason, setReason] = useState("");
  const [internalNotes, setInternalNotes] = useState(String(item.raw.internal_notes ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const archived = Boolean(item.raw.archived_at);
  const readOnly = isReadOnlyReservation(item);
  const canArchive = ["cancelled", "expired", "checked_out"].includes(item.status);
  const stripePaid = item.payment === "paid" && Boolean(item.raw.stripe_checkout_session_id);
  const lateFee = item.raw.late_cancellation_fee == null ? null : Number(item.raw.late_cancellation_fee);
  const refundPreview = stripePaid ? cancellationRefundPreview(Number(item.raw.total ?? 0), String(item.raw.free_cancellation_until ?? ""), lateFee) : null;
  const automaticRefund = Boolean(refundPreview && refundPreview.refundCents > 0);
  const freeCancellation = isWithinFreeCancellation(String(item.raw.free_cancellation_until ?? ""));
  const notesChanged = internalNotes !== String(item.raw.internal_notes ?? "");
  const close = async () => {
    if (busy) return;
    if (notesChanged && !await confirm({ title: "Discard internal note changes?", description: "Your unsaved note will be lost.", confirmLabel: "Discard changes", destructive: true })) return;
    onClose();
  };
  const act = async (changes: Row) => {
    setBusy(true); setError("");
    try { await onChange(changes); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not update this booking."); }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!reason.trim() || busy) return;
    const description = automaticRefund
      ? `Cancel ${item.propertyLabel} and refund ${formatAud(refundPreview!.refundCents / 100)} through Stripe? ${freeCancellation ? "The original Stripe processing fee remains your cost." : `${formatAud(refundPreview!.retainedCents / 100)} late cancellation fee is retained.`} If this is one house in a corporate payment, the other houses remain booked.`
      : refundPreview ? `Cancel ${item.propertyLabel} and release its dates? The ${formatAud(refundPreview.retainedCents / 100)} late cancellation fee covers the booking, so no refund is due.`
      : `Cancel ${item.propertyLabel} and release its dates? ${item.payment === "paid" ? "No automatic refund will be made. Review this payment separately." : "No refund will be made."}`;
    if (!await confirm({ title: automaticRefund ? "Cancel and refund booking?" : "Cancel booking?", description, confirmLabel: automaticRefund ? "Cancel and refund" : "Cancel booking", destructive: true })) return;
    await act({ bookingStatus: "cancelled", cancellationReason: reason.trim() });
  };
  const changeArchive = async () => {
    if (busy) return;
    if (!archived && !await confirm({ title: "Archive this booking?", description: "It will move to Archived and stay in your records. Archiving does not cancel a booking, refund a payment, or change availability.", confirmLabel: "Archive booking" })) return;
    await act({ archived: !archived });
  };
  const guest = asObject(item.raw.guest_details);
  const corporate = asObject(item.raw.corporate_details);
  const details = item.kind === "booking" ? [
    ["Stay type", item.bookingCategory === "corporate" ? "Corporate booking" : "Standard booking"],
    ["Booked through", statusPresentation("source", item.source).label],
    ["Total", formatAud(Number(item.raw.total ?? 0))],
    ...(item.raw.refund_status ? [["Refund status", String(item.raw.refund_status)], ["Refund amount", formatAud(Number(item.raw.refund_amount ?? 0))]] : []),
    ...(Number(item.raw.cancellation_fee_retained ?? 0) > 0 ? [["Cancellation fee retained", formatAud(Number(item.raw.cancellation_fee_retained))]] : []),
    ["Guests", `${Number(item.raw.adults ?? 0)} adults · ${Number(item.raw.children ?? 0)} children · ${Number(item.raw.infants ?? 0)} infants · ${Number(item.raw.pets ?? 0)} pets`],
    ["Email", String(guest.email ?? "—")],
    ["Phone", String(guest.phone ?? "—")],
    ...(corporate.stayPurpose ? [["Stay purpose", String(corporate.stayPurpose)]] : []),
    ...(guest.purpose ? [["Purpose of stay", guest.purpose === "Other" ? String(guest.purposeOther || "Other") : String(guest.purpose)]] : []),
    ...(guest.requests ? [["Special requests", String(guest.requests)]] : []),
  ] : [["Type", statusPresentation("source", item.type).label], ["Imported from", statusPresentation("source", item.source).label], ["Note", String(item.raw.internal_note ?? item.raw.summary ?? "—")]];
  return <AdminDialog label="Reservation details" className="admin-reservation-dialog" busy={busy} onClose={() => void close()}>
    <aside className="admin-booking-dialog-content">
      <header className="admin-reservation-dialog-header"><div><p>Reservation details</p><h2>{item.reference || item.title}</h2><div className="admin-reservation-dialog-badges"><AdminBadge domain={item.kind === "block" ? "calendar" : "booking"} value={item.status} />{item.kind === "booking" && <AdminBadge domain="payment" value={item.payment} label={`${statusPresentation("payment", item.payment).label} payment`} />}{readOnly && <span className="admin-reservation-readonly"><LockKeyhole size={13} /> Read only</span>}</div></div><button type="button" className="admin-reservation-dialog-close" onClick={() => void close()} disabled={busy} aria-label="Close reservation details"><X size={18} /></button></header>
      <section className="admin-reservation-stay" aria-label="Reservation stay"><p className="admin-reservation-label">{item.kind === "booking" ? "Booked for" : "Calendar event"}</p><h3>{item.propertyLabel}</h3><p className="admin-reservation-guest">{item.title}</p><div className="admin-reservation-dates"><div><span>Check-in</span><strong>{formatDate(item.start)}</strong></div><div><span>Checkout</span><strong>{formatDate(item.end)}</strong></div></div></section>
      <dl className="admin-booking-dialog-details">{details.map(([label, value]) => <Detail key={label} label={label} value={value} />)}</dl>
      {item.kind === "booking" && <section className="admin-reservation-notes"><div><h3>Internal notes</h3><p>Only your team can see these.</p></div>{readOnly ? <p className="admin-reservation-notes-readonly">{internalNotes || "No internal notes."}</p> : <><textarea className="admin-field" aria-label="Internal notes" maxLength={4000} value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} placeholder="Add a private note" /><button type="button" className="admin-button admin-button-primary" disabled={busy || !notesChanged} onClick={() => void act({ internalNotes })}>{busy ? "Saving…" : "Save note"}</button></>}</section>}
      {readOnly && <div className="admin-reservation-readonly-note"><LockKeyhole size={18} aria-hidden="true" /><p><strong>Managed outside Serenity</strong><span>{item.source === "uploaded calendar" ? "Change the source calendar and upload it again." : item.kind === "block" ? "Make changes on the original platform. Updated dates will appear here after the calendar sync." : "Make changes on the original platform. This booking record cannot be edited here."}</span></p></div>}
      {item.kind === "booking" && !readOnly ? <div className="admin-reservation-actions">
        {error && <p className="admin-notice is-error" role="alert">{error}</p>}
        {item.status !== "cancelled" && item.status !== "expired" && item.status !== "checked_out" && <section className="admin-reservation-action">
          <div><h3>Cancel booking</h3><p>{automaticRefund ? `${freeCancellation ? `Free cancellation through ${formatDate(String(item.raw.free_cancellation_until))}.` : `After the free cancellation deadline, ${formatAud(refundPreview!.retainedCents / 100)} is retained.`} Automatically refund ${formatAud(refundPreview!.refundCents / 100)} to the original payment method. The original Stripe processing fee remains your cost.` : refundPreview ? `${formatAud(refundPreview.retainedCents / 100)} late cancellation fee covers the booking; no refund is due.` : item.payment === "paid" ? "This booking has its original cancellation terms. Review any refund separately." : "Cancelling makes these dates available again."}</p></div>
          <label>Reason for cancellation<input className="admin-field" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Enter a reason" /></label>
          <button type="button" className="admin-button admin-button-danger" disabled={busy || !reason.trim()} onClick={() => void cancel()}>Cancel{automaticRefund ? " and refund" : ""} booking</button>
        </section>}
        {(archived || canArchive) && <section className="admin-reservation-action admin-reservation-action-inline"><div><h3>{archived ? "Restore booking" : "Archive booking"}</h3><p>{archived ? "Move this record back to Current." : "Move this completed record out of Current. Payment and availability stay the same."}</p></div><button type="button" className="admin-button inline-flex items-center gap-2" disabled={busy} onClick={() => void changeArchive()}>{archived ? <RotateCcw size={16} /> : <Archive size={16} />}{archived ? "Restore" : "Archive"}</button></section>}
      </div> : !readOnly && <p className="admin-reservation-manual-note">Use Calendar to manage these blocked dates.</p>}
    </aside>
  </AdminDialog>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="admin-booking-preview-detail"><dt>{label}</dt><dd>{value}</dd></div>; }
