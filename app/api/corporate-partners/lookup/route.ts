import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function POST(request: Request) {
  let body: { partnerId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const partnerId = String(body.partnerId ?? "").trim().toUpperCase();
  if (!/^SER-(?:[A-F0-9]{12}|[A-F0-9]{20})$/.test(partnerId)) return NextResponse.json({ error: "Partner ID not found. Check the ID issued by Serenity." }, { status: 404 });
  try {
    const { data, error } = await createSupabaseAdminClient().from("corporate_partners").select("company_name").eq("partner_id", partnerId).eq("active", true).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Partner ID not found. Check the ID issued by Serenity." }, { status: 404 });
    return NextResponse.json({ companyName: data.company_name }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Partner lookup is unavailable. Please try again shortly." }, { status: 503 });
  }
}
