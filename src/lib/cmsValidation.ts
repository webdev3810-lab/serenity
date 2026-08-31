export const CMS_LIMITS = {
  hero_heading: 70,
  hero_subtitle: 180,
  hero_image_caption: 60,
  section_heading: 80,
  section_description: 300,
  button_label: 28,
  hero_cta_href: 120,
  intro_eyebrow: 60,
  intro_heading: 80,
  intro_lead: 300,
  intro_body: 500,
  intro_cta_label: 28,
  intro_cta_href: 120,
  intro_art_label: 32,
  intro_art_heading: 80,
  intro_art_card: 120,
  intro_image_url: 500,
  intro_image_path: 300,
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
  whatsapp_number: 30,
  public_address: 180,
  business_hours: 180,
  contact_page_heading: 100,
  contact_page_description: 300,
  directions_url: 300,
  map_url: 300,
  social_url: 300,
  booking_enquiry_email: 120,
  corporate_enquiry_email: 120,
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
  addTextError(errors, "Hero heading", payload.hero_heading, CMS_LIMITS.hero_heading);
  addTextError(errors, "Hero subtitle", payload.hero_subtitle, CMS_LIMITS.hero_subtitle);
  addTextError(errors, "Hero image caption", payload.hero_image_caption, CMS_LIMITS.hero_image_caption);
  addTextError(errors, "Button label", payload.hero_cta_label, CMS_LIMITS.button_label);
  addTextError(errors, "Hero button link", payload.hero_cta_href, CMS_LIMITS.hero_cta_href);
  addHrefError(errors, "Hero button link", payload.hero_cta_href);
  addTextError(errors, "Intro eyebrow", payload.intro_eyebrow, CMS_LIMITS.intro_eyebrow);
  addTextError(errors, "Intro heading", payload.intro_heading, CMS_LIMITS.intro_heading);
  addTextError(errors, "Intro lead", payload.intro_lead, CMS_LIMITS.intro_lead);
  addTextError(errors, "Intro body", payload.intro_body, CMS_LIMITS.intro_body);
  addTextError(errors, "Intro button label", payload.intro_cta_label, CMS_LIMITS.intro_cta_label);
  addTextError(errors, "Intro button link", payload.intro_cta_href, CMS_LIMITS.intro_cta_href);
  addHrefError(errors, "Intro button link", payload.intro_cta_href);
  addTextError(errors, "Intro artwork label", payload.intro_art_label, CMS_LIMITS.intro_art_label);
  addTextError(errors, "Intro artwork heading", payload.intro_art_heading, CMS_LIMITS.intro_art_heading);
  addTextError(errors, "Intro artwork card", payload.intro_art_card, CMS_LIMITS.intro_art_card);
  addTextError(errors, "Intro image 1 URL", payload.intro_image_1, CMS_LIMITS.intro_image_url);
  addTextError(errors, "Intro image 1 path", payload.intro_image_1_path, CMS_LIMITS.intro_image_path);
  addTextError(errors, "Intro image 2 URL", payload.intro_image_2, CMS_LIMITS.intro_image_url);
  addTextError(errors, "Intro image 2 path", payload.intro_image_2_path, CMS_LIMITS.intro_image_path);
  addTextError(errors, "Featured heading", payload.featured_heading, CMS_LIMITS.section_heading);
  addTextError(errors, "Featured description", payload.featured_description, CMS_LIMITS.section_description);
  addTextError(errors, "Section heading", payload.section_heading, CMS_LIMITS.section_heading);
  addTextError(errors, "Section description", payload.section_description, CMS_LIMITS.section_description);
  addTextError(errors, "Benefits heading", payload.benefits_heading, CMS_LIMITS.section_heading);
  addTextError(errors, "Benefits description", payload.benefits_description, CMS_LIMITS.section_description);
  addTextError(errors, "Discount heading", payload.discount_heading, CMS_LIMITS.discount_heading);
  addTextError(errors, "Discount description", payload.discount_description, CMS_LIMITS.discount_description);
  addTextError(errors, "Corporate heading", payload.corporate_heading, CMS_LIMITS.section_heading);
  addTextError(errors, "Corporate description", payload.corporate_description, CMS_LIMITS.section_description);
  addTextError(errors, "Corporate button label", payload.corporate_cta_label, CMS_LIMITS.button_label);
  addTextError(errors, "Location heading", payload.location_heading, CMS_LIMITS.section_heading);
  addTextError(errors, "Location description", payload.location_description, CMS_LIMITS.section_description);
  addListErrors(errors, "Benefit title", Array.isArray(payload.benefits) ? payload.benefits.map((item) => (item as CmsPayload)?.title) : [], CMS_LIMITS.benefit_title);
  addListErrors(errors, "Benefit description", Array.isArray(payload.benefits) ? payload.benefits.map((item) => (item as CmsPayload)?.description) : [], CMS_LIMITS.benefit_description);
  addTextError(errors, "FAQ heading", payload.faq_heading, CMS_LIMITS.section_heading);
  addTextError(errors, "FAQ description", payload.faq_description, CMS_LIMITS.section_description);
  addTextError(errors, "Final CTA heading", payload.final_cta_heading, CMS_LIMITS.section_heading);
  addTextError(errors, "Final CTA description", payload.final_cta_description, CMS_LIMITS.section_description);
  addTextError(errors, "Final CTA primary label", payload.final_cta_primary_label, CMS_LIMITS.button_label);
  addTextError(errors, "Final CTA secondary label", payload.final_cta_secondary_label, CMS_LIMITS.button_label);
  addListErrors(errors, "FAQ question", Array.isArray(payload.faqs) ? payload.faqs.map((item) => (item as CmsPayload)?.question) : [], CMS_LIMITS.faq_question);
  addListErrors(errors, "FAQ answer", Array.isArray(payload.faqs) ? payload.faqs.map((item) => (item as CmsPayload)?.answer) : [], CMS_LIMITS.faq_answer);
  return errors;
}

