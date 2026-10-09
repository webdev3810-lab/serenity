"use client";

import { addDays,todayIso } from "@/src/lib/booking";
import { CalendarDays,ChevronLeft,ChevronRight,Plus,Save,Search,X } from "lucide-react";
import { useMemo,useState } from "react";

import { AdminBadge,AdminDialog,useAdminPagination,useAdminWorkspace,useDirtyGuard } from "@/src/components/admin/AdminUI";
import { statusPresentation } from "@/src/lib/admin-status";
type Row = Record<string, unknown>;
type PropertyRow = Row & { id?: string; name?: string; slug?: string };
type ReservationKind = "booking" | "block" | "enquiry";
type BookingCategory = "standard" | "corporate";
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
  properties: PropertyRow[];
  reload: () => Promise<void>;
  notify: (message: string) => void;
  onError: (message: string) => void;
  convertEnquiry: (enquiry: Row) => void;
  updateEnquiryStatus: (enquiry: Row, status: string) => void;
  openCalendar: () => void;
};


const asObject = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
const asStringArray = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
const cleanLabel = (value: string) => value.replaceAll("_", " ");
const formatDate = (value: string) => value ? new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeZone: "Australia/Melbourne" }).format(new Date(`${value}T00:00:00Z`)) : "—";
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


