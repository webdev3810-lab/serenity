import type { PriceBreakdown } from "@/src/lib/booking";

export type PromotionDiscountType = "percentage" | "fixed_aud";
export type PromotionStatus = "draft" | "scheduled" | "active" | "expired" | "sold_out" | "disabled";

export type PromotionRecord = {
  id: string;
  name: string;
  badge_text: string;
  message: string;
  mobile_message: string;
  code: string;
  discount_type: PromotionDiscountType;
  discount_value: number;
  starts_at: string | null;
  ends_at: string | null;
  max_redemptions: number | null;
  successful_redemptions: number;
  reserved_redemptions: number;
  minimum_booking_amount: number;
  minimum_nights: number;
  applicable_property_ids: string[];
  applies_to_corporate: boolean;
  stackable: boolean;
  restore_on_refund: boolean;
  active: boolean;
  published: boolean;
  header_visible: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PromotionCalculation = {
  promotionId: string;
  promotionCode: string;
  promotionDiscount: number;
  promotionLabel: string;
};

export const PROMOTION_LIMITS = {
  name: 80,
  badgeText: 40,
  message: 140,
  mobileMessage: 90,
  code: 40,
};

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const numberValue = (value: unknown, fallback = 0) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
};

export const normalizePromotionCode = (value: unknown) => text(value).toUpperCase();

