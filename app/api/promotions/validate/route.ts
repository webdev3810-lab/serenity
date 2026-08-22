import { NextResponse } from "next/server";
import { calculatePrice, defaultGuests, todayIso, validateDateRange, validateGuestCapacity } from "@/src/lib/booking";
import { applyPromotionToPrice, getPromotionEligibilityError, normalizePromotionCode, normalizePromotionRow } from "@/src/lib/promotions";
import { getPublicPropertyBySlug, isLocalContentPreview } from "@/src/lib/supabase/content";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { isSupabaseConfigured } from "@/src/lib/supabase/config";

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Voucher validation is not configured." }, { status: 503 });
  try {
    const body = await request.json();
    const code = normalizePromotionCode(body.code ?? body.promotionCode);
    const propertySlug = String(body.propertySlug ?? "").trim();
    const checkIn = String(body.checkIn ?? "");
    const checkout = String(body.checkout ?? "");
    const corporate = body.corporate === true;
    if (!code || !propertySlug || !checkIn || !checkout) return NextResponse.json({ error: "Enter a voucher code after selecting the house and dates." }, { status: 400 });

    const property = await getPublicPropertyBySlug(propertySlug);
    if (!property) return NextResponse.json({ error: "Published house not found." }, { status: 404 });
    const guests = {
      adults: Math.max(1, Number(body.guests?.adults ?? defaultGuests.adults)),
      children: Math.max(0, Number(body.guests?.children ?? defaultGuests.children)),
      infants: Math.max(0, Number(body.guests?.infants ?? defaultGuests.infants)),
      pets: Math.max(0, Number(body.guests?.pets ?? defaultGuests.pets)),
    };
    const dateError = validateDateRange(property, checkIn, checkout, todayIso(), [], corporate);
    const guestError = validateGuestCapacity(property, guests);
    if (dateError || guestError) return NextResponse.json({ error: dateError || guestError }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    let propertyQuery = supabase.from("properties").select("id, published").eq("slug", propertySlug);
    if (!isLocalContentPreview) propertyQuery = propertyQuery.eq("published", true);
    const { data: propertyRow, error: propertyError } = await propertyQuery.maybeSingle();
    if (propertyError || !propertyRow) return NextResponse.json({ error: "This house is not currently available for voucher validation." }, { status: 404 });
    const { data: promotionRow, error: promotionError } = await supabase.from("promotions").select("*").ilike("code", code).maybeSingle();
    if (promotionError) return NextResponse.json({ error: "Voucher validation is temporarily unavailable." }, { status: 503 });
    if (!promotionRow) return NextResponse.json({ error: "That voucher code is not recognised." }, { status: 400 });

    const promotion = normalizePromotionRow(promotionRow as Record<string, unknown>);
    const basePrice = calculatePrice(property, checkIn, checkout, guests, corporate);
    const eligibilityError = getPromotionEligibilityError(promotion, {
      propertyId: String(propertyRow.id),
      nights: basePrice.nights,
      bookingAmount: basePrice.total,
      corporate,
      existingDiscount: basePrice.discount,
    });
    if (eligibilityError) return NextResponse.json({ error: eligibilityError }, { status: 400 });
    const price = applyPromotionToPrice(basePrice, promotion);
    return NextResponse.json({
      valid: true,
      code: promotion.code,
      discount: price.promotionDiscount ?? 0,
      price,
      promotion: {
        id: promotion.id,
        name: promotion.name,
        label: price.promotionLabel,
        discountType: promotion.discount_type,
        discountValue: promotion.discount_value,
        remaining: promotion.max_redemptions === null ? null : Math.max(0, promotion.max_redemptions - promotion.successful_redemptions - promotion.reserved_redemptions),
      },
    });
  } catch (error) {
    console.error("Promotion validation failed", error);
    return NextResponse.json({ error: "We could not validate that voucher right now." }, { status: 500 });
  }
}
