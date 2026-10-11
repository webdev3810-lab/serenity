/** A stable confirmation number derived from the saved booking/group reference. */
export function receiptCode(reference: string): string {
  return `RCPT-${reference}`;
}

export function formatMelbourneReceiptDate(value: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Melbourne",
  }).format(new Date(value));
}
