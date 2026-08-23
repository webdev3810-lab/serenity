import { NextResponse } from "next/server";
import Stripe from "stripe";
import { calculatePrice, datesInRange, defaultGuests, reservationCode, todayIso, validateDateRange, validateGuestCapacity } from "@/src/lib/booking";
import { getPublicPropertyBySlug, isLocalContentPreview } from "@/src/lib/supabase/content";
import { isSupabaseConfigured } from "@/src/lib/supabase/config";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { applyPromotionToPrice, getPromotionEligibilityError, normalizePromotionCode, normalizePromotionRow, type PromotionRecord } from "@/src/lib/promotions";

const getRequestOrigin = (request: Request) => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
};

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY || !stripeSecretKey) {
    return NextResponse.json(
      { configured: false, error: "Online booking is not configured yet. Please contact Serenity to complete your reservation." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { propertySlug, checkIn, checkout, guests: rawGuests, guestDetails, corporateDetails, notes } = body;
    const promotionCode = normalizePromotionCode(body.promotionCode);
    const email = String(guestDetails?.email ?? "").trim();
    if (!propertySlug || !checkIn || !checkout || !email) {
      return NextResponse.json({ error: "Property, dates, and guest email are required." }, { status: 400 });
    }
    if (!email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid guest email address." }, { status: 400 });
    }

    const property = await getPublicPropertyBySlug(propertySlug);
    if (!property) return NextResponse.json({ error: "Published property not found." }, { status: 404 });
    const guests = {
      adults: Math.max(1, Number(rawGuests?.adults ?? defaultGuests.adults)),
      children: Math.max(0, Number(rawGuests?.children ?? defaultGuests.children)),
      infants: Math.max(0, Number(rawGuests?.infants ?? defaultGuests.infants)),
      pets: Math.max(0, Number(rawGuests?.pets ?? defaultGuests.pets)),
    };

    const supabase = createSupabaseAdminClient();
    let propertyQuery = supabase
      .from("properties")
      .select("id, unavailable_dates")
      .eq("slug", propertySlug);
    if (!isLocalContentPreview) propertyQuery = propertyQuery.eq("published", true);
    const { data: propertyRow, error: propertyError } = await propertyQuery.maybeSingle();
    if (propertyError) {
      console.error("Booking property lookup failed", propertyError);
      return NextResponse.json({ error: "The booking database could not load this house. Please try again shortly." }, { status: 500 });
    }
    if (!propertyRow) {
      return NextResponse.json({
        error: isLocalContentPreview
          ? "This house is visible in local preview, but its Supabase property record has not been seeded yet. Run supabase/seed.sql, then try again."
          : "This house is not currently published for booking.",
      }, { status: 404 });
    }

    const [{ data: overlappingBookings, error: overlapError }, { data: calendarEvents, error: calendarError }] = await Promise.all([
      supabase
        .from("bookings")
        .select("check_in, checkout")
        .eq("property_id", propertyRow.id)
        .in("booking_status", ["pending_payment", "confirmed", "corporate", "checked_in"])
        .lt("check_in", checkout)
        .gt("checkout", checkIn),
      supabase
        .from("calendar_events")
        .select("start_date, end_date")
        .eq("property_id", propertyRow.id)
        .eq("status", "active")
        .eq("is_blocking", true)
        .lt("start_date", checkout)
        .gt("end_date", checkIn),
    ]);
    if (overlapError) throw overlapError;
    if (calendarError) throw calendarError;
    const bookedDates = (overlappingBookings ?? []).flatMap((booking) => datesInRange(booking.check_in, booking.checkout));
    const importedBlockedDates = (calendarEvents ?? []).flatMap((event) => datesInRange(event.start_date, event.end_date));
    const corporate = corporateDetails?.corporate === true;
    const dateError = validateDateRange(property, checkIn, checkout, todayIso(), [...bookedDates, ...importedBlockedDates], corporate);
    const guestError = validateGuestCapacity(property, guests);
    if (dateError || guestError) return NextResponse.json({ error: dateError || guestError }, { status: 400 });
    if (corporate && property.minimumCorporateHouses > 1) {
      return NextResponse.json({ error: `This house requires at least ${property.minimumCorporateHouses} houses for a corporate booking. Please submit a corporate enquiry.` }, { status: 400 });
    }

    const basePrice = calculatePrice(property, checkIn, checkout, guests, corporate);
    if (!basePrice.nights || basePrice.total <= 0) return NextResponse.json({ error: "Invalid booking dates or price." }, { status: 400 });

    let promotion: PromotionRecord | null = null;
    let price = basePrice;
    if (promotionCode) {
      const { data: promotionRow, error: promotionError } = await supabase
        .from("promotions")
        .select("*")
        .ilike("code", promotionCode)
        .maybeSingle();
      if (promotionError) {
        console.error("Promotion lookup failed", promotionError);
        return NextResponse.json({ error: "Voucher codes are temporarily unavailable. Please try again shortly." }, { status: 503 });
      }
      if (!promotionRow) return NextResponse.json({ error: "That voucher code is not recognised." }, { status: 400 });
      promotion = normalizePromotionRow(promotionRow as Record<string, unknown>);
      const promotionErrorMessage = getPromotionEligibilityError(promotion, {
        propertyId: String(propertyRow.id),
        nights: basePrice.nights,
        bookingAmount: basePrice.total,
        corporate,
        existingDiscount: basePrice.discount,
      });
      if (promotionErrorMessage) return NextResponse.json({ error: promotionErrorMessage }, { status: 400 });
      price = applyPromotionToPrice(basePrice, promotion);
    }

    const reference = reservationCode(propertySlug);
    const { data: booking, error } = await supabase.from("bookings").insert({
      reference,
      property_id: propertyRow.id,
      check_in: checkIn,
      checkout,
      adults: guests.adults,
      children: guests.children,
      infants: guests.infants,
      pets: guests.pets,
      guest_details: guestDetails,
      corporate_details: corporateDetails ?? {},
      price_breakdown: price,
      total: price.total,
      currency: "AUD",
      promotion_id: promotion?.id ?? null,
      promotion_code: promotion?.code ?? null,
      promotion_discount: price.promotionDiscount ?? 0,
      payment_status: "pending",
      booking_status: corporate ? "corporate" : "pending_payment",
      booking_type: corporate ? "corporate" : "standard",
      booking_source: "website",
      notes: notes ?? guestDetails.requests ?? "",
    }).select("id, reference").single();

    if (error) {
      if (error.code === "23P01") return NextResponse.json({ error: "Those dates are no longer available." }, { status: 409 });
      throw error;
    }

    let promotionRedemptionId: string | null = null;
    if (promotion) {
      const { data: redemptionId, error: redemptionError } = await supabase.rpc("reserve_promotion_redemption", {
        p_promotion_id: promotion.id,
        p_booking_id: booking.id,
        p_code: promotion.code,
        p_discount_amount: price.promotionDiscount ?? 0,
      });
      if (redemptionError || !redemptionId) {
        await supabase.from("bookings").update({ booking_status: "cancelled" }).eq("id", booking.id);
        return NextResponse.json({ error: redemptionError?.message?.includes("sold out") ? "That voucher has just reached its redemption limit." : "That voucher is no longer available. Please try again." }, { status: 409 });
      }
      promotionRedemptionId = String(redemptionId);
      const { error: redemptionLinkError } = await supabase.from("bookings").update({ promotion_redemption_id: promotionRedemptionId }).eq("id", booking.id);
      if (redemptionLinkError) {
        await supabase.rpc("release_promotion_redemption", { p_booking_id: booking.id });
        await supabase.from("bookings").update({ booking_status: "cancelled" }).eq("id", booking.id);
        throw redemptionLinkError;
      }
    }

    const stripe = new Stripe(stripeSecretKey);
    const origin = getRequestOrigin(request);
    const successUrl = `${origin}/booking/confirmation?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/booking/payment?payment=cancelled&reference=${encodeURIComponent(reference)}`;
    const nightlyRateMetadata = price.nightlyRates.map((night) => `${night.date}:${night.nightlyPrice}${night.isOverride ? "*" : ""}`).join(",").slice(0, 450);
    const guestName = `${String(guestDetails?.firstName ?? "").trim()} ${String(guestDetails?.lastName ?? "").trim()}`.trim();
    const companyName = String(corporateDetails?.companyName ?? "").trim();
    const metadata: Record<string, string> = {
      bookingId: String(booking.id),
      reference,
      propertyId: String(propertyRow.id),
      propertySlug: property.slug,
      propertyName: property.name.slice(0, 120),
      checkIn,
      checkout,
      currency: "AUD",
      guestEmail: email.slice(0, 150),
      guestName: (guestName || "Guest").slice(0, 120),
      corporate: corporate ? "true" : "false",
      companyName: companyName.slice(0, 160),
      nights: String(price.nights),
      nightlyRates: nightlyRateMetadata,
      nightlySubtotal: String(price.nightlySubtotal),
      cleaningFee: String(price.cleaningFee),
      petFee: String(price.petFee),
      extraGuestFee: String(price.extraGuestFee),
      totalDiscount: String(price.discount),
      gst: String(price.tax),
      totalAud: String(price.total),
      availabilityChecked: "serenity,airbnb,vrbo,stayz,admin",
      availabilityCheckedAt: new Date().toISOString(),
    };
    if (promotion) {
      metadata.promotionId = promotion.id;
      metadata.promotionCode = promotion.code;
      metadata.promotionDiscount = String(price.promotionDiscount ?? 0);
      if (promotionRedemptionId) metadata.promotionRedemptionId = promotionRedemptionId;
    }
    let session: Stripe.Checkout.Session;

    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        // Keep every Serenity checkout in the property's AUD price instead of
        // allowing Stripe Adaptive Pricing to offer a converted local currency.
        adaptive_pricing: { enabled: false },
        customer_email: email,
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items: [{
          price_data: {
            currency: "aud",
            product_data: {
              name: `${property.name} direct booking`,
              description: `${price.nights} night stay from ${checkIn} to ${checkout}. Includes cleaning, GST, and applicable discounts${promotion ? `, including ${promotion.code}` : ""}.`,
            },
            unit_amount: Math.round(price.total * 100),
          },
          quantity: 1,
        }],
        metadata,
        payment_intent_data: {
          metadata,
          description: `Serenity reservation ${reference}`,
        },
      });
    } catch (stripeError) {
      if (promotionRedemptionId) await supabase.rpc("release_promotion_redemption", { p_booking_id: booking.id });
      await supabase.from("bookings").update({ booking_status: "cancelled" }).eq("id", booking.id);
      throw stripeError;
    }

    if (!session.url) {
      if (promotionRedemptionId) await supabase.rpc("release_promotion_redemption", { p_booking_id: booking.id });
      await supabase.from("bookings").update({ booking_status: "cancelled" }).eq("id", booking.id);
      throw new Error("Stripe did not return a checkout URL.");
    }

    const { error: sessionUpdateError } = await supabase
      .from("bookings")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", booking.id);
    if (sessionUpdateError) {
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
      if (promotionRedemptionId) await supabase.rpc("release_promotion_redemption", { p_booking_id: booking.id });
      await supabase.from("bookings").update({ booking_status: "cancelled" }).eq("id", booking.id);
      throw sessionUpdateError;
    }

    return NextResponse.json({ configured: true, checkoutUrl: session.url, booking });
  } catch (error) {
    console.error("Booking persistence failed", error);
    return NextResponse.json({ error: "We could not start secure checkout. Please try again." }, { status: 500 });
  }
}
