"use client";

import { addDays, formatAud, todayIso } from "@/src/lib/booking";
import { isWithinFreeCancellation } from "@/src/lib/cancellationPolicy";
import { isAppManagedBookingSource } from "@/src/lib/booking-source";
import { AdminDialog, useAdminWorkspace, useDirtyGuard } from "@/src/components/admin/AdminUI";
import type { Row } from "@/src/components/admin/AdminModels";
import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert, LockKeyhole, LockKeyholeOpen, Plus, RefreshCw, Save, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type CalendarAction = "booking" | null;
type Selection = { propertyId: string; date: string };
type BlockRange = { propertyId: string; startDate: string; endDate: string };
type DayStatus = { kind: "available" | "booking" | "manual" | "external" | "unavailable"; label: string; record?: Row };

const activeBookingStatuses = new Set(["pending_payment", "confirmed", "corporate", "checked_in"]);
const blockReasons = [
  ["other", "Unavailable"],
  ["maintenance", "Maintenance"], ["owner_use", "Owner use"], ["cleaning", "Cleaning"],
  ["preparation", "Preparation"], ["renovation", "Renovation"],
  ["private_booking", "Private booking"],
] as const;

const displayDate = (date: string) => new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
const monthLabel = (month: string) => new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
const shiftMonth = (month: string, amount: number) => {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
};
const blockDateKey = ({ propertyId, date }: Selection) => `${propertyId}:${date}`;
function groupBlockDates(selections: Selection[]): BlockRange[] {
  const sorted = [...selections].sort((a, b) => a.propertyId.localeCompare(b.propertyId) || a.date.localeCompare(b.date));
  const ranges: BlockRange[] = [];
  for (const selected of sorted) {
    const last = ranges.at(-1);
    if (last?.propertyId === selected.propertyId && last.endDate === selected.date) last.endDate = addDays(selected.date, 1);
    else ranges.push({ propertyId: selected.propertyId, startDate: selected.date, endDate: addDays(selected.date, 1) });
  }
  return ranges;
}

function getDayStatus(property: Row, date: string, bookings: Row[], events: Row[]): DayStatus {
  const booking = bookings.find((item) => item.property_id === property.id && activeBookingStatuses.has(String(item.booking_status)) && item.check_in <= date && item.checkout > date);
  if (booking) return { kind: "booking", label: !isAppManagedBookingSource(booking.booking_source) ? `${String(booking.booking_source ?? "External")} reservation` : booking.booking_source === "admin" ? "Manual booking" : booking.booking_type === "corporate" ? "Corporate booking" : "Booked", record: booking };
  const event = events.find((item) => item.property_id === property.id && item.status === "active" && item.is_blocking === true && item.start_date <= date && item.end_date > date);
  if (event) {
    const manual = event.source_platform === "direct" && !event.connection_id && !String(event.external_event_id ?? "").startsWith("ical-upload:");
    const source = String(event.source_platform ?? "external");
    const sourceLabel = source === "direct" ? "Uploaded calendar" : source === "airbnb" ? "Airbnb" : source === "vrbo" ? "Vrbo" : source === "stayz" ? "Stayz" : "External calendar";
    return { kind: manual ? "manual" : "external", label: manual ? String(event.summary ?? "Manual block") : sourceLabel, record: event };
  }
  if (Array.isArray(property.unavailable_dates) && property.unavailable_dates.includes(date)) return { kind: "unavailable", label: "Unavailable" };
  return { kind: "available", label: "Available" };
}

function nightlyRate(property: Row, date: string): { amount: number; override: boolean } {
  const rate = Array.isArray(property.date_prices) ? property.date_prices.find((item: Row) => item.price_date === date && item.is_active !== false) : undefined;
  return { amount: Number(rate?.nightly_price ?? property.nightly_price ?? 0), override: Boolean(rate) };
}

async function jsonRequest(url: string, options: RequestInit) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "The calendar change could not be saved.");
  return body;
}

