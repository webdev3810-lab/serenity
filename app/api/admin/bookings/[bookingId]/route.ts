import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { refundCancelledBooking } from "@/src/lib/adminBookingRefund";
import { isAppManagedBookingSource } from "@/src/lib/booking-source";
import { cancellationRefundPreview } from "@/src/lib/cancellationPolicy";

const BOOKING_STATUSES = ["pending_payment", "confirmed", "corporate", "cancelled", "checked_in", "checked_out", "expired"] as const;
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded", "partially_refunded"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  const { bookingId } = await params;
  try {
    const body = await request.json() as { bookingStatus?: string; paymentStatus?: string; internalNotes?: string; cancellationReason?: string; archived?: boolean };
    if (body.bookingStatus && !BOOKING_STATUSES.includes(body.bookingStatus as (typeof BOOKING_STATUSES)[number])) return NextResponse.json({ error: "Invalid booking status." }, { status: 400 });
    if (body.paymentStatus && !PAYMENT_STATUSES.includes(body.paymentStatus as (typeof PAYMENT_STATUSES)[number])) return NextResponse.json({ error: "Invalid payment status." }, { status: 400 });
    const internalNotes = String(body.internalNotes ?? "").trim();
    const cancellationReason = String(body.cancellationReason ?? "").trim();
    if (internalNotes.length > 4000 || cancellationReason.length > 500) return NextResponse.json({ error: "Please shorten the internal note or cancellation reason." }, { status: 400 });
    if (body.archived !== undefined && (typeof body.archived !== "boolean" || body.bookingStatus || body.paymentStatus)) return NextResponse.json({ error: "Archive changes must be saved separately from booking or payment changes." }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data: existing, error: readError } = await supabase.from("bookings").select("id, reference, group_reference, total, currency, booking_source, booking_status, payment_status, free_cancellation_until, late_cancellation_fee, archived_at, stripe_checkout_session_id, stripe_payment_intent_id, internal_notes, promotion_redemption_id").eq("id", bookingId).maybeSingle();
    if (readError) throw readError;
    if (!existing) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (!isAppManagedBookingSource(existing.booking_source)) {
      return NextResponse.json({ error: "This reservation came from an external platform and is read-only here. Manage it on the original platform." }, { status: 403 });
    }
    if (existing.stripe_checkout_session_id && body.paymentStatus && body.paymentStatus !== existing.payment_status) {
      return NextResponse.json({ error: "Stripe payment status is managed by verified payment events. Use Stripe for refunds or check the Payments tab." }, { status: 409 });
    }
    if (["refunded", "partially_refunded"].includes(existing.payment_status) && body.bookingStatus && body.bookingStatus !== "cancelled") {
      return NextResponse.json({ error: "A refunded booking cannot be reactivated. Create a new booking instead." }, { status: 409 });
    }
    if (body.archived === true && !["cancelled", "expired", "checked_out"].includes(existing.booking_status)) {
      return NextResponse.json({ error: "Cancel or complete this booking before archiving it. Archiving alone does not free its dates or refund a payment." }, { status: 409 });
    }
    const cancelling = body.bookingStatus === "cancelled" && existing.booking_status !== "cancelled";
    const paidStripeCancellation = Boolean(cancelling && existing.payment_status === "paid" && existing.stripe_checkout_session_id);
    const totalCents = Math.round(Number(existing.total) * 100);
    const lateFee = existing.late_cancellation_fee === null ? null : Number(existing.late_cancellation_fee);
    const preview = paidStripeCancellation ? cancellationRefundPreview(Number(existing.total), existing.free_cancellation_until, lateFee) : null;
    const retainedCents = preview?.retainedCents ?? 0;
    const refundCents = preview?.refundCents ?? 0;
    const refund = refundCents > 0 ? await refundCancelledBooking(existing, refundCents) : null;
    const auditChanges = [
      body.bookingStatus && body.bookingStatus !== existing.booking_status ? `booking ${existing.booking_status} → ${body.bookingStatus}` : "",
      body.paymentStatus && body.paymentStatus !== existing.payment_status ? `payment ${existing.payment_status} → ${body.paymentStatus}` : "",
      cancellationReason ? `reason: ${cancellationReason}` : "",
      cancelling && existing.payment_status === "paid" && !refund && !preview ? "no automatic refund; review the payment separately" : "",
      retainedCents > 0 ? `late cancellation fee AUD ${(retainedCents / 100).toFixed(2)}` : "",
      refund ? `Stripe refund ${refund.id} (${refund.status}, AUD ${(refund.amount / 100).toFixed(2)})` : "",
      body.archived === true && !existing.archived_at ? "archived" : body.archived === false && existing.archived_at ? "restored from archive" : "",
    ].filter(Boolean).join("; ");
    const audit = auditChanges ? `[${new Date().toISOString()}] ${admin.admin.email}: ${auditChanges}` : "";
    const nextNotes = [body.internalNotes !== undefined ? internalNotes : existing.internal_notes, audit].filter(Boolean).join("\n").slice(0, 4000);
    const update = {
      ...(body.bookingStatus ? { booking_status: body.bookingStatus } : {}),
      ...(refund?.status === "succeeded" ? { payment_status: refundCents === totalCents ? "refunded" : "partially_refunded" } : body.paymentStatus ? { payment_status: body.paymentStatus } : {}),
      ...(preview ? { cancellation_fee_retained: retainedCents / 100 } : {}),
      ...(refund ? { stripe_refund_id: refund.id, refund_amount: refund.amount / 100, refund_status: refund.status } : {}),
      ...(body.archived !== undefined ? { archived_at: body.archived ? existing.archived_at ?? new Date().toISOString() : null } : {}),
      internal_notes: nextNotes,
    };
    const { data, error } = await supabase.from("bookings").update(update).eq("id", bookingId).select("*").single();
    if (error) {
      if (refund) return NextResponse.json({ error: `Stripe created refund ${refund.id}, but the booking record could not be updated. Check Stripe and retry saving this cancellation; it will not create a second refund.` }, { status: 503 });
      if (error.code === "23P01") return NextResponse.json({ error: "That status would reactivate dates that are now blocked." }, { status: 409 });
      throw error;
    }
    if (body.bookingStatus === "cancelled" && existing.promotion_redemption_id) {
      const { error: releaseError } = await supabase.rpc("release_promotion_redemption", { p_booking_id: bookingId });
      if (releaseError) console.error("Could not release promotion after booking cancellation", bookingId, releaseError);
    }
    return NextResponse.json({ booking: data, retainedFeeCents: retainedCents, refund: refund ? { id: refund.id, amount: refund.amount, status: refund.status } : null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the booking." }, { status: 500 });
  }
}
