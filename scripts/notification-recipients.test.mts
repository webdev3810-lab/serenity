import assert from "node:assert/strict";
import test from "node:test";
import { validateNotificationRecipients } from "../src/lib/notificationRecipients.ts";

test("accepts one to five unique notification emails", () => {
  const result = validateNotificationRecipients([" ONE@example.com ", "two@example.com"]);
  assert.deepEqual(result, { emails: ["one@example.com", "two@example.com"] });
});

test("rejects more than five and duplicate or invalid addresses", () => {
  assert.match(validateNotificationRecipients(Array.from({ length: 6 }, (_, index) => `user${index}@example.com`)).error ?? "", /up to 5/);
  assert.match(validateNotificationRecipients(["ONE@example.com", "one@example.com"]).error ?? "", /unique/);
  assert.match(validateNotificationRecipients(["not-an-email"]).error ?? "", /valid/);
});

test("an empty list explicitly disables notifications", () => {
  assert.deepEqual(validateNotificationRecipients(["", "  "]), { emails: [] });
});
