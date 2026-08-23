import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAdminUser } from "@/src/lib/supabase/auth";

const BOOKING_STATUSES = ["pending_payment", "confirmed", "corporate", "cancelled", "checked_in", "checked_out", "expired"] as const;
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  const { bookingId } = await params;
  try {
    const body = await request.json() as { bookingStatus?: string; paymentStatus?: string; internalNotes?: string; cancellationReason?: string };
    if (body.bookingStatus && !BOOKING_STATUSES.includes(body.bookingStatus as (typeof BOOKING_STATUSES)[number])) return NextResponse.json({ error: "Invalid booking status." }, { status: 400 });
    if (body.paymentStatus && !PAYMENT_STATUSES.includes(body.paymentStatus as (typeof PAYMENT_STATUSES)[number])) return NextResponse.json({ error: "Invalid payment status." }, { status: 400 });
    const internalNotes = String(body.internalNotes ?? "").trim();
    const cancellationReason = String(body.cancellationReason ?? "").trim();
    if (internalNotes.length > 4000 || cancellationReason.length > 500) return NextResponse.json({ error: "Please shorten the internal note or cancellation reason." }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data: existing, error: readError } = await supabase.from("bookings").select("id, booking_status, payment_status, internal_notes, promotion_redemption_id").eq("id", bookingId).maybeSingle();
    if (readError) throw readError;
    if (!existing) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    const auditChanges = [
      body.bookingStatus && body.bookingStatus !== existing.booking_status ? `booking ${existing.booking_status} → ${body.bookingStatus}` : "",
      body.paymentStatus && body.paymentStatus !== existing.payment_status ? `payment ${existing.payment_status} → ${body.paymentStatus}` : "",
      cancellationReason ? `reason: ${cancellationReason}` : "",
    ].filter(Boolean).join("; ");
    const audit = auditChanges ? `[${new Date().toISOString()}] ${admin.admin.email}: ${auditChanges}` : "";
    const nextNotes = [internalNotes || existing.internal_notes, audit].filter(Boolean).join("\n").slice(0, 4000);
    const update = {
      ...(body.bookingStatus ? { booking_status: body.bookingStatus } : {}),
      ...(body.paymentStatus ? { payment_status: body.paymentStatus } : {}),
      internal_notes: nextNotes,
    };
    const { data, error } = await supabase.from("bookings").update(update).eq("id", bookingId).select("*").single();
    if (error) {
      if (error.code === "23P01") return NextResponse.json({ error: "That status would reactivate dates that are now blocked." }, { status: 409 });
      throw error;
    }
    if (body.bookingStatus === "cancelled" && existing.promotion_redemption_id) await supabase.rpc("release_promotion_redemption", { p_booking_id: bookingId });
    return NextResponse.json({ booking: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the booking." }, { status: 500 });
  }
}
