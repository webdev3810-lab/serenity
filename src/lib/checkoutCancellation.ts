import { createHmac, timingSafeEqual } from "node:crypto";

export function createCheckoutCancellationToken(bookingId: string, reference: string, secretKey: string) {
  return createHmac("sha256", secretKey)
    .update(`serenity-checkout-cancel:v1:${bookingId}:${reference}`)
    .digest("hex");
}

export function verifyCheckoutCancellationToken(token: unknown, bookingId: string, reference: string, secretKey: string) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return false;
  const expected = createCheckoutCancellationToken(bookingId, reference, secretKey);
  return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
}

export function canCancelCheckoutSession(session: { status: string | null; payment_status: string }) {
  return (session.status === "open" || session.status === "expired") && session.payment_status !== "paid";
}
