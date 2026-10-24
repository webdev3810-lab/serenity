export type DirectCorporateRule = {
  corporateBookingAllowed: boolean;
  instantBookingEnabled: boolean;
  bookingRequestRequired: boolean;
  corporateApprovalRequired: boolean;
};

export function rangesOverlap(start: string, end: string, otherStart: string, otherEnd: string) {
  return start < otherEnd && end > otherStart;
}

export function canBookCorporateDirectly(rules: DirectCorporateRule[]) {
  return rules.length > 0 && rules.every((rule) => rule.corporateBookingAllowed && rule.instantBookingEnabled && !rule.bookingRequestRequired && !rule.corporateApprovalRequired);
}

type CorporateGuestHouse = {
  slug: string;
  minimumGuests: number;
  maxGuests: number;
  maximumAdults: number;
};

/** Spread the exact team size across the selected houses without exceeding adult capacity. */
export function allocateCorporateGuests(totalGuests: number, houses: CorporateGuestHouse[]): number[] | null {
  if (!Number.isInteger(totalGuests) || !houses.length) return null;

  const allocated = houses.map((house) => Math.max(1, house.minimumGuests));
  const capacity = houses.map((house) => Math.min(house.maxGuests, house.maximumAdults));
  if (houses.some((house, index) => !Number.isInteger(allocated[index]) || !Number.isInteger(capacity[index]) || allocated[index] > capacity[index])) return null;

  let remaining = totalGuests - allocated.reduce((sum, count) => sum + count, 0);
  if (remaining < 0 || remaining > capacity.reduce((sum, count, index) => sum + count - allocated[index], 0)) return null;

  while (remaining > 0) {
    let next = -1;
    for (let index = 0; index < houses.length; index += 1) {
      if (allocated[index] >= capacity[index]) continue;
      if (next < 0 || allocated[index] < allocated[next] || (allocated[index] === allocated[next] && houses[index].slug < houses[next].slug)) next = index;
    }
    if (next < 0) return null;
    allocated[next] += 1;
    remaining -= 1;
  }

  return allocated;
}

export function hasBlockedDate(start: string, end: string, blockedDates: string[]) {
  return blockedDates.some((date) => date >= start && date < end);
}
