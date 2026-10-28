import { addDays, formatAud, formatDateAu, todayIso } from "@/src/lib/booking";

export function cancellationDeadline(checkIn: string, freeCancellationDays: number) {
  const days = Number.isInteger(freeCancellationDays) && freeCancellationDays >= 1 ? freeCancellationDays : 7;
  return addDays(checkIn, -days);
}

export function isWithinFreeCancellation(deadline: string | null | undefined) {
  return Boolean(deadline && todayIso() <= deadline);
}

export function cancellationRefundPreview(total: number, deadline: string | null | undefined, lateFee: number | null) {
  const totalCents = Math.max(0, Math.round(total * 100));
  if (!Number.isSafeInteger(totalCents)) return null;
  if (isWithinFreeCancellation(deadline)) return { refundCents: totalCents, retainedCents: 0 };
  if (lateFee === null || !Number.isFinite(lateFee) || lateFee < 0) return null;
  const retainedCents = Math.min(totalCents, Math.round(lateFee * 100));
  return { refundCents: totalCents - retainedCents, retainedCents };
}

export function freeCancellationText(checkIn: string, freeCancellationDays: number, lateCancellationFee?: number) {
  const deadline = cancellationDeadline(checkIn, freeCancellationDays);
  const deadlineText = isWithinFreeCancellation(deadline)
    ? `Free cancellation until 11:59 pm Melbourne time on ${formatDateAu(deadline)}.`
    : `The free cancellation deadline was ${formatDateAu(deadline)}.`;
  return lateCancellationFee === undefined ? deadlineText : `${deadlineText} After the deadline, a ${formatAud(lateCancellationFee)} cancellation fee applies and the remaining booking amount is refunded. The fee cannot exceed the booking price.`;
}
