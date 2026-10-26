const APP_BOOKING_SOURCES = new Set(["website", "corporate_page", "admin", "enquiry"]);

export function isAppManagedBookingSource(source: unknown): boolean {
  return APP_BOOKING_SOURCES.has(String(source ?? "website").toLowerCase());
}
