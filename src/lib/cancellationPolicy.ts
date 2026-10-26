import { addDays, formatDateAu, todayIso } from "@/src/lib/booking";

export function cancellationDeadline(checkIn: string, freeCancellationDays: number) {
  const days = Number.isInteger(freeCancellationDays) && freeCancellationDays >= 1 ? freeCancellationDays : 7;
  return addDays(checkIn, -days);
}

export function isWithinFreeCancellation(deadline: string | null | undefined) {
  return Boolean(deadline && todayIso() <= deadline);
}

export function freeCancellationText(checkIn: string, freeCancellationDays: number) {
  const deadline = cancellationDeadline(checkIn, freeCancellationDays);
  return isWithinFreeCancellation(deadline)
    ? `Free cancellation until 11:59 pm Melbourne time on ${formatDateAu(deadline)}.`
    : `The free cancellation deadline was ${formatDateAu(deadline)}.`;
}
