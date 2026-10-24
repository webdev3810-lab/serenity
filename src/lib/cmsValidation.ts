import { validateRooms } from "@/src/lib/rooms";
import { isCalendarDate } from "@/src/lib/date-pricing";
import { isEditorialHighlightIcon } from "@/src/lib/homepageEditorialContent";
export const CMS_LIMITS = {
  hero_heading: 70,
  hero_subtitle: 180,
  hero_image_caption: 60,
  section_heading: 80,
  section_description: 300,
  button_label: 28,
  hero_cta_href: 120,
  navigation_label: 24,
  property_name: 80,
  property_short_description: 220,
  property_full_description: 2000,
  listing_title: 80,
  property_detail: 300,
  amenity: 60,
  house_rule: 160,
  nearby_location: 100,
  discount_heading: 70,
  discount_description: 220,
  benefit_title: 60,
  benefit_description: 180,
  reviewer_name: 100,
  review_date_label: 80,
  contact_name: 100,
  phone_number: 30,
  email_address: 120,
  business_name: 80,
  public_address: 180,
  contact_page_heading: 100,
  contact_page_description: 300,
  directions_url: 300,
  map_url: 300,
  social_url: 300,
  footer_text: 220,
  review_text: 1000,
  admin_notes: 1000,
  corporate_instructions: 1000,
  faq_question: 140,
  faq_answer: 700,
} as const;

export type CmsValidationScope = "property" | "homepage" | "settings";

type CmsPayload = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function addTextError(errors: string[], label: string, value: unknown, limit: number) {
  if (text(value).length > limit) errors.push(`${label} must be ${limit} characters or fewer.`);
}

function addListErrors(errors: string[], label: string, value: unknown, limit: number) {
  if (!Array.isArray(value)) return;
  value.forEach((item, index) => {
    addTextError(errors, `${label} item ${index + 1}`, item, limit);
  });
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value);
}

function addNonNegativeNumberError(errors: string[], label: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  const numeric = numberValue(value);
  if (!Number.isFinite(numeric) || numeric < 0) errors.push(`${label} must be a non-negative number.`);
}

function addHrefError(errors: string[], label: string, value: unknown) {
  const href = text(value);
  if (!href) return;
  if (!(href.startsWith("/") && !href.startsWith("//")) && !/^https?:\/\//i.test(href)) {
    errors.push(`${label} must be an internal path or an http(s) URL.`);
  }
}

