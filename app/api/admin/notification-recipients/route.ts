import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { normalizeNotificationRecipients, validateNotificationRecipients } from "@/src/lib/notificationRecipients";

const SETTINGS_KEY = "notification_recipients";

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load notification emails." }, { status: 500 });
  const value = data?.value;
  const saved = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>).emails : undefined;
  const fallback = process.env.RESEND_NOTIFY_EMAIL?.trim();
  return NextResponse.json({ emails: data ? normalizeNotificationRecipients(saved) : fallback ? [fallback] : [] });
}

export async function PUT(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid notification email request." }, { status: 400 }); }
  const result = validateNotificationRecipients(body.emails);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("site_settings").upsert({ key: SETTINGS_KEY, value: { emails: result.emails }, is_public: false }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: "Could not save notification emails." }, { status: 500 });
  return NextResponse.json({ emails: result.emails });
}
