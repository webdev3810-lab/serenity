import { NextResponse } from "next/server";
import { calculatePrice, defaultGuests, reservationCode } from "@/src/lib/booking";
import { getPublicPropertyBySlug } from "@/src/lib/supabase/content";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getSuperAdminUser } from "@/src/lib/supabase/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ enquiryId: string }> }) {
  const admin = await getSuperAdminUser();
  if (!admin) return NextResponse.json({ error: "Only a super admin can convert corporate enquiries." }, { status: 403 });

  const { enquiryId } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: enquiry, error: enquiryError } = await supabase.from("enquiries").select("*").eq("id", enquiryId).maybeSingle();
  if (enquiryError) return NextResponse.json({ error: "Could not load the corporate enquiry." }, { status: 500 });
  if (!enquiry) return NextResponse.json({ error: "Corporate enquiry not found." }, { status: 404 });
  if (enquiry.status !== "approved") return NextResponse.json({ error: "Approve the enquiry before converting it to bookings." }, { status: 400 });

  const propertyIds = Array.isArray(enquiry.property_ids) ? enquiry.property_ids.filter((id): id is string => typeof id === "string") : [];
  const arrival = String(enquiry.arrival ?? "");
  const departure = String(enquiry.departure ?? "");
  if (!propertyIds.length || !arrival || !departure) return NextResponse.json({ error: "This enquiry is missing selected houses or dates." }, { status: 400 });

  const { data: propertyRows, error: propertyError } = await supabase.from("properties").select("id, slug").in("id", propertyIds).eq("published", true);
  if (propertyError || !propertyRows || propertyRows.length !== propertyIds.length) return NextResponse.json({ error: "One or more selected houses are no longer published." }, { status: 409 });
  const { data: overlapping, error: overlapError } = await supabase.from("bookings").select("property_id").in("property_id", propertyIds).in("booking_status", ["pending_payment", "confirmed", "corporate", "checked_in"]).lt("check_in", departure).gt("checkout", arrival);
  if (overlapError) return NextResponse.json({ error: "Could not verify live availability." }, { status: 500 });
  if (overlapping?.length) return NextResponse.json({ error: "One or more houses have been booked since this enquiry was received." }, { status: 409 });

  const guestCount = Math.max(1, Number.parseInt(String(enquiry.guests ?? "1").split("-")[0], 10) || 1);
  const guestsPerHouse = { ...defaultGuests, adults: Math.max(1, Math.ceil(guestCount / propertyRows.length)) };
  const bookingRows = [];
  for (const row of propertyRows) {
    const property = await getPublicPropertyBySlug(row.slug);
    if (!property) return NextResponse.json({ error: "Could not load a selected house for conversion." }, { status: 409 });
    const price = calculatePrice(property, arrival, departure, guestsPerHouse, true);
    bookingRows.push({
      reference: reservationCode(property.slug),
      property_id: row.id,
      check_in: arrival,
      checkout: departure,
      adults: guestsPerHouse.adults,
      children: guestsPerHouse.children,
      infants: guestsPerHouse.infants,
      pets: guestsPerHouse.pets,
      guest_details: { firstName: String(enquiry.contact_name ?? ""), email: String(enquiry.email ?? ""), phone: String(enquiry.phone ?? ""), companyName: String(enquiry.company_name ?? "") },
      corporate_details: { corporate: true, enquiryId, abn: String(enquiry.abn ?? ""), purchaseOrder: String(enquiry.purchase_order ?? ""), invoiceRequested: enquiry.invoice_requested === true },
      price_breakdown: price,
      total: price.total,
      currency: "AUD",
      payment_status: "pending",
      booking_status: "corporate",
      notes: String(enquiry.notes ?? ""),
    });
  }

  const { data: bookings, error: insertError } = await supabase.from("bookings").insert(bookingRows).select("id, reference, property_id");
  if (insertError) return NextResponse.json({ error: insertError.code === "23P01" ? "Those dates are no longer available." : "Could not convert the enquiry into bookings." }, { status: insertError.code === "23P01" ? 409 : 500 });
  const notes = `${String(enquiry.internal_notes ?? "").trim()} Converted to ${bookings?.length ?? bookingRows.length} corporate booking(s) by ${admin.admin.email}.`.trim();
  await supabase.from("enquiries").update({ internal_notes: notes }).eq("id", enquiryId);
  return NextResponse.json({ bookings: bookings ?? [] }, { status: 201 });
}
