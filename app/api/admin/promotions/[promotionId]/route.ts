import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { validatePromotionInput } from "@/src/lib/promotions";

export async function PATCH(request: Request, context: { params: Promise<{ promotionId: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  const { promotionId } = await context.params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid promotion request." }, { status: 400 }); }
  const supabase = createSupabaseAdminClient();
  const { data: current, error: currentError } = await supabase.from("promotions").select("*").eq("id", promotionId).maybeSingle();
  if (currentError || !current) return NextResponse.json({ error: "Promotion not found." }, { status: 404 });
  const validation = validatePromotionInput(body, current as Record<string, unknown>);
  if (validation.errors.length) return NextResponse.json({ error: validation.errors.join(" ") }, { status: 422 });
  const { data, error } = await supabase.from("promotions").update(validation.value).eq("id", promotionId).select("*").single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Voucher codes must be unique, ignoring capitalisation." }, { status: 409 });
    return NextResponse.json({ error: "Could not update the promotion." }, { status: 500 });
  }
  return NextResponse.json({ promotion: data });
}
