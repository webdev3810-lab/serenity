import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_GUEST_INFORMATION, normalizeGuestInformation, validateGuestInformation, isGuestStoragePath, isGuestImageSource } from "../src/lib/guestInformation.ts";

test("an absent CMS record preserves all existing guest policies", () => {
  const guide = normalizeGuestInformation(null);
  assert.deepEqual(guide, DEFAULT_GUEST_INFORMATION);
  assert.deepEqual(validateGuestInformation(guide), []);
  guide.cards[0].items[0] = "An edit";
  assert.notEqual(DEFAULT_GUEST_INFORMATION.cards[0].items[0], "An edit");
});

test("partial saved content retains fixed guide anchors and unedited sections", () => {
  const guide = normalizeGuestInformation({ title: "Your stay", cards: [{ id: "house-rules", title: "Our house rules", items: ["Please leave keys in the safe."] }, { id: "untrusted-section", title: "Extra" }] });
  assert.equal(guide.title, "Your stay");
  assert.equal(guide.cards.length, 6);
  assert.equal(guide.cards.find((card) => card.id === "house-rules")?.items[0], "Please leave keys in the safe.");
  assert.deepEqual(guide.cards[0], DEFAULT_GUEST_INFORMATION.cards[0]);
  assert.deepEqual(validateGuestInformation(guide), []);
});

test("publishing rejects empty or oversized policy points", () => {
  const guide = normalizeGuestInformation(null);
  guide.cards[0].items = [""];
  assert.match(validateGuestInformation(guide).join(" "), /1–20 points/);
  guide.cards[0].items = ["x".repeat(601)];
  assert.match(validateGuestInformation(guide).join(" "), /600 characters/);
});

test("guest uploads cannot target homepage files or escape their own directory", () => {
  assert.equal(isGuestStoragePath("guest-information/admin-id/upload-plan.jpg"), true);
  for (const path of ["homepage/admin-id/photo.jpg", "guest-information/admin-id/../photo.jpg", "guest-information/admin-id/other/photo.jpg", "guest-information/admin-id/photo.jpg?token=1"]) assert.equal(isGuestStoragePath(path), false);
  const guide = normalizeGuestInformation(null);
  guide.images.checkIn = { mode: "custom", src: "", storagePath: "homepage/admin-id/photo.jpg", alt: "Entry" };
  assert.match(validateGuestInformation(guide).join(" "), /upload path/);
});

test("image settings support automatic, hidden and uploaded photos and reject untrusted sources", () => {
  const guide = normalizeGuestInformation(null);
  guide.images.hero.mode = "hidden";
  guide.images.checkIn = { mode: "custom", src: "", storagePath: "guest-information/admin-id/upload-entry.webp", alt: "Our entry" };
  assert.deepEqual(validateGuestInformation(guide), []);
  assert.equal(isGuestImageSource("/images/entry.webp"), true);
  for (const src of ["//evil.example/photo.jpg", "https://evil.example/photo.jpg", "javascript:alert(1)", "/../private.jpg"]) assert.equal(isGuestImageSource(src), false);
  guide.images.houseRules = { mode: "custom", src: "https://evil.example/photo.jpg", storagePath: "", alt: "" };
  assert.match(validateGuestInformation(guide).join(" "), /Choose a house photo/);
});