export function AdminAvailabilityCalendar({ properties, bookings, calendarEvents, reload, startBlockSelection = false }: { properties: Row[]; bookings: Row[]; calendarEvents: Row[]; reload: () => Promise<void>; startBlockSelection?: boolean }) {
  const { confirm } = useAdminWorkspace();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [month, setMonth] = useState(() => todayIso().slice(0, 7));
  const [selection, setSelection] = useState<Selection | null>(null);
  const [blockPicking, setBlockPicking] = useState(startBlockSelection);
  const [selectedBlockDates, setSelectedBlockDates] = useState<Selection[]>([]);
  const [rangeAnchor, setRangeAnchor] = useState<Selection | null>(null);
  const [unblockPicking, setUnblockPicking] = useState(false);
  const [selectedUnblockDates, setSelectedUnblockDates] = useState<Selection[]>([]);
  const [unblockRangeAnchor, setUnblockRangeAnchor] = useState<Selection | null>(null);
  const [pickerError, setPickerError] = useState("");
  const [action, setAction] = useState<CalendarAction>(null);
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("other");
  const [note, setNote] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [corporate, setCorporate] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [bookingEditorDirty, setBookingEditorDirty] = useState(false);
  useDirtyGuard(selectedBlockDates.length > 0 || selectedUnblockDates.length > 0);
  const houses = useMemo(() => properties.filter((property) => property.slug && property.published !== false), [properties]);
  const monthStart = new Date(`${month}-01T00:00:00Z`);
  const numberOfDays = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
  const dates = Array.from({ length: numberOfDays }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
  const today = todayIso();
  const centerToday = useCallback(() => {
    const scroller = scrollRef.current;
    const heading = scroller?.querySelector<HTMLElement>(`[data-calendar-date="${today}"]`);
    if (!scroller || !heading) return;
    const pinnedWidth = scroller.querySelector<HTMLElement>(".admin-availability-corner")?.getBoundingClientRect().width ?? 0;
    const headingLeft = heading.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
    const visibleDateWidth = Math.max(0, scroller.clientWidth - pinnedWidth);
    scroller.scrollLeft = Math.max(0, headingLeft - pinnedWidth - (visibleDateWidth - heading.getBoundingClientRect().width) / 2);
  }, [today]);
  useLayoutEffect(() => {
    if (month === today.slice(0, 7) && houses.length) centerToday();
  }, [month, today, houses.length, centerToday]);
  const firstOpenDate = (() => {
    for (let offset = 0; offset < 366; offset++) {
      const date = addDays(today, offset);
      const property = houses.find((house) => getDayStatus(house, date, bookings, calendarEvents).kind === "available");
      if (property) return { propertyId: String(property.id), date };
    }
    return null;
  })();
  const selectedProperty = houses.find((property) => property.id === selection?.propertyId);
  const selectedStatus = selection && selectedProperty ? getDayStatus(selectedProperty, selection.date, bookings, calendarEvents) : null;
  const selectedRate = selection && selectedProperty ? nightlyRate(selectedProperty, selection.date) : null;
  const counts = { available: 0, booked: 0, blocked: 0 };
  for (const property of houses) for (const date of dates) {
    const kind = getDayStatus(property, date, bookings, calendarEvents).kind;
    if (kind === "available") counts.available++;
    else if (kind === "booking") counts.booked++;
    else counts.blocked++;
  }

  const openDate = (propertyId: string, date: string, nextAction: CalendarAction = null) => {
    const property = houses.find((house) => house.id === propertyId);
    const available = property && date >= today && getDayStatus(property, date, bookings, calendarEvents).kind === "available";
    const resolvedAction = available ? nextAction ?? "booking" : null;
    setSelection({ propertyId, date });
    setAction(resolvedAction);
    setEndDate(addDays(date, resolvedAction === "booking" ? Math.max(1, Number(property?.minimum_stay ?? 1)) : 1));
    setReason("other"); setNote(""); setContactName(""); setEmail(""); setPhone(""); setAdults(1); setChildren(0); setInfants(0); setPets(0); setCompanyName(""); setCorporate(false); setPartnerId("");
    setError(""); setNotice("");
    setBookingEditorDirty(false);
  };
  const closeSelection = async () => {
    if (busy) return;
    if (bookingEditorDirty && !await confirm({ title: "Discard booking edits?", description: "Your unsaved booking changes will be lost.", confirmLabel: "Discard changes", destructive: true })) return;
    setSelection(null); setAction(null); setError(""); setBookingEditorDirty(false);
  };
  const updateBooking = async (bookingId: string, changes: Row) => {
    setBusy(true); setError("");
    try {
      const result = await jsonRequest(`/api/admin/bookings/${encodeURIComponent(bookingId)}`, { method: "PATCH", body: JSON.stringify(changes) });
      setBookingEditorDirty(false);
      setSelection(null); setAction(null);
      setNotice(result.refund ? `Booking cancelled. Stripe ${result.refund.status === "succeeded" ? "refunded" : "started a refund of"} ${formatAud(result.refund.amount / 100)} for this house${result.refund.status === "succeeded" ? "." : ` (status: ${result.refund.status}).`}` : changes.paymentStatus === "paid" ? "Offline payment recorded. No Stripe charge was made." : "Booking updated.");
      await reload();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not update the booking."); }
    finally { setBusy(false); }
  };
  const toggleBlockPicking = () => {
    setUnblockPicking(false);
    setBlockPicking((current) => !current);
    setRangeAnchor(null); setPickerError(""); setError(""); setNotice("");
    setSelection(null); setAction(null);
  };
  const toggleUnblockPicking = () => {
    setBlockPicking(false);
    setUnblockPicking((current) => !current);
    setUnblockRangeAnchor(null); setPickerError(""); setError(""); setNotice("");
    setSelection(null); setAction(null);
  };
  const pickBlockDate = (propertyId: string, date: string, extendRange: boolean) => {
    const property = houses.find((house) => house.id === propertyId);
    if (!property || date < today || getDayStatus(property, date, bookings, calendarEvents).kind !== "available") {
      setPickerError("Choose an available future date to block.");
      return;
    }
    const anchor = extendRange ? rangeAnchor ?? selectedBlockDates.at(-1) : null;
    if (anchor) {
      if (anchor.propertyId !== propertyId) { setPickerError("Choose the last night on the same house as the range start."); return; }
      const startDate = anchor.date < date ? anchor.date : date;
      const endDate = anchor.date < date ? date : anchor.date;
      if (addDays(endDate, 1) > addDays(startDate, 365)) { setPickerError("Select a range of 365 nights or fewer."); return; }
      const added: Selection[] = [];
      for (let night = startDate; night <= endDate; night = addDays(night, 1)) {
        if (getDayStatus(property, night, bookings, calendarEvents).kind !== "available") { setPickerError(`${displayDate(night)} is already unavailable. Choose another range.`); return; }
        added.push({ propertyId, date: night });
      }
      setSelectedBlockDates((current) => {
        const selected = new Map(current.map((item) => [blockDateKey(item), item]));
        for (const item of added) selected.set(blockDateKey(item), item);
        return [...selected.values()];
      });
      setRangeAnchor(null);
    } else {
      const chosen = { propertyId, date };
      setSelectedBlockDates((current) => current.some((item) => blockDateKey(item) === blockDateKey(chosen)) ? current.filter((item) => blockDateKey(item) !== blockDateKey(chosen)) : [...current, chosen]);
    }
    setPickerError("");
  };
  const pickUnblockDate = (propertyId: string, date: string, extendRange: boolean) => {
    const property = houses.find((house) => String(house.id) === propertyId);
    const chosen = { propertyId, date };
    if (!property || getDayStatus(property, date, bookings, calendarEvents).kind !== "manual") {
      setPickerError("Choose a manually blocked night to unblock. Bookings and imported dates cannot be changed here.");
      return;
    }
    const anchor = extendRange ? unblockRangeAnchor ?? selectedUnblockDates.at(-1) : null;
    if (anchor) {
      if (anchor.propertyId !== propertyId) { setPickerError("Choose the last night on the same house as the range start."); return; }
      const startDate = anchor.date < date ? anchor.date : date;
      const endDate = anchor.date < date ? date : anchor.date;
      if (addDays(endDate, 1) > addDays(startDate, 365)) { setPickerError("Select a range of 365 nights or fewer."); return; }
      const added: Selection[] = [];
      for (let night = startDate; night <= endDate; night = addDays(night, 1)) {
        if (getDayStatus(property, night, bookings, calendarEvents).kind !== "manual") { setPickerError(`${displayDate(night)} is not manually blocked. Choose another range.`); return; }
        added.push({ propertyId, date: night });
      }
      setSelectedUnblockDates((current) => {
        const selected = new Map(current.map((item) => [blockDateKey(item), item]));
        for (const item of added) selected.set(blockDateKey(item), item);
        return [...selected.values()];
      });
      setUnblockRangeAnchor(null);
    } else {
      setSelectedUnblockDates((current) => current.some((item) => blockDateKey(item) === blockDateKey(chosen)) ? current.filter((item) => blockDateKey(item) !== blockDateKey(chosen)) : [...current, chosen]);
    }
    setPickerError("");
  };
  const selectedBlockKeys = new Set(selectedBlockDates.map(blockDateKey));
  const selectedBlockRanges = groupBlockDates(selectedBlockDates);
  const selectedBlockHouseCount = new Set(selectedBlockDates.map((item) => item.propertyId)).size;
  const selectedUnblockKeys = new Set(selectedUnblockDates.map(blockDateKey));
  const selectedUnblockRanges = groupBlockDates(selectedUnblockDates);
  const selectedUnblockHouseCount = new Set(selectedUnblockDates.map((item) => item.propertyId)).size;
  const blockConflictDate = selectedBlockDates.find(({ propertyId, date }) => {
    const property = houses.find((house) => String(house.id) === propertyId);
    return !property || date < today || getDayStatus(property, date, bookings, calendarEvents).kind !== "available";
  })?.date ?? "";
  const unblockConflictDate = selectedUnblockDates.find(({ propertyId, date }) => {
    const property = houses.find((house) => String(house.id) === propertyId);
    return !property || getDayStatus(property, date, bookings, calendarEvents).kind !== "manual";
  })?.date ?? "";
  const minimumBookingNights = Math.max(corporate ? 2 : 1, corporate ? Number(selectedProperty?.minimum_corporate_stay ?? 2) : Number(selectedProperty?.minimum_stay ?? 1));
  const minimumCheckout = selection ? addDays(selection.date, minimumBookingNights) : "";
  let rangeConflictDate = "";
  if (selection && selectedProperty && endDate > selection.date) {
    for (let date = selection.date, nights = 0; date < endDate && nights < 366; date = addDays(date, 1), nights++) {
      if (getDayStatus(selectedProperty, date, bookings, calendarEvents).kind !== "available") { rangeConflictDate = date; break; }
    }
  }

  const saveBlock = async () => {
    if (!selectedBlockDates.length || busy) return;
    setBusy(true); setError("");
    try {
      if (blockConflictDate) throw new Error(`${displayDate(blockConflictDate)} is already unavailable. Choose another range.`);
      await jsonRequest("/api/admin/calendar/blocks", { method: "POST", body: JSON.stringify({ ranges: selectedBlockRanges, blockReason: reason, internalNote: note }) });
      setBlockPicking(false); setSelectedBlockDates([]); setRangeAnchor(null); setPickerError(""); setReason("other"); setNote("");
      setNotice(`${selectedBlockDates.length} ${selectedBlockDates.length === 1 ? "night" : "nights"} blocked. They are unavailable for new bookings and included in calendar exports.`);
      await reload();
    } catch (failure) { setPickerError(failure instanceof Error ? failure.message : "Could not block dates."); }
    finally { setBusy(false); }
  };

  const saveUnblockDates = async () => {
    if (!selectedUnblockDates.length || busy) return;
    setBusy(true); setPickerError("");
    try {
      if (unblockConflictDate) throw new Error(`${displayDate(unblockConflictDate)} is no longer manually blocked. Remove it from the selection.`);
      const response = await fetch("/api/admin/calendar/blocks/unblock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dates: selectedUnblockDates }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (Array.isArray(result.completedDates) && result.completedDates.length) {
          const completed = new Set((result.completedDates as Selection[]).map(blockDateKey));
          setSelectedUnblockDates((current) => current.filter((item) => !completed.has(blockDateKey(item))));
          setUnblockRangeAnchor(null);
          await reload();
        }
        throw new Error(result.error || "Could not unblock the selected dates.");
      }
      const count = selectedUnblockDates.length;
      setSelectedUnblockDates([]); setUnblockRangeAnchor(null); setUnblockPicking(false);
      setNotice(`${count} manually blocked ${count === 1 ? "night" : "nights"} unblocked. Other reservations or imported calendars may still make a date unavailable.`);
      await reload();
    } catch (failure) { setPickerError(failure instanceof Error ? failure.message : "Could not unblock dates."); }
    finally { setBusy(false); }
  };

  const saveBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selection) return;
    if (corporate && !partnerId.trim()) { setError("Enter the Partner ID for this corporate reservation."); return; }
    setBusy(true); setError("");
    try {
      if (rangeConflictDate) throw new Error(`${displayDate(rangeConflictDate)} is already unavailable. Choose a shorter stay or another house.`);
      const result = await jsonRequest("/api/admin/bookings", { method: "POST", body: JSON.stringify({ propertyId: selection.propertyId, checkIn: selection.date, checkout: endDate, contactName, email, phone, companyName, corporate, partnerId: corporate ? partnerId.trim().toUpperCase() : undefined, guests: { adults, children, infants, pets }, paymentStatus: "pending", internalNotes: note }) });
      setSelection(null); setAction(null); setNotice(`Manual booking ${result.booking?.reference ?? ""} created. Dates are now reserved; payment is still pending.`);
      await reload();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not create the booking."); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5">
    <header className="admin-page-header flex flex-wrap items-end justify-between gap-4">
      <div><p className="admin-eyebrow">Availability / daily operations</p><h2 className="admin-page-title">Calendar</h2><p className="admin-page-description">Nightly prices and availability across all homes. Select blocked nights to unblock several at once.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="admin-button inline-flex items-center gap-2" onClick={() => void reload()}><RefreshCw size={16} /> Refresh</button>
        {firstOpenDate && <button type="button" className={`admin-button inline-flex items-center gap-2 ${blockPicking ? "admin-button-primary" : ""}`} aria-pressed={blockPicking} aria-label={blockPicking ? "Exit block date selection" : "Block dates"} onClick={toggleBlockPicking}><LockKeyhole size={16} /> Block dates</button>}
        {houses.length > 0 && <button type="button" className={`admin-button inline-flex items-center gap-2 ${unblockPicking ? "admin-button-primary" : ""}`} aria-pressed={unblockPicking} aria-label={unblockPicking ? "Exit unblock date selection" : "Unblock dates"} onClick={toggleUnblockPicking}><LockKeyholeOpen size={16} /> Unblock dates</button>}
        {firstOpenDate && <button type="button" className="admin-button admin-button-primary inline-flex items-center gap-2" onClick={() => { setMonth(firstOpenDate.date.slice(0, 7)); setBlockPicking(false); setUnblockPicking(false); setRangeAnchor(null); setUnblockRangeAnchor(null); openDate(firstOpenDate.propertyId, firstOpenDate.date, "booking"); }}><Plus size={16} /> Manual booking</button>}
      </div>
    </header>
    {!houses.length ? <div className="admin-card p-8 text-sm text-[var(--admin-muted)]">No published houses are available to show on the calendar.</div> : <>
      <div className="admin-availability-summary"><div><span>Available nights</span><strong>{counts.available}</strong></div><div><span>Booked nights</span><strong>{counts.booked}</strong></div><div><span>Blocked nights</span><strong>{counts.blocked}</strong></div><p>Across {houses.length} {houses.length === 1 ? "house" : "houses"} in {monthLabel(month)}. Prices are nightly rates before fees and tax.</p></div>
      <section className="admin-card overflow-hidden" aria-label="House availability calendar">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><CalendarDays size={20} className="text-[var(--admin-accent)]" aria-hidden="true" /><div><h3 className="text-lg font-semibold">{monthLabel(month)}</h3><p className="text-xs text-[var(--admin-muted)]">Scroll sideways to see every date</p></div></div><div className="flex items-center gap-2"><button type="button" className="admin-button min-h-10 px-3" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><ChevronLeft size={17} /></button><button type="button" className="admin-button min-h-10 px-3 text-sm" onClick={() => { if (month === today.slice(0, 7)) centerToday(); else setMonth(today.slice(0, 7)); }}>Today</button><button type="button" className="admin-button min-h-10 px-3" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month"><ChevronRight size={17} /></button></div></div>
        <div className="admin-availability-scroll" ref={scrollRef}><div className="admin-availability-grid" style={{ gridTemplateColumns: `190px repeat(${dates.length}, minmax(100px, 1fr))` }}>
          <div className="admin-availability-corner">Homes <span>· AUD / night</span></div>
          {dates.map((date) => <div key={date} data-calendar-date={date} className={`admin-availability-day-heading ${date === today ? "is-today" : ""}`}><span>{new Intl.DateTimeFormat("en-AU", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))}</span><strong>{Number(date.slice(-2))}</strong></div>)}
          {houses.map((property) => <div className="admin-availability-row" key={property.id} style={{ display: "contents" }}><div className="admin-availability-house"><strong>{String(property.name).replace(/\s+-\s+Whole$/, "")}</strong><span>Base {formatAud(Number(property.nightly_price ?? 0))}</span></div>{dates.map((date) => {
            const status = getDayStatus(property, date, bookings, calendarEvents);
            const rate = nightlyRate(property, date);
            const key = blockDateKey({ propertyId: String(property.id), date });
            const selectedForBlock = blockPicking && selectedBlockKeys.has(key);
            const selectedForUnblock = unblockPicking && selectedUnblockKeys.has(key);
            return <button type="button" key={`${property.id}:${date}`} className={`admin-availability-cell is-${status.kind} ${date === today ? "is-today" : ""} ${blockPicking ? "is-picking" : ""} ${unblockPicking ? "is-unblock-picking" : ""} ${selectedForBlock ? "is-range-preview" : ""} ${selectedForUnblock ? "is-unblock-selection" : ""}`} onClick={(event) => {
              const propertyId = String(property.id);
              if (unblockPicking) pickUnblockDate(propertyId, date, event.shiftKey || Boolean(unblockRangeAnchor));
              else if (blockPicking) pickBlockDate(propertyId, date, event.shiftKey || Boolean(rangeAnchor));
              else if (status.kind === "manual") { setUnblockPicking(true); setSelectedUnblockDates((current) => current.some((item) => blockDateKey(item) === key) ? current : [...current, { propertyId, date }]); setUnblockRangeAnchor(null); setPickerError(""); setSelection(null); }
              else openDate(propertyId, date);
            }} aria-label={`${property.name}, ${displayDate(date)}: ${formatAud(rate.amount)} per night, ${status.label}${rate.override ? ", custom rate" : ""}${unblockPicking ? selectedForUnblock ? ", selected for unblocking" : ", select for unblocking" : blockPicking ? selectedForBlock ? ", selected for blocking" : ", select for blocking" : status.kind === "manual" ? ", select to unblock" : ""}`} aria-pressed={selectedForBlock || selectedForUnblock} title={`${property.name} · ${displayDate(date)} · ${formatAud(rate.amount)} · ${status.label}`}><strong>{formatAud(rate.amount)}</strong><span>{selectedForBlock ? "Selected for block" : selectedForUnblock ? "Selected to unblock" : status.label}</span>{rate.override && <small>Custom rate</small>}</button>;
          })}</div>)}
        </div></div>
        <div className="admin-availability-legend"><span><i className="is-available" /> Available</span><span><i className="is-booking" /> Booked</span><span><i className="is-external" /> Imported calendar</span><span><i className="is-manual" /> Manual block</span><span>{unblockPicking ? "Click manual blocks to add or remove them" : blockPicking ? "Click available dates to add or remove them" : "Click a manual block to select it for unblocking"}</span></div>
      </section>
    </>}
    {notice && <div className="admin-notice is-success" role="status">{notice}</div>}
    {blockPicking && <div className="admin-availability-pick-guide"><LockKeyhole size={18} aria-hidden="true" /><div><strong>{selectedBlockDates.length ? `${selectedBlockDates.length} ${selectedBlockDates.length === 1 ? "night" : "nights"} selected across ${selectedBlockHouseCount} ${selectedBlockHouseCount === 1 ? "house" : "houses"}` : "Choose dates to block"}</strong><p>{rangeAnchor ? `Choose the last night for the range starting ${displayDate(rangeAnchor.date)}.` : "Click available nights to add or remove them. Shift-click to select a range, or use Select range end. You can change months and houses before saving."}</p></div>{selectedBlockDates.length > 0 && <div className="flex flex-wrap gap-2"><button type="button" className="admin-button" onClick={() => { setRangeAnchor(rangeAnchor ? null : selectedBlockDates.at(-1) ?? null); setPickerError(""); }}>{rangeAnchor ? "Cancel range" : "Select range end"}</button><button type="button" className="admin-button" onClick={() => { setSelectedBlockDates([]); setRangeAnchor(null); setPickerError(""); }}>Clear all</button></div>}</div>}
    {blockPicking && selectedBlockDates.length > 0 && <div className="admin-availability-block-controls"><div className="admin-availability-block-main"><div className="admin-availability-block-fields"><label>Reason<select className="admin-field" value={reason} onChange={(event) => setReason(event.target.value)}>{blockReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Private note <span>(optional)</span><input className="admin-field" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Only admins can see this" /></label></div><div className="admin-availability-block-list" aria-label="Selected date ranges">{selectedBlockRanges.map((range) => { const name = String(houses.find((house) => String(house.id) === range.propertyId)?.name ?? "House"); const lastNight = addDays(range.endDate, -1); return <div key={`${range.propertyId}:${range.startDate}`}><span>{name} · {displayDate(range.startDate)}{lastNight !== range.startDate ? ` – ${displayDate(lastNight)}` : ""}</span><button type="button" aria-label={`Remove ${name} from ${displayDate(range.startDate)} to ${displayDate(lastNight)}`} onClick={() => { setSelectedBlockDates((current) => current.filter((item) => item.propertyId !== range.propertyId || item.date < range.startDate || item.date >= range.endDate)); setRangeAnchor(null); setPickerError(""); }}><X size={14} /></button></div>; })}</div></div><button type="button" className="admin-button admin-button-primary inline-flex items-center justify-center gap-2" disabled={busy || Boolean(blockConflictDate) || Boolean(pickerError) || Boolean(rangeAnchor) || selectedBlockRanges.length > 100} onClick={() => void saveBlock()}><Save size={16} /> {busy ? "Saving…" : `Save ${selectedBlockDates.length} ${selectedBlockDates.length === 1 ? "night" : "nights"}`}</button></div>}
    {blockPicking && selectedBlockRanges.length > 100 && <div className="admin-notice is-error" role="alert">Select 100 separate ranges or fewer before saving.</div>}
    {blockPicking && blockConflictDate && <div className="admin-notice is-error" role="alert">{displayDate(blockConflictDate)} is already unavailable. Remove it from the selection before saving.</div>}
    {unblockPicking && <div className="admin-availability-pick-guide"><LockKeyholeOpen size={18} aria-hidden="true" /><div><strong>{selectedUnblockDates.length ? `${selectedUnblockDates.length} ${selectedUnblockDates.length === 1 ? "night" : "nights"} selected across ${selectedUnblockHouseCount} ${selectedUnblockHouseCount === 1 ? "house" : "houses"}` : "Choose dates to unblock"}</strong><p>{unblockRangeAnchor ? `Choose the last night for the range starting ${displayDate(unblockRangeAnchor.date)}.` : "Click manually blocked nights to add or remove them. Shift-click to select a range, or use Select range end. You can change months and houses before saving."}</p></div>{selectedUnblockDates.length > 0 && <div className="flex flex-wrap gap-2"><button type="button" className="admin-button" onClick={() => { setUnblockRangeAnchor(unblockRangeAnchor ? null : selectedUnblockDates.at(-1) ?? null); setPickerError(""); }}>{unblockRangeAnchor ? "Cancel range" : "Select range end"}</button><button type="button" className="admin-button" onClick={() => { setSelectedUnblockDates([]); setUnblockRangeAnchor(null); setPickerError(""); }}>Clear all</button></div>}</div>}
    {unblockPicking && selectedUnblockDates.length > 0 && <div className="admin-availability-block-controls"><div className="admin-availability-block-main"><p className="text-xs text-[var(--admin-muted)]">Only the selected manual blocks will be removed.</p><div className="admin-availability-block-list" aria-label="Dates selected for unblocking">{selectedUnblockRanges.map((range) => { const name = String(houses.find((house) => String(house.id) === range.propertyId)?.name ?? "House"); const lastNight = addDays(range.endDate, -1); return <div key={`${range.propertyId}:${range.startDate}`}><span>{name} · {displayDate(range.startDate)}{lastNight !== range.startDate ? ` – ${displayDate(lastNight)}` : ""}</span><button type="button" aria-label={`Remove ${name} from ${displayDate(range.startDate)} to ${displayDate(lastNight)} from selection`} onClick={() => { setSelectedUnblockDates((current) => current.filter((item) => item.propertyId !== range.propertyId || item.date < range.startDate || item.date >= range.endDate)); setUnblockRangeAnchor(null); setPickerError(""); }}><X size={14} /></button></div>; })}</div></div><button type="button" className="admin-button admin-button-primary inline-flex items-center justify-center gap-2" disabled={busy || Boolean(unblockConflictDate) || Boolean(unblockRangeAnchor) || selectedUnblockDates.length > 500} onClick={() => void saveUnblockDates()}><Save size={16} /> {busy ? "Saving…" : `Save ${selectedUnblockDates.length} ${selectedUnblockDates.length === 1 ? "night" : "nights"}`}</button></div>}
    {unblockPicking && selectedUnblockDates.length > 500 && <div className="admin-notice is-error" role="alert">Select 500 nights or fewer before saving.</div>}
    {unblockPicking && unblockConflictDate && <div className="admin-notice is-error" role="alert">{displayDate(unblockConflictDate)} is no longer manually blocked. Remove it from the selection before saving.</div>}
    {pickerError && <div className="admin-notice is-error" role="alert">{pickerError}</div>}
    {selection && selectedProperty && <AdminDialog drawer className="admin-calendar-dialog" label={`${selectedProperty.name} on ${displayDate(selection.date)}`} busy={busy} onClose={() => void closeSelection()}><div className="admin-calendar-panel">
      <header className="admin-calendar-panel-header"><div><p className="admin-calendar-panel-kicker">{action === "booking" ? "New reservation" : "Calendar date"}</p><h3>{action === "booking" ? "Manual booking" : displayDate(selection.date)}</h3><p>{selectedProperty.name} · {displayDate(selection.date)}</p></div><button type="button" className="admin-icon-button" aria-label="Close date details" onClick={() => void closeSelection()} disabled={busy}><X size={18} /></button></header>
      <div className="admin-calendar-rate-strip"><span className={`admin-calendar-status is-${selectedStatus?.kind ?? "available"}`}>{selectedStatus?.label}</span><span>{selectedRate ? formatAud(selectedRate.amount) : "—"} <small>per night</small>{selectedRate?.override ? " · custom rate" : ""}</span></div>
      <section className="admin-calendar-section" aria-label="House and starting date"><div className="admin-calendar-section-heading"><span className="admin-calendar-step">01</span><div><h4>House &amp; date</h4><p>Choose the house and first night.</p></div></div><div className="admin-calendar-fields"><label>House<select className="admin-field" value={selection.propertyId} disabled={bookingEditorDirty} onChange={(event) => openDate(event.target.value, selection.date, action)}>{houses.map((house) => <option key={house.id} value={house.id}>{house.name}</option>)}</select></label><label>{action === "booking" ? "Check-in" : "Date"}<input className="admin-field" type="date" value={selection.date} disabled={bookingEditorDirty} onChange={(event) => { if (event.target.value) { setMonth(event.target.value.slice(0, 7)); openDate(selection.propertyId, event.target.value, action); } }} /></label></div></section>
      {error && <div className="admin-notice is-error" role="alert"><CircleAlert size={16} />{error}</div>}
      {selectedStatus?.record && <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4 text-sm"><p className="font-semibold">{selectedStatus.label}</p><p className="mt-1 text-[var(--admin-muted)]">{selectedStatus.kind === "booking" ? `Booking ${String(selectedStatus.record.reference ?? "")}` : `${selectedStatus.record.start_date} to ${selectedStatus.record.end_date} (checkout-style end date)`}</p></div>}
      {selectedStatus?.kind === "booking" && selectedStatus.record ? isAppManagedBookingSource(selectedStatus.record.booking_source) ? <CalendarBookingEditor key={String(selectedStatus.record.id)} booking={selectedStatus.record} busy={busy} onDirtyChange={setBookingEditorDirty} onSave={updateBooking} /> : <p className="text-sm text-[var(--admin-muted)]">Read-only reservation from {String(selectedStatus.record.booking_source)}. Change or cancel it on the original platform; this booking record cannot be edited here.</p> : selectedStatus?.kind === "external" ? <p className="text-sm text-[var(--admin-muted)]">Read-only imported reservation. {selectedStatus.record?.source_platform === "direct" ? "Change the source calendar and upload it again." : "Change or cancel it on the original platform; the dates will update after the next sync."}</p> : selectedStatus?.kind === "manual" ? <p className="text-sm text-[var(--admin-muted)]">Use Unblock dates on the calendar to select one or more nights.</p> : selectedStatus?.kind !== "available" ? <p className="text-sm text-[var(--admin-muted)]">This date is unavailable.</p> : selection.date < today ? <p className="text-sm text-[var(--admin-muted)]">Past dates cannot start a new booking or block here.</p> : <>
        {action === "booking" && <form className="admin-calendar-form" onSubmit={(event) => void saveBooking(event)}>
          <section className="admin-calendar-section">
            <div className="admin-calendar-section-heading"><span className="admin-calendar-step">02</span><div><h4>Stay details</h4><p>Check-in is {displayDate(selection.date)}.</p></div></div>
            <div className="admin-calendar-fields">
              <label>Checkout<input className="admin-field" type="date" min={minimumCheckout} value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></label>
              <label className="admin-calendar-checkbox"><input type="checkbox" checked={corporate} onChange={(event) => { const next = event.target.checked; setCorporate(next); const nights = Math.max(next ? 2 : 1, next ? Number(selectedProperty.minimum_corporate_stay ?? 2) : Number(selectedProperty.minimum_stay ?? 1)); const earliest = addDays(selection.date, nights); if (endDate < earliest) setEndDate(earliest); }} disabled={selectedProperty.corporate_booking_allowed === false} /><span><strong>Corporate reservation</strong><small>{selectedProperty.corporate_booking_allowed === false ? "Unavailable for this house" : "Book this stay for a company"}</small></span></label>
            </div>
            {corporate && <label className="admin-calendar-full-field">Partner ID <span className="admin-calendar-optional">required for corporate reservations</span><input className="admin-field" value={partnerId} onChange={(event) => setPartnerId(event.target.value.toUpperCase())} placeholder="SER-XXXXXXXXXXXX" maxLength={24} autoCapitalize="characters" spellCheck={false} required /><small className="admin-calendar-optional">The company name is taken from the active Partner ID.</small></label>}
          </section>
          <section className="admin-calendar-section"><div className="admin-calendar-section-heading"><span className="admin-calendar-step">03</span><div><h4>Guest contact</h4><p>Details for the reservation record.</p></div></div><div className="admin-calendar-fields"><label>Guest / contact name<input className="admin-field" value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="e.g. Jordan Lee" autoComplete="name" required /></label><label>Email address<input className="admin-field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="guest@example.com" autoComplete="email" required /></label><label>Phone <span className="admin-calendar-optional">optional</span><input className="admin-field" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. +61 4xx xxx xxx" autoComplete="tel" /></label>{!corporate && <label>Company <span className="admin-calendar-optional">optional</span><input className="admin-field" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="e.g. Acme Group" autoComplete="organization" /></label>}</div></section>
          <section className="admin-calendar-section"><div className="admin-calendar-section-heading"><span className="admin-calendar-step">04</span><div><h4>Guests &amp; notes</h4><p>Enter the number staying in this home.</p></div></div><div className="admin-calendar-guest-grid"><label>Adults<input className="admin-field" type="number" min={1} max={Number(selectedProperty.maximum_adults ?? 30)} value={adults} onChange={(event) => setAdults(Number(event.target.value))} required /></label><label>Children<input className="admin-field" type="number" min={0} max={Number(selectedProperty.maximum_children ?? 30)} value={children} onChange={(event) => setChildren(Number(event.target.value))} required /></label><label>Infants<input className="admin-field" type="number" min={0} max={Number(selectedProperty.maximum_infants ?? 30)} value={infants} onChange={(event) => setInfants(Number(event.target.value))} required /></label><label>Pets<input className="admin-field" type="number" min={0} max={Number(selectedProperty.maximum_pets ?? 30)} value={pets} onChange={(event) => setPets(Number(event.target.value))} required /></label></div><label className="admin-calendar-full-field">Private note <span className="admin-calendar-optional">optional</span><textarea className="admin-field" maxLength={4000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Arrival details, agreed rate, or payment arrangement — admins only" /></label></section>
          {rangeConflictDate && <p className="admin-calendar-inline-error" role="alert">{displayDate(rangeConflictDate)} is already unavailable. Choose a shorter stay or another house.</p>}
          <div className="admin-calendar-form-footer"><p>Dates are reserved immediately. Payment stays pending until you record it; no Stripe charge is made.</p><button type="submit" className="admin-button admin-button-primary" disabled={busy || Boolean(rangeConflictDate)}>{busy ? "Creating…" : "Create manual booking"}</button></div>
        </form>}
      </>}
      <Link className="admin-calendar-house-link" href={`/admin/houses/${selectedProperty.id}`}>Edit this house’s rates <ChevronRight size={15} aria-hidden="true" /></Link>
    </div></AdminDialog>}
  </div>;
}

function CalendarBookingEditor({ booking, busy, onDirtyChange, onSave }: {
  booking: Row;
  busy: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSave: (bookingId: string, changes: Row) => Promise<void>;
}) {
  const { confirm } = useAdminWorkspace();
  const [bookingStatus, setBookingStatus] = useState(String(booking.booking_status ?? "confirmed"));
  const [paymentStatus, setPaymentStatus] = useState(String(booking.payment_status ?? "pending"));
  const [internalNotes, setInternalNotes] = useState(String(booking.internal_notes ?? ""));
  const [cancellationReason, setCancellationReason] = useState("");
  const stripeManaged = Boolean(booking.stripe_checkout_session_id);
  const dirty = bookingStatus !== String(booking.booking_status ?? "confirmed") || paymentStatus !== String(booking.payment_status ?? "pending") || internalNotes !== String(booking.internal_notes ?? "") || Boolean(cancellationReason);
  useDirtyGuard(dirty);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  const guest = booking.guest_details && typeof booking.guest_details === "object" && !Array.isArray(booking.guest_details) ? booking.guest_details as Row : {};
  const bookingId = String(booking.id);
  const recordOfflinePayment = async () => {
    if (dirty || busy || stripeManaged || booking.booking_source !== "admin" || paymentStatus !== "pending") return;
    if (await confirm({ title: "Record offline payment?", description: `Only mark ${String(booking.reference ?? "this booking")} as paid after you have received the guest's payment. This does not charge them through Stripe.`, confirmLabel: "Mark as paid" })) await onSave(bookingId, { paymentStatus: "paid" });
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (bookingStatus === "cancelled" && bookingStatus !== booking.booking_status && !cancellationReason.trim()) return;
    if (bookingStatus === "cancelled" && bookingStatus !== booking.booking_status) {
      const automaticRefund = stripeManaged && paymentStatus === "paid" && isWithinFreeCancellation(String(booking.free_cancellation_until ?? ""));
      const description = automaticRefund
        ? `This cancels ${String(booking.reference ?? "the booking")}, frees its dates, and automatically refunds ${formatAud(Number(booking.total ?? 0))} through Stripe. If this is one house in a corporate booking, the other houses stay booked. This cannot be undone.`
        : `This cancels ${String(booking.reference ?? "the booking")} and frees its dates. ${paymentStatus === "paid" ? "No automatic refund will be made. Review this payment separately." : "No payment will be refunded."}`;
      if (!await confirm({ title: automaticRefund ? "Cancel and refund booking?" : "Cancel booking?", description, confirmLabel: automaticRefund ? "Cancel and refund" : "Cancel booking", destructive: true })) return;
    }
    if (!stripeManaged && paymentStatus !== booking.payment_status && !await confirm({ title: "Change payment record?", description: "Only set payment to paid when you have verified receipt outside Stripe. This action does not charge the guest.", confirmLabel: "Save payment status" })) return;
    await onSave(bookingId, { bookingStatus, paymentStatus: stripeManaged ? undefined : paymentStatus, internalNotes, cancellationReason });
  };
  return <form className="space-y-4 border-t border-[var(--admin-border)] pt-5" onSubmit={(event) => void save(event)}>
    <div><h4 className="text-lg font-semibold">Manage booking</h4><p className="mt-1 text-sm text-[var(--admin-muted)]">{String(guest.contactName ?? [guest.firstName, guest.lastName].filter(Boolean).join(" ") ?? "Guest")} · {String(guest.email ?? "No email")}</p><p className="mt-1 text-sm text-[var(--admin-muted)]">Total {formatAud(Number(booking.total ?? 0))} · {String(booking.booking_source ?? "website")}</p></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Booking status<select className="admin-field mt-1" value={bookingStatus} onChange={(event) => setBookingStatus(event.target.value)}>{["pending_payment", "confirmed", "corporate", "cancelled", "checked_in", "checked_out", "expired"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label className="text-sm font-medium">Payment status<select className="admin-field mt-1" value={paymentStatus} disabled={stripeManaged} onChange={(event) => setPaymentStatus(event.target.value)}>{["pending", "paid", "failed", "refunded"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
    {stripeManaged && <p className="text-xs text-[var(--admin-muted)]">Paid Stripe bookings are automatically refunded only within their saved free cancellation window. For a corporate booking, only this house’s amount is refunded. Review later refunds in Payments.</p>}
    {booking.booking_source === "admin" && !stripeManaged && paymentStatus === "pending" && <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4"><strong className="text-sm">Offline payment pending</strong><p className="mt-1 text-sm text-[var(--admin-muted)]">Dates are already reserved. Record payment only after receiving it in person or by bank transfer.</p><button type="button" className="admin-button mt-3" disabled={busy || dirty} onClick={() => void recordOfflinePayment()}>Mark as paid</button>{dirty && <p className="mt-2 text-xs text-[var(--admin-muted)]">Save or discard other edits first.</p>}</div>}
    <label className="block text-sm font-medium">Internal notes<textarea className="admin-field mt-1 min-h-28" maxLength={4000} value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} /></label>
    {bookingStatus === "cancelled" && <label className="block text-sm font-medium">Cancellation reason<input className="admin-field mt-1" maxLength={500} value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} required={bookingStatus !== booking.booking_status} placeholder="Required for the audit trail" /></label>}
    <button type="submit" className="admin-button admin-button-primary inline-flex w-full items-center justify-center gap-2" disabled={busy || !dirty}><Save size={16} /> {busy ? "Saving…" : "Save booking changes"}</button>
  </form>;
}