function addExternalUrlError(errors: string[], label: string, value: unknown) {
  const href = text(value);
  if (!href) return;
  if (!/^https?:\/\//i.test(href)) errors.push(`${label} must be an http(s) URL.`);
}

function addEmailError(errors: string[], label: string, value: unknown, required = false) {
  const email = text(value);
  if (!email) {
    if (required) errors.push(`${label} is required.`);
    return;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.push(`${label} must be a valid email address.`);
}

function addPhoneError(errors: string[], label: string, value: unknown, required = false) {
  const phone = text(value);
  if (!phone) {
    if (required) errors.push(`${label} is required.`);
    return;
  }
  if (!/^\+?[\d\s().-]{7,30}$/.test(phone)) errors.push(`${label} must use a valid Australian phone format.`);
}

export function validatePropertyContent(payload: CmsPayload) {
  const errors: string[] = [];
  errors.push(...validateRooms(payload.bed_arrangements));
  for (const key of ["max_guests", "minimum_guests", "maximum_adults", "maximum_children", "maximum_infants", "maximum_pets", "extra_guest_threshold"]) {
    if (payload[key] !== undefined && (!Number.isInteger(Number(payload[key])) || Number(payload[key]) < (["max_guests","minimum_guests","maximum_adults"].includes(key) ? 1 : 0))) errors.push(key.replaceAll("_", " ") + " must be a valid whole number.");
  }
  if (Number(payload.maximum_adults) > Number(payload.max_guests) || Number(payload.maximum_children) > Number(payload.max_guests)) errors.push("Adult and child limits cannot exceed total staying guest capacity.");
  if (Number(payload.maximum_adults) + Number(payload.maximum_children) < Number(payload.minimum_guests)) errors.push("Allowed adults and children must accommodate the minimum guest count.");
  for (const key of ["weekly_discount", "monthly_discount"]) if (payload[key] !== undefined && (!Number.isFinite(Number(payload[key])) || Number(payload[key]) < 0 || Number(payload[key]) > 100)) errors.push(key.replaceAll("_", " ") + " must be between 0 and 100%.");
  for (const key of ["nightly_price", "extra_guest_fee", "pet_fee", "cleaning_fee"]) if (payload[key] !== undefined && (!Number.isFinite(Number(payload[key])) || Number(payload[key]) < 0)) errors.push(key.replaceAll("_", " ") + " must be zero or more.");
  if (payload.date_prices !== undefined) {
    if (!Array.isArray(payload.date_prices)) errors.push("Nightly overrides must be a list.");
    else {
      const seen = new Set<string>();
      for (const rate of payload.date_prices as Record<string, unknown>[]) {
        if (!rate || !isCalendarDate(String(rate.price_date)) || !Number.isFinite(Number(rate.nightly_price)) || Number(rate.nightly_price) < 0 || Number(rate.nightly_price) > 100000 || String(rate.label ?? "").length > 120 || seen.has(String(rate.price_date))) errors.push("Each override needs a unique valid date, a non-negative rate and a label up to 120 characters.");
        seen.add(String(rate?.price_date));
      }
    }
  }
  addTextError(errors, "Property name", payload.name, CMS_LIMITS.property_name);
  addTextError(errors, "Short description", payload.short_description, CMS_LIMITS.property_short_description);
  addTextError(errors, "Full description", payload.full_description, CMS_LIMITS.property_full_description);
  addTextError(errors, "Pet policy", payload.pet_policy, CMS_LIMITS.house_rule);
  addTextError(errors, "Parking details", payload.parking_type, CMS_LIMITS.nearby_location);
  addListErrors(errors, "Amenity", payload.amenities, CMS_LIMITS.amenity);
  addListErrors(errors, "House rule", payload.house_rules, CMS_LIMITS.house_rule);
  addListErrors(errors, "Nearby location", payload.nearby_locations, CMS_LIMITS.nearby_location);
  addTextError(errors, "Corporate instructions", payload.corporate_instructions, CMS_LIMITS.corporate_instructions);
  addTextError(errors, "Listing title", payload.listing_title, CMS_LIMITS.listing_title);
  addTextError(errors, "Kitchen facilities", payload.kitchen_facilities, CMS_LIMITS.property_detail);
  addTextError(errors, "Laundry facilities", payload.laundry_facilities, CMS_LIMITS.property_detail);
  addTextError(errors, "Wi-Fi information", payload.wifi_information, CMS_LIMITS.property_detail);
  addTextError(errors, "Workspace information", payload.workspace_information, CMS_LIMITS.property_detail);
  addTextError(errors, "Heating and cooling", payload.heating_cooling, CMS_LIMITS.property_detail);
  addTextError(errors, "Self check-in details", payload.self_check_in_details, CMS_LIMITS.property_detail);
  addTextError(errors, "Safety information", payload.safety_information, CMS_LIMITS.property_detail);
  addTextError(errors, "Cancellation policy", payload.cancellation_policy, CMS_LIMITS.property_detail);
  addTextError(errors, "Corporate information", payload.corporate_information, CMS_LIMITS.property_detail);

  [
    ["Minimum stay", payload.minimum_stay],
    ["Maximum stay", payload.maximum_stay],
    ["Minimum guests", payload.minimum_guests],
    ["Maximum adults", payload.maximum_adults],
    ["Maximum children", payload.maximum_children],
    ["Maximum infants", payload.maximum_infants],
    ["Maximum pets", payload.maximum_pets],
    ["Minimum advance notice", payload.minimum_advance_notice_days],
    ["Maximum advance booking", payload.maximum_advance_booking_days],
    ["Minimum corporate stay", payload.minimum_corporate_stay],
    ["Minimum corporate houses", payload.minimum_corporate_houses],
    ["Maximum corporate houses", payload.maximum_corporate_houses],
    ["Corporate discount", payload.corporate_discount],
  ].forEach(([label, value]) => addNonNegativeNumberError(errors, String(label), value));

  const minimumStay = numberValue(payload.minimum_stay);
  const maximumStay = numberValue(payload.maximum_stay);
  const minimumGuests = numberValue(payload.minimum_guests);
  const maximumGuests = numberValue(payload.max_guests);
  const minimumCorporateStay = numberValue(payload.minimum_corporate_stay);
  const minimumCorporateHouses = numberValue(payload.minimum_corporate_houses);
  const maximumCorporateHouses = numberValue(payload.maximum_corporate_houses);
  const availableProperties = numberValue(payload.available_property_count);
  if (Number.isFinite(minimumStay) && minimumStay < 1) errors.push("Minimum stay must be at least 1 night.");
  if (Number.isFinite(minimumStay) && Number.isFinite(maximumStay) && maximumStay < minimumStay) errors.push("Maximum stay must be at least the minimum stay.");
  if (Number.isFinite(minimumGuests) && Number.isFinite(maximumGuests) && minimumGuests > maximumGuests) errors.push("Minimum guests cannot exceed maximum guests.");
  if (Number.isFinite(minimumStay) && Number.isFinite(minimumCorporateStay) && minimumCorporateStay < minimumStay) errors.push("Minimum corporate stay cannot be shorter than the minimum stay.");
  if (Number.isFinite(minimumCorporateHouses) && Number.isFinite(maximumCorporateHouses) && minimumCorporateHouses > maximumCorporateHouses) errors.push("Minimum corporate houses cannot exceed the maximum.");
  if (Number.isFinite(minimumCorporateHouses) && Number.isFinite(availableProperties) && minimumCorporateHouses > availableProperties) errors.push("Minimum corporate houses cannot exceed the number of available houses.");
  if (Number.isFinite(maximumCorporateHouses) && maximumCorporateHouses > 3) errors.push("Maximum corporate houses cannot exceed 3.");
  if (payload.corporate_discount !== undefined && (!Number.isFinite(numberValue(payload.corporate_discount)) || numberValue(payload.corporate_discount) > 100)) errors.push("Corporate discount must be between 0 and 100%.");
  return errors;
}

export function validateHomepageContent(payload: CmsPayload) {
  const errors: string[] = [];
  const fields: Array<[string, string, number]> = [
    ["Hero headline", "editorial_hero_heading", CMS_LIMITS.hero_heading],
    ["Hero description", "editorial_hero_description", CMS_LIMITS.hero_subtitle],
    ["Houses button", "editorial_hero_primary_label", CMS_LIMITS.button_label],
    ["Partner button", "editorial_hero_secondary_label", CMS_LIMITS.button_label],
    ["Intro heading", "editorial_intro_heading", CMS_LIMITS.section_heading],
    ["Intro link", "editorial_intro_link_label", CMS_LIMITS.button_label],
    ["First intro statement", "editorial_intro_statement_one", CMS_LIMITS.section_description],
    ["Second intro statement", "editorial_intro_statement_two", CMS_LIMITS.section_description],
    ["Services heading", "editorial_services_heading", CMS_LIMITS.section_heading],
    ["Services description", "editorial_services_description", CMS_LIMITS.section_description],
    ["FAQ small heading", "editorial_faq_eyebrow", CMS_LIMITS.section_heading],
    ["FAQ contact prompt", "editorial_faq_contact_prompt", CMS_LIMITS.section_heading],
    ["FAQ contact link", "editorial_faq_contact_label", CMS_LIMITS.button_label],
    ["Final heading", "editorial_social_heading", CMS_LIMITS.section_heading],
    ["Houses link", "editorial_social_houses_label", CMS_LIMITS.button_label],
    ["About link", "editorial_social_story_label", CMS_LIMITS.button_label],
    ["Contact link", "editorial_social_contact_label", CMS_LIMITS.button_label],
  ];
  for (const [label, key, limit] of fields) addTextError(errors, label, payload[key], limit);
  for (const [label, key] of [["Stay highlight", "editorial_highlights"], ["Stay service", "editorial_services"]] as const) {
    const cards = payload[key];
    if (cards === undefined) continue;
    const expected = key === "editorial_highlights" ? 4 : 3;
    if (!Array.isArray(cards) || cards.length !== expected) { errors.push(`${label} must have ${expected} cards.`); continue; }
    addListErrors(errors, `${label} title`, cards.map((item) => (item as CmsPayload)?.title), CMS_LIMITS.benefit_title);
    addListErrors(errors, `${label} description`, cards.map((item) => (item as CmsPayload)?.description), CMS_LIMITS.benefit_description);
    if (key === "editorial_highlights") cards.forEach((item, index) => {
      const icon = item && typeof item === "object" ? (item as CmsPayload).icon : undefined;
      if (icon !== undefined && !isEditorialHighlightIcon(icon)) errors.push(`Stay highlight ${index + 1} has an invalid icon.`);
    });
  }
  addTextError(errors, "FAQ heading", payload.faq_heading, CMS_LIMITS.section_heading);
  addTextError(errors, "FAQ description", payload.faq_description, CMS_LIMITS.section_description);
  addListErrors(errors, "FAQ question", Array.isArray(payload.faqs) ? payload.faqs.map((item) => (item as CmsPayload)?.question) : [], CMS_LIMITS.faq_question);
  addListErrors(errors, "FAQ answer", Array.isArray(payload.faqs) ? payload.faqs.map((item) => (item as CmsPayload)?.answer) : [], CMS_LIMITS.faq_answer);
  return errors;
}

export function validateSiteSettings(payload: CmsPayload) {
  const errors: string[] = [];
  addTextError(errors, "Business name", payload.business_name, CMS_LIMITS.business_name);
  addTextError(errors, "Contact email", payload.contact_email, CMS_LIMITS.email_address);
  addTextError(errors, "Phone number", payload.phone_number, CMS_LIMITS.phone_number);
  addTextError(errors, "Public address", payload.public_address, CMS_LIMITS.public_address);
  addTextError(errors, "Contact page heading", payload.contact_page_heading, CMS_LIMITS.contact_page_heading);
  addTextError(errors, "Contact page description", payload.contact_page_description, CMS_LIMITS.contact_page_description);
  addTextError(errors, "Directions URL", payload.directions_url, CMS_LIMITS.directions_url);
  addTextError(errors, "Map URL", payload.map_url, CMS_LIMITS.map_url);
  addTextError(errors, "Facebook URL", payload.facebook_url, CMS_LIMITS.social_url);
  addTextError(errors, "Instagram URL", payload.instagram_url, CMS_LIMITS.social_url);
  addTextError(errors, "LinkedIn URL", payload.linkedin_url, CMS_LIMITS.social_url);
  addTextError(errors, "Address", payload.address, CMS_LIMITS.nearby_location);
  addTextError(errors, "Footer text", payload.footer_text, CMS_LIMITS.footer_text);
  addEmailError(errors, "Contact email", payload.contact_email, true);
  addPhoneError(errors, "Phone number", payload.phone_number, true);
  addHrefError(errors, "Directions URL", payload.directions_url);
  addHrefError(errors, "Map URL", payload.map_url);
  addExternalUrlError(errors, "Facebook URL", payload.facebook_url);
  addExternalUrlError(errors, "Instagram URL", payload.instagram_url);
  addExternalUrlError(errors, "LinkedIn URL", payload.linkedin_url);
  for (const [label, value] of [["Business name", payload.business_name], ["Contact page heading", payload.contact_page_heading], ["Contact page description", payload.contact_page_description], ["Footer text", payload.footer_text]] as const) {
    if (!text(value)) errors.push(`${label} is required.`);
  }
  return errors;
}

export function validateCmsContent(scope: CmsValidationScope, payload: CmsPayload) {
  if (scope === "property") return validatePropertyContent(payload);
  if (scope === "homepage") return validateHomepageContent(payload);
  return validateSiteSettings(payload);
}

export function trimCmsText(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}
