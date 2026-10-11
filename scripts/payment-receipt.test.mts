import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMelbourneReceiptDate, receiptCode } from "../src/lib/paymentReceipt.ts";

test("receipt codes are stable for guest and corporate booking references", () => {
  assert.equal(receiptCode("SER-7-ABCDE"), "RCPT-SER-7-ABCDE");
  assert.equal(receiptCode("CORP-2026-12345"), "RCPT-CORP-2026-12345");
});

test("receipt paid date uses Melbourne time across daylight saving", () => {
  assert.match(formatMelbourneReceiptDate("2026-07-01T00:00:00Z"), /10:00/);
  assert.match(formatMelbourneReceiptDate("2026-12-01T00:00:00Z"), /11:00/);
});
