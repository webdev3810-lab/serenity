import assert from "node:assert/strict";
import { test } from "node:test";
import { assertAudCheckout, bookingConfirmationState, describeStripeEvent } from "../src/lib/stripeMonitoring.ts";
import { canCancelCheckoutSession, createCheckoutCancellationToken, verifyCheckoutCancellationToken } from "../src/lib/checkoutCancellation.ts";

test("checkout cancellation needs a valid token tied to the booking", () => {
  const token = createCheckoutCancellationToken("booking-1", "SER-7-ABCDE", "sk_test_example");
  assert.equal(verifyCheckoutCancellationToken(token, "booking-1", "SER-7-ABCDE", "sk_test_example"), true);
  assert.equal(verifyCheckoutCancellationToken(token, "booking-2", "SER-7-ABCDE", "sk_test_example"), false);
  assert.equal(verifyCheckoutCancellationToken(token, "booking-1", "SER-7-OTHER", "sk_test_example"), false);
  assert.equal(verifyCheckoutCancellationToken(token, "booking-1", "SER-7-ABCDE", "sk_test_other"), false);
  assert.equal(verifyCheckoutCancellationToken("bad-token", "booking-1", "SER-7-ABCDE", "sk_test_example"), false);
});

test("only unpaid open or expired checkouts release booking dates", () => {
  assert.equal(canCancelCheckoutSession({ status: "open", payment_status: "unpaid" }), true);
  assert.equal(canCancelCheckoutSession({ status: "expired", payment_status: "unpaid" }), true);
  assert.equal(canCancelCheckoutSession({ status: "complete", payment_status: "paid" }), false);
  assert.equal(canCancelCheckoutSession({ status: "complete", payment_status: "unpaid" }), false);
  assert.equal(canCancelCheckoutSession({ status: "open", payment_status: "paid" }), false);
});

const event = (type: string, object: Record<string, unknown>) => ({
  id: "evt_test", type, created: 1_700_000_000,
  livemode: false, data: { object },
}) as unknown as Parameters<typeof describeStripeEvent>[0];

test("paid AUD checkout is classified and linked to its booking", () => {
  const result = describeStripeEvent(event("checkout.session.completed", {
    object: "checkout.session", id: "cs_test_123", payment_status: "paid",
    currency: "aud", amount_total: 12345,
    metadata: { bookingId: "booking-1", reference: "SER-123" },
    payment_intent: "pi_test_123",
  }));
  assert.equal(result.outcome, "succeeded");
  assert.equal(result.amountCents, 12345);
  assert.equal(result.currency, "AUD");
  assert.equal(result.bookingReference, "SER-123");
});

test("a card decline is an attempt with a safe failure reason", () => {
  const result = describeStripeEvent(event("payment_intent.payment_failed", {
    object: "payment_intent", id: "pi_test_123", amount: 10000,
    currency: "aud", metadata: { reference: "SER-123" },
    last_payment_error: { code: "card_declined", decline_code: "insufficient_funds", message: "Card declined." },
  }));
  assert.equal(result.outcome, "declined");
  assert.equal(result.failureCode, "insufficient_funds");
});

test("partial and full refunds are not confused", () => {
  const base = { object: "charge", amount: 10000, currency: "aud", payment_intent: "pi_test_123" };
  assert.equal(describeStripeEvent(event("charge.refunded", { ...base, amount_refunded: 2500 })).outcome, "partially_refunded");
  assert.equal(describeStripeEvent(event("charge.refunded", { ...base, amount_refunded: 10000 })).outcome, "refunded");
});

test("checkout must match its booking in AUD and cents", () => {
  const booking = { id: "booking-1", stripe_checkout_session_id: "cs_test_123", currency: "AUD", total: 123.45 };
  const session = { id: "cs_test_123", currency: "aud", amount_total: 12345 } as Parameters<typeof assertAudCheckout>[0];
  assert.doesNotThrow(() => assertAudCheckout(session, booking));
  assert.throws(() => assertAudCheckout({ ...session, currency: "usd" }, booking), /AUD/);
  assert.throws(() => assertAudCheckout({ ...session, amount_total: 12344 }, booking), /amount/);
  assert.throws(() => assertAudCheckout({ ...session, id: "cs_other" }, booking), /session/);
});

test("only pending bookings can transition to paid; confirmed bookings remain idempotent", () => {
  assert.equal(bookingConfirmationState({ payment_status: "pending", booking_status: "pending_payment" }), "pending");
  assert.equal(bookingConfirmationState({ payment_status: "paid", booking_status: "confirmed" }), "confirmed");
  assert.equal(bookingConfirmationState({ payment_status: "paid", booking_status: "checked_in" }), "confirmed");
  assert.throws(() => bookingConfirmationState({ payment_status: "refunded", booking_status: "cancelled" }), /no longer eligible/);
  assert.throws(() => bookingConfirmationState({ payment_status: "pending", booking_status: "cancelled" }), /no longer eligible/);
  assert.throws(() => bookingConfirmationState({ payment_status: "failed", booking_status: "pending_payment" }), /no longer eligible/);
  assert.throws(() => bookingConfirmationState({ payment_status: "paid", booking_status: "cancelled" }), /no longer eligible/);
});
