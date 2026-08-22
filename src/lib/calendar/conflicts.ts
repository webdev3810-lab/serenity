import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/lib/supabase/types";

export const ACTIVE_BOOKING_STATUSES = ["pending_payment", "confirmed", "corporate", "checked_in"] as const;

export function calendarRangesOverlap(startDate: string, endDate: string, otherStart: string, otherEnd: string) {
  return startDate < otherEnd && endDate > otherStart;
}

export async function findBlockingCalendarEvents(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("id, source_platform, start_date, end_date, summary")
    .eq("property_id", propertyId)
    .eq("status", "active")
    .eq("is_blocking", true)
    .lt("start_date", endDate)
    .gt("end_date", startDate)
    .order("start_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
