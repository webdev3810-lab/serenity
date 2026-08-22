import assert from "node:assert/strict";
import test from "node:test";
import { buildIcsCalendar, groupCalendarDates, parseIcsCalendar } from "../src/lib/calendar/ical.ts";

test("parses all-day reservations with an exclusive checkout date", () => {
  const events = parseIcsCalendar([
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "UID:airbnb-123",
    "DTSTART;VALUE=DATE:20260910",
    "DTEND;VALUE=DATE:20260913",
    "SUMMARY:Guest stay",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n"));
  assert.deepEqual(events[0], {
    externalEventId: "airbnb-123",
    startDate: "2026-09-10",
    endDate: "2026-09-13",
    summary: "Guest stay",
    status: "active",
    isBlocking: true,
  });
});

test("does not block cancelled or transparent events", () => {
  const events = parseIcsCalendar([
    "BEGIN:VEVENT",
    "UID:cancelled",
    "DTSTART:20260910T120000Z",
    "STATUS:CANCELLED",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:transparent",
    "DTSTART;VALUE=DATE:20260911",
    "DTEND;VALUE=DATE:20260912",
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
  ].join("\n"));
  assert.equal(events.length, 2);
  assert.equal(events[0].isBlocking, false);
  assert.equal(events[1].isBlocking, false);
});

test("groups adjacent blocked dates and emits valid CRLF iCal", () => {
  assert.deepEqual(groupCalendarDates(["2026-09-12", "2026-09-10", "2026-09-11"]), [{ startDate: "2026-09-10", endDate: "2026-09-13" }]);
  const output = buildIcsCalendar([{ uid: "booking-1@serenity", startDate: "2026-09-10", endDate: "2026-09-13", summary: "Reserved, private" }]);
  assert.match(output, /BEGIN:VCALENDAR\r\n/);
  assert.match(output, /DTSTART;VALUE=DATE:20260910\r\n/);
  assert.match(output, /SUMMARY:Reserved\\, private\r\n/);
  assert.match(output, /END:VCALENDAR\r\n$/);
});
