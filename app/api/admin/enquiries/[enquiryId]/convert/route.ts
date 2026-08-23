import { NextResponse } from "next/server";
import { calculatePrice, defaultGuests } from "@/src/lib/booking";
import { getPublicPropertyBySlug } from "@/src/lib/supabase/content";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAdminUser } from "@/src/lib/supabase/auth";
import type { Json } from "@/src/lib/supabase/types";

const corporateReference = () => `CORP-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

export async function POST(_request: Request, { params }: { params: Promise<{ enquiryId: string }> }) {
  const admin = await getAdminUser();
  if (!admin || admin.admin.role === "editor") return NextResponse.json({ error: "An admin or super admin is required to convert corporate enquiries." }, { status: 403 });

  const { enquiryId } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: enquiry, error: enquiryError } = await supabase.from("enquiries").select("*").eq("id", enquiryId).maybeSingle();
  if (enquiryError) return NextResponse.json({ error: "Could not load the corporate enquiry." }, { status: 500 });
  if (!enquiry) return NextResponse.json({ error: "Corporate enquiry not found." }, { status: 404 });
  if (enquiry.status === "converted") {
    const { data: existing } = await supabase.from("bookings").select("id, reference, property_id").eq("enquiry_id", enquiryId).order("created_at");
    return NextResponse.json({ bookings: existing ?? [], alreadyConverted: true });
  }
  if (enquiry.status !== "approved") return NextResponse.json({ error: "Approve the enquiry before converting it to bookings." }, { status: 400 });

  const propertyIds = Array.isArray(enquiry.property_ids) ? enquiry.property_ids.filter((id): id is string => typeof id === "string") : [];
  const arrival = String(enquiry.arrival ?? "");
  const departure = String(enquiry.departure ?? "");
  if (!propertyIds.length || !arrival || !departure) return NextResponse.json({ error: "This enquiry is missing selected houses or dates." }, { status: 400 });

  const { data: propertyRows, error: propertyError } = await supabase.from("properties").select("id, slug").in("id", propertyIds).eq("published", true);
  if (propertyError || !propertyRows || propertyRows.length !== propertyIds.length) return NextResponse.json({ error: "One or more selected houses are no longer published." }, { status: 409 });
  const orderedRows = propertyIds.map((id) => propertyRows.find((property) => property.id === id)).filter((property): property is (typeof propertyRows)[number] => Boolean(property));

  const guestCount = Math.max(1, Number.parseInt(String(enquiry.guests ?? "1").split("-")[0], 10) || 1);
  const guestsPerHouse = { ...defaultGuests, adults: Math.max(1, Math.ceil(guestCount / orderedRows.length)) };
  const groupReference = enquiry.conversion_group_reference || corporateReference();
  const bookingRows = [];
  for (const [index, row] of orderedRows.entries()) {
    const property = await getPublicPropertyBySlug(row.slug);
    if (!property) return NextResponse.json({ error: "Could not load a selected house for conversion." }, { status: 409 });
    const price = calculatePrice(property, arrival, departure, guestsPerHouse, true);
    bookingRows.push({
      reference: `${groupReference}-${String(index + 1).padStart(2, "0")}`,
      property_id: row.id,
      check_in: arrival,
      checkout: departure,
      adults: guestsPerHouse.adults,
      children: guestsPerHouse.children,
      infants: guestsPerHouse.infants,
      pets: guestsPerHouse.pets,
      guest_details: { firstName: enquiry.contact_name, contactName: enquiry.contact_name, email: enquiry.email, phone: enquiry.phone, companyName: enquiry.company_name },
      corporate_details: { corporate: true, enquiryId, groupReference, abn: enquiry.abn, purchaseOrder: enquiry.purchase_order, invoiceRequested: enquiry.invoice_requested === true },
      price_breakdown: price,
      total: price.total,
      currency: "AUD",
      payment_status: "pending",
      booking_status: "corporate",
      booking_type: "corporate",
      booking_source: "enquiry",
      enquiry_id: enquiryId,
      group_reference: groupReference,
      internal_notes: `Converted from ${enquiry.reference}.`,
      created_by_admin: admin.user.id,
      notes: enquiry.notes,
    });
  }

  const { data: bookings, error: insertError } = await supabase.rpc("create_booking_group", {
    p_rows: bookingRows as unknown as Json,
    p_group_reference: groupReference,
    p_enquiry_id: enquiryId,
    p_idempotency_key: `enquiry:${enquiryId}`,
  });
  if (insertError) {
    const conflict = insertError.code === "23P01" || insertError.code === "23505";
    return NextResponse.json({ error: conflict ? "Those dates are no longer available." : insertError.message || "Could not convert the enquiry into bookings." }, { status: conflict ? 409 : 500 });
  }

  const auditNote = `Converted to ${bookings?.length ?? bookingRows.length} corporate booking(s) by ${admin.admin.email}.`;
  const internalNotes = [enquiry.internal_notes?.trim(), auditNote].filter(Boolean).join("\n");
  await supabase.from("enquiries").update({ internal_notes: internalNotes }).eq("id", enquiryId);
  return NextResponse.json({ bookings: bookings?.map((booking) => ({ id: booking.id, reference: booking.reference, property_id: booking.property_id })) ?? [] }, { status: 201 });
}
