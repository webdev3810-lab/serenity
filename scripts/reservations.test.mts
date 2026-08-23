import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canBookCorporateDirectly, hasBlockedDate, rangesOverlap } from "../src/lib/reservationRules.ts";

test("reservation ranges use checkout-exclusive overlap semantics", () => {
  assert.equal(rangesOverlap("2026-09-10", "2026-09-14", "2026-09-14", "2026-09-18"), false);
  assert.equal(rangesOverlap("2026-09-10", "2026-09-14", "2026-09-13", "2026-09-18"), true);
});

test("blocked checkout day does not block the departing stay", () => {
  assert.equal(hasBlockedDate("2026-09-10", "2026-09-14", ["2026-09-14"]), false);
  assert.equal(hasBlockedDate("2026-09-10", "2026-09-14", ["2026-09-13"]), true);
});

test("direct corporate booking requires every selected house to allow it", () => {
  const enabled = { corporateBookingAllowed: true, instantBookingEnabled: true, bookingRequestRequired: false, corporateApprovalRequired: false };
  assert.equal(canBookCorporateDirectly([enabled, enabled]), true);
  assert.equal(canBookCorporateDirectly([enabled, { ...enabled, corporateApprovalRequired: true }]), false);
  assert.equal(canBookCorporateDirectly([]), false);
});

test("the unified reservation migration guards both sides of the booking calendar race", async () => {
  const sql = await readFile(new URL("../supabase/migrations/0016_unified_reservations.sql", import.meta.url), "utf8");
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /create trigger prevent_calendar_event_booking_overlap/);
  assert.match(sql, /create trigger prevent_booking_calendar_event_overlap/);
  assert.match(sql, /create or replace function public\.create_booking_group/);
  assert.match(sql, /order by 1/);
  assert.match(sql, /status = 'converted'/);
});
