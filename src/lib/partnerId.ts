// Keep legacy IDs valid while existing accounts are moved to the numbered format.
const partnerIdPattern = /^(?:SER-(?:[A-Z]{2}\d{3,}|[A-F0-9]{12}|[A-F0-9]{20})|ADM-ZZ000)$/;

export function isValidPartnerId(value: string): boolean {
  return partnerIdPattern.test(value);
}
