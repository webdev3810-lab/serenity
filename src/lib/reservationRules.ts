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

export function hasBlockedDate(start: string, end: string, blockedDates: string[]) {
  return blockedDates.some((date) => date >= start && date < end);
}
