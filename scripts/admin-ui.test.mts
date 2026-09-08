import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchAllAdminRows } from "../src/lib/admin-pagination.ts";
import { statusPresentation } from "../src/lib/admin-status.ts";

test("admin queries continue beyond a service row cap smaller than the requested page", async () => {
  const rows = Array.from({ length: 1250 }, (_, id) => ({ id }));
  const result = await fetchAllAdminRows(() => ({ range: async (start, end) => ({ data: rows.slice(start, Math.min(end + 1, start + 137)), error: null }) }));
  assert.deepEqual(result.data, rows);
  assert.equal(result.error, null);
});
test("a failed later page cannot present partial records as complete", async () => {
  const result = await fetchAllAdminRows(() => ({ range: async (start) => start ? { data: null, error: { message: "Unavailable" } } : { data: [{ id: 1 }], error: null } }));
  assert.equal(result.data, null); assert.equal(result.error?.message, "Unavailable");
});
test("empty results and rejected requests are distinguishable", async () => {
  assert.deepEqual(await fetchAllAdminRows(() => ({ range: async () => ({ data: [], error: null }) })), { data: [], error: null });
  assert.deepEqual(await fetchAllAdminRows(() => ({ range: async () => { throw new Error("Offline"); } })), { data: null, error: { message: "Offline" } });
});
test("business domains preserve category, payment and lifecycle meanings", () => {
  assert.equal(statusPresentation("payment", "refunded").tone, "violet");
  assert.equal(statusPresentation("category", "corporate").tone, "violet");
  assert.equal(statusPresentation("booking", "checked_in").tone, "info");
  assert.equal(statusPresentation("booking", "checked_out").tone, "neutral");
  assert.equal(statusPresentation("enquiry", "converted").tone, "violet");
  assert.equal(statusPresentation("calendar", "conflict").tone, "warning");
  assert.equal(statusPresentation("promotion", "scheduled").tone, "info");
  assert.equal(statusPresentation("source", "paid").tone, "neutral");
  assert.deepEqual(statusPresentation("payment", null), { label: "Unknown", tone: "neutral" });
  assert.deepEqual(statusPresentation("booking", "future_state"), { label: "Future state", tone: "neutral" });
});
