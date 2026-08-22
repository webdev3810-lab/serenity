import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyPromotionToPrice,
  getPromotionEligibilityError,
  getPromotionStatus,
  normalizePromotionCode,
  normalizePromotionRow,
  validatePromotionInput,
} from "../src/lib/promotions.ts";

const basePromotion = (overrides: Record<string, unknown> = {}) => normalizePromotionRow({
  id: "promotion-1", name: "Winter direct", badge_text: "BOOK DIRECT", message: "Save with code", mobile_message: "Save with code",
  code: "WINTER10", discount_type: "percentage", discount_value: 10, active: true, published: true, header_visible: true,
  successful_redemptions: 0, reserved_redemptions: 0, max_redemptions: 2, minimum_booking_amount: 0, minimum_nights: 0,
  applicable_property_ids: [], applies_to_corporate: false, stackable: true, restore_on_refund: false, ...overrides,
});

const price = { nights: 2, nightlySubtotal: 400, cleaningFee: 50, petFee: 0, extraGuestFee: 0, discount: 0, discountLabel: "", nightlyRateSummary: "AUD 200 × 2 nights", tax: 45, total: 495 };

test("normalizes codes and calculates percentage and fixed discounts", () => {
  assert.equal(normalizePromotionCode(" winter10 "), "WINTER10");
  const percentage = applyPromotionToPrice(price, basePromotion());
  assert.equal(percentage.promotionDiscount, 50);
  assert.equal(percentage.promotionCode, "WINTER10");
  const fixed = applyPromotionToPrice(price, basePromotion({ discount_type: "fixed_aud", discount_value: 75 }));
  assert.equal(fixed.promotionDiscount, 75);
});

test("reports promotion lifecycle states", () => {
  const now = new Date("2026-08-23T00:00:00Z");
  assert.equal(getPromotionStatus(basePromotion(), now), "active");
  assert.equal(getPromotionStatus(basePromotion({ starts_at: "2026-08-24T00:00:00Z" }), now), "scheduled");
  assert.equal(getPromotionStatus(basePromotion({ ends_at: "2026-08-22T00:00:00Z" }), now), "expired");
  assert.equal(getPromotionStatus(basePromotion({ successful_redemptions: 2 }), now), "sold_out");
  assert.equal(getPromotionStatus(basePromotion({ active: false }), now), "disabled");
});

test("enforces house, minimum, corporate, and stacking rules", () => {
  const restricted = basePromotion({ applicable_property_ids: ["house-9"], minimum_nights: 3, minimum_booking_amount: 600, applies_to_corporate: false, stackable: false });
  assert.match(getPromotionEligibilityError(restricted, { propertyId: "house-7", nights: 3, bookingAmount: 700 }), /house/);
  assert.match(getPromotionEligibilityError(restricted, { propertyId: "house-9", nights: 3, bookingAmount: 495 }), /minimum booking amount/);
  assert.match(getPromotionEligibilityError(restricted, { propertyId: "house-9", nights: 3, bookingAmount: 700, corporate: true }), /corporate/);
  assert.match(getPromotionEligibilityError(restricted, { propertyId: "house-9", nights: 3, bookingAmount: 700, existingDiscount: 20 }), /combined/);
  assert.equal(getPromotionEligibilityError(restricted, { propertyId: "house-9", nights: 3, bookingAmount: 700 }), "");
});

test("validates CMS limits and discount bounds", () => {
  const result = validatePromotionInput({ name: "", badge_text: "B", message: "M", mobile_message: "M", code: "BAD CODE", discount_type: "percentage", discount_value: 101 });
  assert.ok(result.errors.some((error) => error.includes("name")));
  assert.ok(result.errors.some((error) => error.includes("100")));
  assert.ok(result.errors.some((error) => error.includes("Voucher code")));
});
