export const CALENDAR_PLATFORMS = ["airbnb", "vrbo", "stayz"] as const;
export type CalendarPlatform = (typeof CALENDAR_PLATFORMS)[number];
export type CalendarSource = CalendarPlatform | "direct";

export const CALENDAR_PLATFORM_LABELS: Record<CalendarPlatform, string> = {
  airbnb: "Airbnb",
  vrbo: "Vrbo",
  stayz: "Stayz",
};

export type ParsedCalendarEvent = {
  externalEventId: string;
  startDate: string;
  endDate: string;
  summary: string;
  status: "active" | "cancelled";
  isBlocking: boolean;
};

export type CalendarSyncResult = {
  propertyId: string;
  platform: CalendarPlatform;
  status: "success" | "error" | "conflict";
  importedEvents: number;
  message: string;
};
