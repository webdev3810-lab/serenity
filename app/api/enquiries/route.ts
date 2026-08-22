import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/src/lib/supabase/config";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ configured: false });
  try {
    const body = await request.json();
    const companyName = String(body.companyName ?? "").trim();
    const contactName = String(body.contactName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const arrival = String(body.arrival ?? "");
    const departure = String(body.departure ?? "");
    const housesNeeded = Math.max(1, Number(body.housesNeeded ?? 1));
    const propertySlugs: string[] = Array.isArray(body.propertySlugs) ? Array.from(new Set<string>(body.propertySlugs.map((slug: unknown) => String(slug).trim()).filter(Boolean))) : [];
    const abn = String(body.abn ?? "").trim();
    const purchaseOrder = String(body.purchaseOrder ?? "").trim();
    if (!companyName || !contactName || !email || !arrival || !departure) return NextResponse.json({ error: "Company, contact, email, arrival, and departure are required." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid business email address." }, { status: 400 });
    if (departure <= arrival) return NextResponse.json({ error: "Departure must be after arrival." }, { status: 400 });
    if (!Number.isInteger(housesNeeded) || housesNeeded < 1 || housesNeeded > 3 || propertySlugs.length !== housesNeeded) return NextResponse.json({ error: "Select the same number of adjacent houses as requested." }, { status: 400 });
    if (companyName.length > 160 || contactName.length > 120 || email.length > 150 || phone.length > 30 || abn.length > 30 || purchaseOrder.length > 120 || String(body.notes ?? "").length > 1000) return NextResponse.json({ error: "Please shorten one or more enquiry fields." }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data: propertyRows, error: propertyError } = await supabase.from("properties").select("id, slug, corporate_booking_allowed, minimum_corporate_stay, minimum_corporate_houses, maximum_corporate_houses, adjacent_houses_allowed").in("slug", propertySlugs).eq("published", true);
    if (propertyError) throw propertyError;
    if (!propertyRows || propertyRows.length !== propertySlugs.length) return NextResponse.json({ error: "One or more selected houses are not available for corporate enquiries." }, { status: 409 });
    const firstRule = propertyRows[0];
    if (propertyRows.some((property) => property.corporate_booking_allowed === false || property.adjacent_houses_allowed === false)) return NextResponse.json({ error: "One or more selected houses are not enabled for corporate bookings." }, { status: 409 });
    if (housesNeeded < Number(firstRule.minimum_corporate_houses ?? 1) || housesNeeded > Number(firstRule.maximum_corporate_houses ?? 3)) return NextResponse.json({ error: `Corporate enquiries for these houses must include between ${firstRule.minimum_corporate_houses} and ${firstRule.maximum_corporate_houses} houses.` }, { status: 400 });
    const nights = Math.round((new Date(`${departure}T00:00:00Z`).getTime() - new Date(`${arrival}T00:00:00Z`).getTime()) / 86400000);
    if (nights < Number(firstRule.minimum_corporate_stay ?? 1)) return NextResponse.json({ error: `Corporate stays require at least ${firstRule.minimum_corporate_stay} nights.` }, { status: 400 });

    const propertyIds = propertyRows.map((property) => property.id);
    const { data: overlappingBookings, error: overlapError } = await supabase.from("bookings").select("property_id").in("property_id", propertyIds).in("booking_status", ["pending_payment", "confirmed", "corporate", "checked_in"]).lt("check_in", departure).gt("checkout", arrival);
    if (overlapError) throw overlapError;
    if (overlappingBookings?.length) return NextResponse.json({ error: "One or more selected houses are already booked for those dates. Please choose different dates or houses." }, { status: 409 });

    const { data, error } = await supabase.from("enquiries").insert({
      company_name: companyName,
      contact_name: contactName,
      email,
      phone,
      arrival: arrival || null,
      departure: departure || null,
      guests: body.guests ?? "",
      houses_needed: String(housesNeeded),
      purpose: body.purpose ?? "",
      notes: body.notes ?? "",
      property_ids: propertyIds,
      abn,
      purchase_order: purchaseOrder,
      invoice_requested: body.invoiceRequested === true,
      internal_notes: "",
    }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ configured: true, enquiry: data });
  } catch (error) {
    console.error("Enquiry persistence failed", error);
    return NextResponse.json({ error: "We could not submit your enquiry." }, { status: 500 });
  }
}