export function validateSiteSettings(payload: CmsPayload) {
  const errors: string[] = [];
  addTextError(errors, "Business name", payload.business_name, CMS_LIMITS.business_name);
  addTextError(errors, "Contact email", payload.contact_email, CMS_LIMITS.email_address);
  addTextError(errors, "Phone number", payload.phone_number, CMS_LIMITS.phone_number);
  addTextError(errors, "WhatsApp number", payload.whatsapp_number, CMS_LIMITS.whatsapp_number);
  addTextError(errors, "Public address", payload.public_address, CMS_LIMITS.public_address);
  addTextError(errors, "Business hours", payload.business_hours, CMS_LIMITS.business_hours);
  addTextError(errors, "Contact page heading", payload.contact_page_heading, CMS_LIMITS.contact_page_heading);
  addTextError(errors, "Contact page description", payload.contact_page_description, CMS_LIMITS.contact_page_description);
  addTextError(errors, "Directions URL", payload.directions_url, CMS_LIMITS.directions_url);
  addTextError(errors, "Map URL", payload.map_url, CMS_LIMITS.map_url);
  addTextError(errors, "Facebook URL", payload.facebook_url, CMS_LIMITS.social_url);
  addTextError(errors, "Instagram URL", payload.instagram_url, CMS_LIMITS.social_url);
  addTextError(errors, "LinkedIn URL", payload.linkedin_url, CMS_LIMITS.social_url);
  addTextError(errors, "Booking enquiry email", payload.booking_enquiry_email, CMS_LIMITS.booking_enquiry_email);
  addTextError(errors, "Corporate enquiry email", payload.corporate_enquiry_email, CMS_LIMITS.corporate_enquiry_email);
  addTextError(errors, "Address", payload.address, CMS_LIMITS.nearby_location);
  addTextError(errors, "Footer text", payload.footer_text, CMS_LIMITS.footer_text);
  addEmailError(errors, "Contact email", payload.contact_email, true);
  addEmailError(errors, "Booking enquiry email", payload.booking_enquiry_email, true);
  addEmailError(errors, "Corporate enquiry email", payload.corporate_enquiry_email, true);
  addPhoneError(errors, "Phone number", payload.phone_number, true);
  addPhoneError(errors, "WhatsApp number", payload.whatsapp_number);
  addHrefError(errors, "Directions URL", payload.directions_url);
  addHrefError(errors, "Map URL", payload.map_url);
  addExternalUrlError(errors, "Facebook URL", payload.facebook_url);
  addExternalUrlError(errors, "Instagram URL", payload.instagram_url);
  addExternalUrlError(errors, "LinkedIn URL", payload.linkedin_url);
  for (const [label, value] of [["Business name", payload.business_name], ["Business hours", payload.business_hours], ["Contact page heading", payload.contact_page_heading], ["Contact page description", payload.contact_page_description], ["Footer text", payload.footer_text]] as const) {
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
