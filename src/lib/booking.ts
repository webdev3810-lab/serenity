import type { Property } from "@/src/data/properties";
import { AU_LOCALE, AU_TIME_ZONE } from "@/src/lib/localization";

export type GuestCounts = {
  adults: number;
  children: number;
  infants: number;
  pets: number;
};

export type BookingState = {
  propertySlug?: string;
  propertySlugs?: string[];
  checkIn?: string;
  checkout?: string;
  guests: GuestCounts;
  corporate?: boolean;
  guestDetails?: Record<string, string | boolean>;
  reservationReference?: string;
  paymentStatus?: "pending" | "paid" | "failed";
  promotionCode?: string;
};

export type PriceBreakdown = {
  nights: number;
  nightlySubtotal: number;
  cleaningFee: number;
  petFee: number;
  extraGuestFee: number;
  discount: number;
  discountLabel: string;
  nightlyRateSummary: string;
  tax: number;
  total: number;
  promotionDiscount?: number;
  promotionCode?: string;
  promotionId?: string;
  promotionLabel?: string;
};

export const defaultGuests: GuestCounts = { adults: 2, children: 0, infants: 0, pets: 0 };

export const formatAud = (amount: number) =>
  new Intl.NumberFormat(AU_LOCALE, { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(amount);

const padDatePart = (value: number) => String(value).padStart(2, "0");

export const dateToIso = (date: Date) => `${date.getUTCFullYear()}-${padDatePart(date.getUTCMonth() + 1)}-${padDatePart(date.getUTCDate())}`;

export const getNightlyPrice = (property: Property, date?: string) => {
  if (!date) return property.nightlyPrice;
  return property.datePrices?.find((override) => override.date === date)?.nightlyPrice ?? property.nightlyPrice;
};

export const todayIso = () => {
  const parts = new Intl.DateTimeFormat(AU_LOCALE, {
    timeZone: AU_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

export const formatDateAu = (iso?: string) => {
  if (!iso) return "";
  // Treat booking dates as calendar dates so daylight-saving transitions
  // cannot change the displayed day.
  return new Intl.DateTimeFormat(AU_LOCALE, {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00Z`));
};

export const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const nightsBetween = (checkIn?: string, checkout?: string) => {
  if (!checkIn || !checkout) return 0;
  const start = new Date(`${checkIn}T00:00:00Z`).getTime();
  const end = new Date(`${checkout}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((end - start) / 86400000));
};

export const datesInRange = (checkIn: string, checkout: string) => {
  const dates: string[] = [];
  let cursor = checkIn;
  while (cursor < checkout) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
};

export const hasUnavailableConflict = (property: Property, checkIn?: string, checkout?: string, blockedDates: string[] = []) => {
  if (!checkIn || !checkout) return false;
  const blocked = new Set([...property.unavailableDates, ...blockedDates]);
  return datesInRange(checkIn, checkout).some((date) => blocked.has(date));
};

export const validateDateRange = (property: Property, checkIn?: string, checkout?: string, today = todayIso(), blockedDates: string[] = [], corporate = false) => {
  if (!checkIn || !checkout) return "Select check-in and checkout dates.";
  if (checkIn < today) return "Check-in cannot be in the past.";
  if (!property.sameDayBookingAllowed && checkIn === today) return "Same-day bookings are not available for this house.";
  const earliestAllowed = addDays(today, Math.max(0, property.minimumAdvanceNoticeDays));
  if (checkIn < earliestAllowed) return `Please book at least ${property.minimumAdvanceNoticeDays} day${property.minimumAdvanceNoticeDays === 1 ? "" : "s"} in advance.`;
  const latestAllowed = addDays(today, Math.max(0, property.maximumAdvanceBookingDays));
  if (checkIn > latestAllowed) return `This house can be booked up to ${property.maximumAdvanceBookingDays} days ahead.`;
  if (checkout <= checkIn) return "Checkout must be after check-in.";
  const nights = nightsBetween(checkIn, checkout);
  if (nights < property.minimumStay) return `${property.name} has a ${property.minimumStay}-night minimum stay.`;
  if (nights > property.maximumStay) return `${property.name} allows stays of up to ${property.maximumStay} nights.`;
  if (!property.weekendBookingAllowed) {
    const hasWeekend = datesInRange(checkIn, checkout).some((date) => [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay()));
    if (hasWeekend) return "Weekend nights are not available for this house.";
  }
  if (corporate && !property.corporateBookingAllowed) return "Corporate bookings are not available for this house.";
  if (corporate && nights < property.minimumCorporateStay) return `Corporate stays require at least ${property.minimumCorporateStay} nights.`;
  if (hasUnavailableConflict(property, checkIn, checkout, blockedDates)) return "Those dates overlap unavailable or already booked nights.";
  return "";
};

export const totalStayingGuests = (guests: GuestCounts) => guests.adults + guests.children;

export const validateGuestCapacity = (property: Property, guests: GuestCounts) => {
  if (guests.adults < 1) return "At least one adult is required.";
  if (totalStayingGuests(guests) < property.minimumGuests) return `This house requires at least ${property.minimumGuests} staying guest${property.minimumGuests === 1 ? "" : "s"}.`;
  if (totalStayingGuests(guests) > property.maxGuests) return `Maximum capacity is ${property.maxGuests} guests, excluding infants.`;
  if (guests.adults > property.maximumAdults) return `This house allows up to ${property.maximumAdults} adults.`;
  if (guests.children > property.maximumChildren) return `This house allows up to ${property.maximumChildren} children.`;
  if (guests.infants > property.maximumInfants) return `This house allows up to ${property.maximumInfants} infants.`;
  if (guests.pets > property.maximumPets) return `This house allows up to ${property.maximumPets} pets.`;
  if (guests.pets > 0 && !property.petsAllowed) return "Pets are not permitted at this house.";
  return "";
};

export const calculatePrice = (property: Property, checkIn?: string, checkout?: string, guests: GuestCounts = defaultGuests, corporate = false): PriceBreakdown => {
  const nights = nightsBetween(checkIn, checkout);
  const nightlyRates = checkIn && checkout ? datesInRange(checkIn, checkout).map((date) => getNightlyPrice(property, date)) : [];
  const nightlySubtotal = nightlyRates.reduce((total, rate) => total + rate, 0);
  const hasDatedRate = nightlyRates.some((rate) => rate !== property.nightlyPrice);
  const petFee = guests.pets > 0 ? property.petFee : 0;
  const extraGuests = Math.max(0, totalStayingGuests(guests) - property.extraGuestThreshold);
  const extraGuestFee = extraGuests * property.extraGuestFee * nights;
  const longerStayDiscount = nights >= 28 ? property.monthlyDiscount : nights >= 7 ? property.weeklyDiscount : 0;
  const discountRate = corporate ? Math.max(longerStayDiscount, property.corporateDiscount) : longerStayDiscount;
  const discount = Math.round((nightlySubtotal * discountRate) / 100);
  const taxable = nightlySubtotal + property.cleaningFee + petFee + extraGuestFee - discount;
  const tax = Math.round(taxable * 0.1);
  return {
    nights,
    nightlySubtotal,
    cleaningFee: property.cleaningFee,
    petFee,
    extraGuestFee,
    discount,
    discountLabel: discountRate ? (corporate && property.corporateDiscount >= longerStayDiscount ? `${discountRate}% corporate discount` : `${discountRate}% longer-stay discount`) : "",
    nightlyRateSummary: hasDatedRate ? "Nightly accommodation (seasonal rates applied)" : `${formatAud(property.nightlyPrice)} × ${nights} night${nights === 1 ? "" : "s"}`,
    tax,
    total: taxable + tax,
  };
};

export const reservationCode = (propertySlug = "serenity-7") => {
  const number = propertySlug.split("-").at(-1) ?? "7";
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SER-${number}-${suffix}`;
};