export default function AdminReservationsManager({ bookings, enquiries, calendarEvents, properties, reload, notify, onError, convertEnquiry, updateEnquiryStatus, openCalendar }: Props) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [bookingView, setBookingView] = useState<"all" | BookingCategory>("all");
  const [query, setQuery] = useState("");
  const [propertyId, setPropertyId] = useState("all");
  const [type, setType] = useState("all");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState<ReservationItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);
  const [manual, setManual] = useState({ propertyId: properties[0]?.id ?? "", checkIn: "", checkout: "", contactName: "", email: "", phone: "", companyName: "", adults: "1", children: "0", infants: "0", pets: "0", corporate: false, paymentStatus: "pending", internalNotes: "" });

  const propertyMap = useMemo(() => new Map(properties.map((property) => [String(property.id), String(property.name ?? property.slug ?? "House")])), [properties]);
  const items = useMemo<ReservationItem[]>(() => {
    const bookingItems = bookings.map((booking): ReservationItem => {
      const guest = asObject(booking.guest_details);
      const property = String(booking.property_id ?? "");
      const category = getBookingCategory(booking);
      return {
        id: String(booking.id), kind: "booking", reference: String(booking.reference ?? ""), propertyIds: [property], propertyLabel: propertyMap.get(property) ?? "House",
        start: String(booking.check_in ?? ""), end: String(booking.checkout ?? ""), type: String(booking.booking_type ?? (category === "corporate" ? "corporate" : "standard")), bookingCategory: category,
        source: String(booking.booking_source ?? "website"), status: String(booking.booking_status ?? "pending_payment"), payment: String(booking.payment_status ?? "pending"),
        title: String(guest.companyName ?? guest.contactName ?? guest.firstName ?? guest.email ?? "Guest booking"), raw: booking,
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
  };
  const filtered = filteredBeforeBookingView.filter((item) => bookingView === "all" || (item.kind === "booking" && item.bookingCategory === bookingView));

  const updateBooking = async (bookingId: string, changes: Row) => {
    setBusy(true); onError(""); setDialogError("");
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update booking.");
      notify("Booking updated in the shared calendar.");
      setSelected(null);
      await reload();
    } catch (error) { setDialogError(error instanceof Error ? error.message : "Could not update booking."); }
    finally { setBusy(false); }
  };

  const createBooking = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); onError(""); setDialogError("");
    try {
      const response = await fetch("/api/admin/bookings", {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": `admin:${crypto.randomUUID()}` },
        body: JSON.stringify({ ...manual, guests: { adults: Number(manual.adults), children: Number(manual.children), infants: Number(manual.infants), pets: Number(manual.pets) } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create booking.");
      notify("Manual booking created and dates blocked everywhere.");
      setShowCreate(false);
      setManual((current) => ({ ...current, checkIn: "", checkout: "", contactName: "", email: "", phone: "", companyName: "", internalNotes: "" }));
      await reload();
    } catch (error) { setDialogError(error instanceof Error ? error.message : "Could not create booking."); }
    finally { setBusy(false); }
  };

  return <>
    <header className="admin-page-header">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="admin-section-kicker">Reservations</p><h2 className="mt-2">Shared booking workspace</h2><p className="mt-2 max-w-2xl text-sm text-[var(--admin-muted)]">Website bookings, corporate reservations, enquiries, manual blocks, and connected calendars in one operational view.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" className="admin-button" onClick={openCalendar}><CalendarDays size={16} /> Manage blocks & sync</button><button type="button" className="admin-button admin-button-primary" onClick={() => { setDialogError(""); setShowCreate(true); }}><Plus size={16} /> New manual booking</button></div>
      </div>
    </header>

    <div className="admin-filter-panel mb-5 grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="relative xl:col-span-2"><span className="sr-only">Search reservations</span><Search className="admin-search-icon" size={18} /><input className="admin-field admin-search-input" aria-label="Search guest, company, reference, or house" placeholder="Search guest, company, reference, or house" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <select className="admin-field" aria-label="Filter by house" value={propertyId} onChange={(event) => setPropertyId(event.target.value)}><option value="all">All houses</option>{properties.map((property) => <option key={String(property.id)} value={String(property.id)}>{String(property.name)}</option>)}</select>
      <select className="admin-field" aria-label="Filter by type" value={type} onChange={(event) => setType(event.target.value)}><option value="all">All types</option>{Array.from(new Set(items.map((item) => item.type))).map((value) => <option key={value} value={value}>{statusPresentation("source", value).label}</option>)}</select>
      <select className="admin-field" aria-label="Filter by source" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">All sources</option>{Array.from(new Set(items.map((item) => item.source))).map((value) => <option key={value} value={value}>{statusPresentation("source", value).label}</option>)}</select>
      <select className="admin-field" aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{Array.from(new Set(items.map((item) => item.status))).map((value) => <option key={value} value={value}>{statusPresentation("source", value).label}</option>)}</select>
      <select className="admin-field" aria-label="Filter by payment" value={payment} onChange={(event) => setPayment(event.target.value)}><option value="all">All payments</option>{Array.from(new Set(items.map((item) => item.payment))).map((value) => <option key={value} value={value}>{statusPresentation("source", value).label}</option>)}</select>
      <div className="grid grid-cols-2 gap-2"><input className="admin-field" aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /><input className="admin-field" aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></div>
      <button type="button" className="admin-button" onClick={() => { setQuery(""); setPropertyId("all"); setType("all"); setSource("all"); setStatus("all"); setPayment("all"); setFromDate(""); setToDate(""); setBookingView("all"); }}>Reset filters</button>
    </div>

    <div className="admin-booking-type-tabs mb-4" role="group" aria-label="Booking type">
      {(["all", "standard", "corporate"] as const).map((category) => (
        <button key={category} type="button" aria-pressed={bookingView === category} data-booking-type={category} className={`admin-booking-type-tab ${bookingView === category ? "is-active" : ""}`} onClick={() => setBookingView(category)}>
          <span>{category === "all" ? "All records" : `${category === "standard" ? "Standard" : "Corporate"} bookings`}</span>
          <strong>{bookingViewCounts[category]}</strong>
        </button>
      ))}
    </div>

    <div className="admin-view-tabs mb-4" role="group" aria-label="Booking layout"><button type="button" aria-pressed={view === "list"} className={`admin-view-tab ${view === "list" ? "is-active" : ""}`} onClick={() => setView("list")}>List · {filtered.length}</button><button type="button" aria-pressed={view === "calendar"} className={`admin-view-tab ${view === "calendar" ? "is-active" : ""}`} onClick={() => setView("calendar")}>Calendar</button></div>
    <div id="admin-booking-records" aria-label="Reservation results">{view === "calendar" ? <ReservationCalendar items={filtered} offset={monthOffset} setOffset={setMonthOffset} onSelect={(item) => { setDialogError(""); setSelected(item); }} /> : <ReservationList items={filtered} onSelect={setSelected} />}</div>

    {selected && <ReservationDetail error={dialogError} item={selected} busy={busy} onClose={() => setSelected(null)} updateBooking={updateBooking} updateEnquiryStatus={updateEnquiryStatus} convertEnquiry={convertEnquiry} openCalendar={openCalendar} />}
    {showCreate && <ManualBookingForm error={dialogError} manual={manual} setManual={setManual} properties={properties} busy={busy} close={() => { setShowCreate(false); setManual({ propertyId: properties[0]?.id ?? "", checkIn: "", checkout: "", contactName: "", email: "", phone: "", companyName: "", adults: "1", children: "0", infants: "0", pets: "0", corporate: false, paymentStatus: "pending", internalNotes: "" }); }} submit={createBooking} />}
  </>;
}

function ReservationList({ items, onSelect }: { items: ReservationItem[]; onSelect: (item: ReservationItem) => void }) {
  const { visible, pagination } = useAdminPagination(items);
  return <><div className="admin-card admin-table-shell overflow-x-auto bg-[var(--admin-surface)]"><table className="admin-responsive-table w-full min-w-[1050px] text-left text-sm"><thead><tr className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-alt)] text-sm font-semibold text-[var(--admin-muted)]"><th className="p-3">Reference</th><th className="p-3">Guest / event</th><th className="p-3">House</th><th className="p-3">Dates</th><th className="p-3">Type & source</th><th className="p-3">Status</th><th className="p-3">Payment</th><th className="p-3 text-right">Details</th></tr></thead><tbody>{visible.map((item) => <tr key={`${item.kind}:${item.id}`} className="border-b border-[var(--admin-border)] align-top last:border-b-0 hover:bg-[var(--admin-surface-alt)]"><td data-label="Reference" className="p-3 font-semibold">{item.reference}</td><td data-label="Guest / event" className="p-3">{item.title}</td><td data-label="House" className="p-3">{item.propertyLabel}</td><td data-label="Dates" className="whitespace-nowrap p-3">{formatDate(item.start)} – {formatDate(item.end)}</td><td data-label="Type & source" className="p-3"><div className="flex flex-wrap gap-1">{item.bookingCategory ? <AdminBadge domain="category" value={item.bookingCategory} label={`${item.bookingCategory === "corporate" ? "Corporate" : "Standard"} booking`} /> : <AdminBadge domain="category" value={item.type} />}<AdminBadge domain="source" value={item.source} /></div></td><td data-label="Status" className="p-3"><AdminBadge domain={item.kind === "enquiry" ? "enquiry" : item.kind === "block" ? "calendar" : "booking"} value={item.status} /></td><td data-label="Payment" className="p-3"><AdminBadge domain="payment" value={item.payment} /></td><td data-label="Details" className="p-3 text-right"><button type="button" className="admin-button min-h-9 px-3 text-sm" onClick={() => onSelect(item)}>Open details</button></td></tr>)}</tbody></table>{!items.length && <p className="p-10 text-center text-sm text-[var(--admin-muted)]">No reservations match these filters.</p>}</div>{pagination}</>;
}

function ReservationCalendar({ items, offset, setOffset, onSelect }: { items: ReservationItem[]; offset: number; setOffset: (value: number) => void; onSelect: (item: ReservationItem) => void }) {
  const today = new Date(`${todayIso()}T00:00:00Z`);
  const month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1));
  const days = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  const leading = month.getUTCDay();
  const cells = [...Array.from({ length: leading }, () => null), ...Array.from({ length: days }, (_, index) => index + 1)];
  const label = new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }).format(month);
  return <div className="admin-reservation-calendar"><div className="flex min-w-[44rem] items-center justify-between border-b border-[var(--admin-border)] p-3"><button type="button" className="admin-button min-h-9 px-3" onClick={() => setOffset(offset - 1)} aria-label="Previous month"><ChevronLeft size={16} /></button><h2 className="text-lg font-semibold">{label}</h2><button type="button" className="admin-button min-h-9 px-3" onClick={() => setOffset(offset + 1)} aria-label="Next month"><ChevronRight size={16} /></button></div><div className="grid grid-cols-7 border-b border-[var(--admin-border)] bg-[var(--admin-surface-alt)] text-center text-sm font-semibold text-[var(--admin-muted)]">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="border-r border-[var(--admin-border)] py-2 last:border-r-0">{day}</div>)}</div><div className="grid grid-cols-7">{cells.map((day, index) => {
    if (!day) return <div key={`empty-${index}`} className="min-h-28 border-b border-r border-[var(--admin-border)] bg-[var(--admin-surface-alt)]" />;
    const iso = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const matches = items.filter((item) => item.start <= iso && item.end > iso);
    return <div key={iso} className="min-h-28 border-b border-r border-[var(--admin-border)] p-2"><span className="text-sm font-semibold">{day}</span><div className="mt-1 space-y-1">{matches.slice(0, 3).map((item) => <button type="button" key={`${item.kind}:${item.id}:${iso}`} onClick={() => onSelect(item)} className={`block w-full truncate border-l-4 px-1.5 py-1 text-left text-sm font-semibold ${item.kind === "booking" ? item.bookingCategory === "corporate" ? "border-[var(--admin-violet-border)] bg-[var(--admin-violet-bg)]" : "border-[var(--admin-success-border)] bg-[var(--admin-success-bg)]" : item.kind === "enquiry" ? "border-[var(--admin-warning-border)] bg-[var(--admin-warning-bg)]" : "border-[var(--admin-border)] bg-[var(--admin-surface-alt)]"}`}>{item.kind === "booking" ? `${item.bookingCategory === "corporate" ? "Corporate" : "Standard"} · ` : ""}{item.propertyLabel} · {item.title}</button>)}{matches.length > 3 && <p className="text-sm font-medium text-[var(--admin-muted)]">+{matches.length - 3} more</p>}</div></div>;
  })}</div></div>;
}

