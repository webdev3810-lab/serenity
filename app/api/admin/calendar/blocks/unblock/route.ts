import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { fetchAllAdminRows } from "@/src/lib/admin-pagination";

type SelectedNight = { propertyId: string; date: string };

const isDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const nextDate = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};
const keyFor = ({ propertyId, date }: SelectedNight) => `${propertyId}:${date}`;

export async function POST(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  try {
    const body = await request.json() as { dates?: SelectedNight[] } | null;
    if (!Array.isArray(body?.dates) || !body.dates.length || body.dates.length > 500) {
      return NextResponse.json({ error: "Select between 1 and 500 manually blocked nights." }, { status: 400 });
    }
    if (body.dates.some((item) => !item || typeof item.propertyId !== "string" || typeof item.date !== "string" || !/^[0-9a-f-]{36}$/i.test(item.propertyId) || !isDate(item.date))) {
      return NextResponse.json({ error: "Choose valid blocked nights." }, { status: 400 });
    }
    const dates = [...new Map(body.dates.map((item) => [keyFor(item), item])).values()];
    const propertyIds = [...new Set(dates.map((item) => item.propertyId))];
    const sortedDates = [...dates].sort((a, b) => a.date.localeCompare(b.date));
    const earliest = sortedDates[0].date;
    const latest = sortedDates.at(-1)!.date;
    const supabase = createSupabaseAdminClient();
    const loaded = await fetchAllAdminRows(() => supabase.from("calendar_events")
      .select("id, property_id, start_date, end_date, summary, block_reason, internal_note")
      .in("property_id", propertyIds).eq("status", "active").eq("is_blocking", true)
      .eq("source_platform", "direct").is("connection_id", null)
      .not("external_event_id", "like", "ical-upload:%")
      .lte("start_date", latest).gt("end_date", earliest).order("id"));
    if (loaded.error) return NextResponse.json({ error: loaded.error.message }, { status: 500 });
    const blocks = loaded.data ?? [];
    const affectedByDate = new Map(dates.map((night) => [keyFor(night), blocks.filter((block) => block.property_id === night.propertyId && block.start_date <= night.date && block.end_date > night.date).map((block) => block.id)]));
    if ([...affectedByDate.values()].some((ids) => !ids.length)) return NextResponse.json({ error: "Some selected nights are no longer manually blocked. Refresh the calendar and choose again." }, { status: 409 });
    const affectedBlocks = blocks.filter((block) => dates.some((night) => block.property_id === night.propertyId && block.start_date <= night.date && block.end_date > night.date));
    const completedBlockIds = new Set<string>();
    const completedDates = () => dates.filter((night) => affectedByDate.get(keyFor(night))!.every((id) => completedBlockIds.has(id)));

    for (const block of affectedBlocks) {
      const selected = dates.filter((night) => night.propertyId === block.property_id && night.date >= block.start_date && night.date < block.end_date).map((night) => night.date).sort();
      const remaining: Array<{ startDate: string; endDate: string }> = [];
      let cursor = block.start_date;
      for (const date of selected) {
        if (cursor < date) remaining.push({ startDate: cursor, endDate: date });
        cursor = nextDate(date);
      }
      if (cursor < block.end_date) remaining.push({ startDate: cursor, endDate: block.end_date });

      const replacements = remaining.map((range) => ({
        property_id: block.property_id,
        connection_id: null,
        source_platform: "direct" as const,
        external_event_id: `admin-block:${crypto.randomUUID()}`,
        start_date: range.startDate,
        end_date: range.endDate,
        status: "active" as const,
        summary: block.summary,
        block_reason: block.block_reason,
        internal_note: block.internal_note,
        is_blocking: true,
        last_seen_at: new Date().toISOString(),
      }));
      const inserted = replacements.length ? await supabase.from("calendar_events").insert(replacements).select("id") : { data: [], error: null };
      if (inserted.error) return NextResponse.json({ error: inserted.error.message, completedDates: completedDates() }, { status: 500 });
      const replacementIds = (inserted.data ?? []).map((item) => item.id);
      const { data: updated, error: updateError } = await supabase.from("calendar_events")
        .update({ status: "stale", is_blocking: false }).eq("id", block.id)
        .eq("status", "active").eq("is_blocking", true)
        .eq("start_date", block.start_date).eq("end_date", block.end_date)
        .select("id").maybeSingle();
      if (updateError || !updated) {
        const rollback = replacementIds.length ? await supabase.from("calendar_events").update({ status: "stale", is_blocking: false }).in("id", replacementIds) : { error: null };
        return NextResponse.json({
          error: rollback.error ? "The calendar changed and cleanup failed. Refresh before trying again." : updateError?.message ?? "The calendar changed while unblocking dates. Refresh and try again.",
          completedDates: completedDates(),
        }, { status: updateError || rollback.error ? 500 : 409 });
      }
      completedBlockIds.add(block.id);
    }
    return NextResponse.json({ ok: true, unblockedDates: dates.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not unblock dates." }, { status: 500 });
  }
}