export function normalizePromotionRow(row: Record<string, unknown>): PromotionRecord {
  return {
    id: text(row.id),
    name: text(row.name),
    badge_text: text(row.badge_text ?? row.badge),
    message: text(row.message),
    mobile_message: text(row.mobile_message ?? row.message),
    code: normalizePromotionCode(row.code),
    discount_type: row.discount_type === "fixed_aud" ? "fixed_aud" : "percentage",
    discount_value: numberValue(row.discount_value),
    starts_at: row.starts_at ? String(row.starts_at) : null,
    ends_at: row.ends_at ? String(row.ends_at) : null,
    max_redemptions: row.max_redemptions === null || row.max_redemptions === undefined || row.max_redemptions === "" ? null : Math.max(0, Math.trunc(numberValue(row.max_redemptions))),
    successful_redemptions: Math.max(0, Math.trunc(numberValue(row.successful_redemptions))),
    reserved_redemptions: Math.max(0, Math.trunc(numberValue(row.reserved_redemptions))),
    minimum_booking_amount: Math.max(0, numberValue(row.minimum_booking_amount)),
    minimum_nights: Math.max(0, Math.trunc(numberValue(row.minimum_nights))),
    applicable_property_ids: Array.isArray(row.applicable_property_ids) ? row.applicable_property_ids.map(String).filter(Boolean) : [],
    applies_to_corporate: row.applies_to_corporate === true,
    stackable: row.stackable === true,
    restore_on_refund: row.restore_on_refund === true,
    active: row.active !== false,
    published: row.published === true,
    header_visible: row.header_visible !== false,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export function promotionRemaining(promotion: Pick<PromotionRecord, "max_redemptions" | "successful_redemptions" | "reserved_redemptions">) {
  if (promotion.max_redemptions === null) return null;
  return Math.max(0, promotion.max_redemptions - promotion.successful_redemptions - promotion.reserved_redemptions);
}

export function getPromotionStatus(promotion: PromotionRecord, now = new Date()): PromotionStatus {
  if (!promotion.active) return "disabled";
  if (!promotion.published) return "draft";
  if (promotion.starts_at && now < new Date(promotion.starts_at)) return "scheduled";
  if (promotion.ends_at && now >= new Date(promotion.ends_at)) return "expired";
  if (promotionRemaining(promotion) === 0) return "sold_out";
  return "active";
}

export function getPromotionEligibilityError(
  promotion: PromotionRecord,
  context: { propertyId?: string; nights: number; bookingAmount: number; corporate?: boolean; existingDiscount?: number; now?: Date },
) {
  const status = getPromotionStatus(promotion, context.now);
  if (status !== "active") {
    return status === "sold_out" ? "This promotion has reached its redemption limit." : "This promotion is not currently available.";
  }
  if (context.bookingAmount < promotion.minimum_booking_amount) return `This code requires a minimum booking amount of ${formatAudNumber(promotion.minimum_booking_amount)}.`;
  if (context.nights < promotion.minimum_nights) return `This code requires a minimum stay of ${promotion.minimum_nights} nights.`;
  if (promotion.applicable_property_ids.length && (!context.propertyId || !promotion.applicable_property_ids.includes(context.propertyId))) return "This code does not apply to the selected house.";
  if (context.corporate && !promotion.applies_to_corporate) return "This code is not available for corporate bookings.";
  if (!promotion.stackable && (context.existingDiscount ?? 0) > 0) return "This code cannot be combined with the selected house discount.";
  return "";
}

const formatAudNumber = (amount: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(amount);

export function calculatePromotionDiscount(promotion: PromotionRecord, bookingAmount: number) {
  if (promotion.discount_type === "fixed_aud") return Math.min(Math.max(0, bookingAmount), Math.max(0, promotion.discount_value));
  return Math.min(Math.max(0, bookingAmount), Math.round((bookingAmount * promotion.discount_value) / 100));
}

export function applyPromotionToPrice(price: PriceBreakdown, promotion: PromotionRecord): PriceBreakdown {
  const baseTaxable = Math.max(0, price.nightlySubtotal + price.cleaningFee + price.petFee + price.extraGuestFee - price.discount);
  const promotionDiscount = calculatePromotionDiscount(promotion, price.total);
  const taxable = Math.max(0, baseTaxable - promotionDiscount);
  const tax = Math.round(taxable * 0.1);
  const promotionLabel = promotion.discount_type === "percentage"
    ? `${promotion.discount_value}% promotion (${promotion.code})`
    : `${formatAudNumber(promotion.discount_value)} promotion (${promotion.code})`;
  return {
    ...price,
    discount: price.discount + promotionDiscount,
    discountLabel: price.discountLabel,
    promotionDiscount,
    promotionCode: promotion.code,
    promotionId: promotion.id,
    promotionLabel,
    tax,
    total: taxable + tax,
  };
}

export function validatePromotionInput(body: Record<string, unknown>, existing?: Partial<PromotionRecord>) {
  const merged = { ...existing, ...body } as Record<string, unknown>;
  const name = text(merged.name);
  const badgeText = text(merged.badge_text ?? merged.badgeText);
  const message = text(merged.message);
  const mobileMessage = text(merged.mobile_message ?? merged.mobileMessage);
  const code = normalizePromotionCode(merged.code);
  const discountType: PromotionDiscountType = merged.discount_type === "fixed_aud" || merged.discountType === "fixed_aud" ? "fixed_aud" : "percentage";
  const discountValue = numberValue(merged.discount_value ?? merged.discountValue, -1);
  const startsAt = merged.starts_at || merged.startsAt ? String(merged.starts_at ?? merged.startsAt) : null;
  const endsAt = merged.ends_at || merged.endsAt ? String(merged.ends_at ?? merged.endsAt) : null;
  const maxRaw = merged.max_redemptions ?? merged.maxRedemptions;
  const maxRedemptions = maxRaw === null || maxRaw === undefined || maxRaw === "" ? null : numberValue(maxRaw, -1);
  const minimumBookingAmount = numberValue(merged.minimum_booking_amount ?? merged.minimumBookingAmount);
  const minimumNights = numberValue(merged.minimum_nights ?? merged.minimumNights);
  const applicableRaw = merged.applicable_property_ids ?? merged.applicablePropertyIds;
  const applicablePropertyIds = Array.isArray(applicableRaw) ? applicableRaw.map(String).filter(Boolean) : [];
  const errors: string[] = [];
  if (!name) errors.push("Promotion name is required.");
  if (!badgeText) errors.push("Badge text is required.");
  if (!message) errors.push("Desktop message is required.");
  if (!mobileMessage) errors.push("Mobile message is required.");
  if (!code) errors.push("Voucher code is required.");
  if (name.length > PROMOTION_LIMITS.name) errors.push(`Promotion name must be ${PROMOTION_LIMITS.name} characters or fewer.`);
  if (badgeText.length > PROMOTION_LIMITS.badgeText) errors.push(`Badge text must be ${PROMOTION_LIMITS.badgeText} characters or fewer.`);
  if (message.length > PROMOTION_LIMITS.message) errors.push(`Desktop message must be ${PROMOTION_LIMITS.message} characters or fewer.`);
  if (mobileMessage.length > PROMOTION_LIMITS.mobileMessage) errors.push(`Mobile message must be ${PROMOTION_LIMITS.mobileMessage} characters or fewer.`);
  if (code.length > PROMOTION_LIMITS.code || !/^[A-Z0-9_-]+$/.test(code)) errors.push("Voucher code must use up to 40 letters, numbers, hyphens, or underscores.");
  if (discountValue < 0 || (discountType === "percentage" && discountValue > 100)) errors.push(discountType === "percentage" ? "Percentage discount must be between 0 and 100." : "Fixed AUD discount must be zero or greater.");
  if (maxRedemptions !== null && (!Number.isInteger(maxRedemptions) || maxRedemptions <= 0)) errors.push("Maximum redemptions must be a positive whole number or blank.");
  if (minimumBookingAmount < 0) errors.push("Minimum booking amount cannot be negative.");
  if (!Number.isInteger(minimumNights) || minimumNights < 0) errors.push("Minimum nights must be a whole number of zero or more.");
  if (startsAt && Number.isNaN(new Date(startsAt).getTime())) errors.push("Start date must be a valid date.");
  if (endsAt && Number.isNaN(new Date(endsAt).getTime())) errors.push("End date must be a valid date.");
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) errors.push("End date must be after the start date.");
  return {
    errors,
    value: {
      name, badge_text: badgeText, message, mobile_message: mobileMessage, code,
      discount_type: discountType, discount_value: discountValue,
      starts_at: startsAt, ends_at: endsAt, max_redemptions: maxRedemptions,
      minimum_booking_amount: minimumBookingAmount, minimum_nights: minimumNights,
      applicable_property_ids: applicablePropertyIds,
      applies_to_corporate: merged.applies_to_corporate === true || merged.appliesToCorporate === true,
      stackable: merged.stackable === true,
      restore_on_refund: merged.restore_on_refund === true || merged.restoreOnRefund === true,
      active: merged.active !== false,
      published: merged.published === true,
      header_visible: merged.header_visible !== false && merged.headerVisible !== false,
    },
  };
}
