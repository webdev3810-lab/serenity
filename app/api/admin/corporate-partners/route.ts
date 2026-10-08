import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const fields = "id, partner_id, company_name, contact_name, email, phone, abn, purchase_order, invoice_requested, active, created_at";

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  const { data, error } = await createSupabaseAdminClient().from("corporate_partners").select(fields).order("company_name");
  if (error) return NextResponse.json({ error: "Could not load partners. Apply the latest database migration first." }, { status: 500 });
  return NextResponse.json({ partners: data ?? [] });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin || admin.admin.role === "editor") return NextResponse.json({ error: "An admin account is required." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const company_name = String(body.companyName ?? "").trim();
  const contact_name = String(body.contactName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  const abn = String(body.abn ?? "").trim();
  const purchase_order = String(body.purchaseOrder ?? "").trim();
  if (!company_name || company_name.length > 160 || !contact_name || contact_name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 150 || !phone || phone.length > 30 || abn.length > 30 || purchase_order.length > 120) {
    return NextResponse.json({ error: "Enter a company, contact name, valid email and phone, within the field limits." }, { status: 400 });
  }
  const { data, error } = await createSupabaseAdminClient().from("corporate_partners").insert({ company_name, contact_name, email, phone, abn, purchase_order, invoice_requested: body.invoiceRequested === true }).select(fields).single();
  if (error) return NextResponse.json({ error: "Could not create the partner account." }, { status: 500 });
  return NextResponse.json({ partner: data }, { status: 201 });
}