function ReservationDetail({ error, item, busy, onClose, updateBooking, updateEnquiryStatus, convertEnquiry, openCalendar }: { error: string; item: ReservationItem; busy: boolean; onClose: () => void; updateBooking: (id: string, changes: Row) => Promise<void>; updateEnquiryStatus: (enquiry: Row, status: string) => void; convertEnquiry: (enquiry: Row) => void; openCalendar: () => void }) {
  const { confirm } = useAdminWorkspace();
  const [bookingStatus, setBookingStatus] = useState(item.status);
  const [paymentStatus, setPaymentStatus] = useState(item.payment);
  const [internalNotes, setInternalNotes] = useState(String(item.raw.internal_notes ?? ""));
  const [reason, setReason] = useState("");
  const guest = asObject(item.raw.guest_details);
  const dirty = item.kind === "booking" && (bookingStatus !== String(item.raw.booking_status ?? item.status) || paymentStatus !== String(item.raw.payment_status ?? item.payment) || internalNotes !== String(item.raw.internal_notes ?? "") || Boolean(reason));
  useDirtyGuard(dirty);
  const requestClose = async () => { if (!busy && (!dirty || await confirm({ title: "Discard booking edits?", description: "Your unsaved status and notes changes will be lost.", confirmLabel: "Discard changes", destructive: true }))) onClose(); };
  return <AdminDialog label="Reservation details" drawer busy={busy} onClose={requestClose}><aside className="w-full p-5 sm:p-7"><div className="flex items-start justify-between gap-4 border-b border-[var(--admin-border)] pb-5"><div><p className="text-sm font-semibold text-[var(--admin-text)]">{cleanLabel(item.kind)}</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{item.reference}</h2></div><button type="button" className="admin-button min-h-10 px-3" onClick={requestClose} disabled={busy} aria-label="Close details"><X size={17} /></button></div>{error && <div className="admin-notice is-error mt-4" role="alert">{error}</div>}<dl className="grid grid-cols-2 border-b border-[var(--admin-border)] text-sm"><Detail label="Guest / event" value={item.title} /><Detail label="House" value={item.propertyLabel} /><Detail label="Check-in" value={formatDate(item.start)} /><Detail label="Checkout" value={formatDate(item.end)} /><Detail label="Type" value={item.bookingCategory ? `${item.bookingCategory === "corporate" ? "Corporate" : "Standard"} booking` : cleanLabel(item.type)} /><Detail label="Source" value={cleanLabel(item.source)} /></dl>{item.kind === "booking" && <div className="space-y-5 pt-6"><div className="grid gap-4 sm:grid-cols-2"><Field label="Booking status"><select className="admin-field" value={bookingStatus} onChange={(event) => setBookingStatus(event.target.value)}>{["pending_payment", "confirmed", "corporate", "cancelled", "checked_in", "checked_out", "expired"].map((value) => <option key={value} value={value}>{statusPresentation("source", value).label}</option>)}</select></Field><Field label="Payment status"><select className="admin-field" value={paymentStatus} disabled={Boolean(item.raw.stripe_checkout_session_id)} onChange={(event) => setPaymentStatus(event.target.value)}>{["pending", "paid", "failed", "refunded"].map((value) => <option key={value} value={value}>{statusPresentation("source", value).label}</option>)}</select>{Boolean(item.raw.stripe_checkout_session_id) && <small className="mt-1 block text-[var(--admin-muted)]">Managed by verified Stripe events. View details in Payments.</small>}</Field></div><Field label="Internal notes"><textarea className="admin-field min-h-28" maxLength={4000} value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} /></Field>{bookingStatus === "cancelled" && <Field label="Cancellation reason"><input className="admin-field" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required for the audit trail" /></Field>}<div className="border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 text-sm"><p className="font-semibold">{String(guest.firstName ?? guest.contactName ?? "Guest")}</p><p className="mt-1 text-[var(--admin-muted)]">{String(guest.email ?? "No email")} · {String(guest.phone ?? "No phone")}</p><p className="mt-3 text-sm text-[var(--admin-muted)]">{Number(item.raw.adults ?? 0)} adults · {Number(item.raw.children ?? 0)} children · {Number(item.raw.infants ?? 0)} infants · {Number(item.raw.pets ?? 0)} pets</p></div><button type="button" disabled={busy || (bookingStatus === "cancelled" && !reason && item.status !== "cancelled")} className="admin-button admin-button-primary w-full justify-center" onClick={() => void updateBooking(item.id, { bookingStatus, paymentStatus, internalNotes, cancellationReason: reason })}><Save size={16} /> Save booking</button></div>}{item.kind === "enquiry" && <div className="space-y-5 pt-6"><p className="text-sm leading-6 text-[var(--admin-text)]">{String(item.raw.notes ?? "No guest notes supplied.")}</p><Field label="Enquiry status"><select className="admin-field" value={item.status} onChange={(event) => updateEnquiryStatus(item.raw, event.target.value)}>{["new", "contacted", "pending_approval", "approved", "declined", "converted"].map((value) => <option key={value} value={value}>{statusPresentation("source", value).label}</option>)}</select></Field>{item.status === "approved" && <button type="button" className="admin-button admin-button-primary w-full justify-center" onClick={() => convertEnquiry(item.raw)}>Convert to bookings</button>}</div>}{item.kind === "block" && <div className="pt-6"><p className="text-sm leading-6 text-[var(--admin-text)]">{String(item.raw.internal_note ?? item.raw.summary ?? "Blocked dates")}</p><button type="button" className="admin-button admin-button-primary mt-5 w-full justify-center" onClick={openCalendar}>Manage this block</button></div>}</aside></AdminDialog>;
}

function ManualBookingForm({ error, manual, setManual, properties, busy, close, submit }: { error: string; manual: Record<string, string | boolean>; setManual: React.Dispatch<React.SetStateAction<{ propertyId: string; checkIn: string; checkout: string; contactName: string; email: string; phone: string; companyName: string; adults: string; children: string; infants: string; pets: string; corporate: boolean; paymentStatus: string; internalNotes: string }>>; properties: PropertyRow[]; busy: boolean; close: () => void; submit: (event: React.FormEvent) => Promise<void> }) {
  const { confirm } = useAdminWorkspace();
  const [baseline] = useState(() => JSON.stringify(manual));
  const dirty = JSON.stringify(manual) !== baseline;
  useDirtyGuard(dirty);
  const requestClose = async () => { if (!busy && (!dirty || await confirm({ title: "Discard manual booking?", description: "This reservation has not been created. Your entered details will be lost.", confirmLabel: "Discard details", destructive: true }))) close(); };
  const update = (key: string, value: string | boolean) => setManual((current) => ({ ...current, [key]: value }));
  return <AdminDialog label="New manual booking" drawer busy={busy} onClose={requestClose}><form onSubmit={submit} className="w-full p-5 sm:p-7"><div className="flex items-start justify-between border-b border-[var(--admin-border)] pb-5"><div><p className="text-sm font-semibold text-[var(--admin-text)]">Admin reservation</p><h2 className="mt-1 text-2xl font-semibold">New manual booking</h2></div><button type="button" className="admin-button min-h-10 px-3" onClick={requestClose} disabled={busy} aria-label="Close manual booking"><X size={17} /></button></div>{error && <div className="admin-notice is-error mt-4" role="alert">{error}</div>}<div className="grid gap-4 py-6 sm:grid-cols-2"><Field label="House"><select required className="admin-field" value={String(manual.propertyId)} onChange={(event) => update("propertyId", event.target.value)}>{properties.map((property) => <option key={String(property.id)} value={String(property.id)}>{String(property.name)}</option>)}</select></Field><label className="flex items-center gap-3 border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 text-sm font-semibold"><input type="checkbox" checked={Boolean(manual.corporate)} onChange={(event) => update("corporate", event.target.checked)} /> Corporate booking</label><Field label="Check-in"><input required className="admin-field" type="date" min={todayIso()} value={String(manual.checkIn)} onChange={(event) => update("checkIn", event.target.value)} /></Field><Field label="Checkout"><input required className="admin-field" type="date" min={String(manual.checkIn) ? addDays(String(manual.checkIn), 1) : todayIso()} value={String(manual.checkout)} onChange={(event) => update("checkout", event.target.value)} /></Field><Field label="Guest / contact name"><input required className="admin-field" value={String(manual.contactName)} onChange={(event) => update("contactName", event.target.value)} /></Field><Field label="Email"><input required type="email" className="admin-field" value={String(manual.email)} onChange={(event) => update("email", event.target.value)} /></Field><Field label="Phone"><input className="admin-field" value={String(manual.phone)} onChange={(event) => update("phone", event.target.value)} /></Field><Field label="Company (optional)"><input className="admin-field" value={String(manual.companyName)} onChange={(event) => update("companyName", event.target.value)} /></Field>{["adults", "children", "infants", "pets"].map((key) => <Field key={key} label={key}><input className="admin-field" type="number" min={key === "adults" ? 1 : 0} value={String(manual[key])} onChange={(event) => update(key, event.target.value)} /></Field>)}<Field label="Payment status"><select className="admin-field" value={String(manual.paymentStatus)} onChange={(event) => update("paymentStatus", event.target.value)}><option value="pending">Pending</option><option value="paid">Paid</option></select></Field></div><Field label="Internal notes"><textarea className="admin-field min-h-28" maxLength={4000} value={String(manual.internalNotes)} onChange={(event) => update("internalNotes", event.target.value)} /></Field><div className="mt-6 flex gap-3 border-t border-[var(--admin-border)] pt-5"><button type="submit" className="admin-button admin-button-primary flex-1 justify-center" disabled={busy}><Save size={16} />{busy ? "Saving…" : "Create booking"}</button><button type="button" className="admin-button" onClick={requestClose} disabled={busy}>Cancel</button></div></form></AdminDialog>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-[var(--admin-text)]">{label}<span className="mt-1.5 block normal-case tracking-normal">{children}</span></label>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="border-b border-r border-[var(--admin-border)] p-4"><dt className="text-sm font-semibold text-[var(--admin-muted)]">{label}</dt><dd className="mt-1 font-medium text-[var(--admin-text)]">{value}</dd></div>; }
