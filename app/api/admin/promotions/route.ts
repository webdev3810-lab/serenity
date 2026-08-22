import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getPromotionStatus, normalizePromotionRow, promotionRemaining, validatePromotionInput } from "@/src/lib/promotions";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load promotions." }, { status: 500 });
  const promotions = (data ?? []).map((row) => {
    const promotion = normalizePromotionRow(row as Record<string, unknown>);
    return { ...promotion, status: getPromotionStatus(promotion), remaining_redemptions: promotionRemaining(promotion) };
  });
  return NextResponse.json({ promotions });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid promotion request." }, { status: 400 }); }
  const validation = validatePromotionInput(body);
  if (validation.errors.length) return NextResponse.json({ error: validation.errors.join(" ") }, { status: 422 });
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("promotions").insert(validation.value).select("*").single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Voucher codes must be unique, ignoring capitalisation." }, { status: 409 });
    return NextResponse.json({ error: "Could not create the promotion." }, { status: 500 });
  }
  return NextResponse.json({ promotion: data }, { status: 201 });
}
