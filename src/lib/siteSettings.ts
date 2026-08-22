export type PromoSettings = {
  badge: string;
  message: string;
  mobileMessage: string;
  code: string;
  endsAt: string;
  id?: string;
  name?: string;
  status?: string;
  discountType?: "percentage" | "fixed_aud";
  discountValue?: number;
  startsAt?: string;
  maxRedemptions?: number | null;
  successfulRedemptions?: number;
  reservedRedemptions?: number;
  remainingRedemptions?: number | null;
  headerVisible?: boolean;
};

export type ContactSettingsRecord = {
  business_name: string;
  contact_email: string;
  phone_number: string;
  whatsapp_number: string;
  public_address: string;
  business_hours: string;
  contact_page_heading: string;
  contact_page_description: string;
  footer_text: string;
  directions_url: string;
  map_url: string;
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  booking_enquiry_email: string;
  corporate_enquiry_email: string;
  contact_published: string;
  public_address_visible: string;
};

export type ContactSettings = {
  businessName: string;
  contactEmail: string;
  phoneNumber: string;
  whatsappNumber: string;
  publicAddress: string;
  businessHours: string;
  contactPageHeading: string;
  contactPageDescription: string;
  footerText: string;
  directionsUrl: string;
  mapUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  bookingEnquiryEmail: string;
  corporateEnquiryEmail: string;
  contactPublished: boolean;
  publicAddressVisible: boolean;
};

export const DEFAULT_CONTACT_SETTINGS_RECORD: ContactSettingsRecord = {
  business_name: "Serenity Stays",
  contact_email: "bookings@serenitystays.com.au",
  phone_number: "+61 3 9000 0000",
  whatsapp_number: "",
  public_address: "Pakenham, Victoria 3810, Australia",
  business_hours: "Monday–Sunday · 9:00 AM–6:00 PM (AEST)",
  contact_page_heading: "Let's make your stay feel easy.",
  contact_page_description: "Tell us what you need and our local team will help you find the right Serenity house in Pakenham.",
  footer_text: "Furnished whole-house stays in Pakenham, Victoria, with local support for every kind of stay.",
  directions_url: "https://www.google.com/maps/search/?api=1&query=Pakenham%2C%20Victoria%203810%2C%20Australia",
  map_url: "https://www.google.com/maps/search/?api=1&query=Pakenham%2C%20Victoria%203810%2C%20Australia",
  facebook_url: "",
  instagram_url: "",
  linkedin_url: "",
  booking_enquiry_email: "bookings@serenitystays.com.au",
  corporate_enquiry_email: "bookings@serenitystays.com.au",
  contact_published: "true",
  public_address_visible: "true",
};

export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  businessName: DEFAULT_CONTACT_SETTINGS_RECORD.business_name,
  contactEmail: DEFAULT_CONTACT_SETTINGS_RECORD.contact_email,
  phoneNumber: DEFAULT_CONTACT_SETTINGS_RECORD.phone_number,
  whatsappNumber: DEFAULT_CONTACT_SETTINGS_RECORD.whatsapp_number,
  publicAddress: DEFAULT_CONTACT_SETTINGS_RECORD.public_address,
  businessHours: DEFAULT_CONTACT_SETTINGS_RECORD.business_hours,
  contactPageHeading: DEFAULT_CONTACT_SETTINGS_RECORD.contact_page_heading,
  contactPageDescription: DEFAULT_CONTACT_SETTINGS_RECORD.contact_page_description,
  footerText: DEFAULT_CONTACT_SETTINGS_RECORD.footer_text,
  directionsUrl: DEFAULT_CONTACT_SETTINGS_RECORD.directions_url,
  mapUrl: DEFAULT_CONTACT_SETTINGS_RECORD.map_url,
  facebookUrl: DEFAULT_CONTACT_SETTINGS_RECORD.facebook_url,
  instagramUrl: DEFAULT_CONTACT_SETTINGS_RECORD.instagram_url,
  linkedinUrl: DEFAULT_CONTACT_SETTINGS_RECORD.linkedin_url,
  bookingEnquiryEmail: DEFAULT_CONTACT_SETTINGS_RECORD.booking_enquiry_email,
  corporateEnquiryEmail: DEFAULT_CONTACT_SETTINGS_RECORD.corporate_enquiry_email,
  contactPublished: true,
  publicAddressVisible: true,
};

const stringValue = (value: unknown, fallback: string) => typeof value === "string" && value.trim() ? value.trim() : fallback;
const booleanValue = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value !== "false";
  return fallback;
};

export function normalizeContactSettings(value: unknown): ContactSettings {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const contactPublished = booleanValue(raw.contact_published, true);
  const publicAddressVisible = booleanValue(raw.public_address_visible, true);
  if (!contactPublished) return { ...DEFAULT_CONTACT_SETTINGS, contactPublished: false };

  return {
    businessName: stringValue(raw.business_name, DEFAULT_CONTACT_SETTINGS.businessName),
    contactEmail: stringValue(raw.contact_email, DEFAULT_CONTACT_SETTINGS.contactEmail),
    phoneNumber: stringValue(raw.phone_number, DEFAULT_CONTACT_SETTINGS.phoneNumber),
    whatsappNumber: stringValue(raw.whatsapp_number, DEFAULT_CONTACT_SETTINGS.whatsappNumber),
    publicAddress: publicAddressVisible ? stringValue(raw.public_address, DEFAULT_CONTACT_SETTINGS.publicAddress) : "",
    businessHours: stringValue(raw.business_hours, DEFAULT_CONTACT_SETTINGS.businessHours),
    contactPageHeading: stringValue(raw.contact_page_heading, DEFAULT_CONTACT_SETTINGS.contactPageHeading),
    contactPageDescription: stringValue(raw.contact_page_description, DEFAULT_CONTACT_SETTINGS.contactPageDescription),
    footerText: stringValue(raw.footer_text, DEFAULT_CONTACT_SETTINGS.footerText),
    directionsUrl: stringValue(raw.directions_url, DEFAULT_CONTACT_SETTINGS.directionsUrl),
    mapUrl: stringValue(raw.map_url, DEFAULT_CONTACT_SETTINGS.mapUrl),
    facebookUrl: stringValue(raw.facebook_url, DEFAULT_CONTACT_SETTINGS.facebookUrl),
    instagramUrl: stringValue(raw.instagram_url, DEFAULT_CONTACT_SETTINGS.instagramUrl),
    linkedinUrl: stringValue(raw.linkedin_url, DEFAULT_CONTACT_SETTINGS.linkedinUrl),
    bookingEnquiryEmail: stringValue(raw.booking_enquiry_email, DEFAULT_CONTACT_SETTINGS.bookingEnquiryEmail),
    corporateEnquiryEmail: stringValue(raw.corporate_enquiry_email, DEFAULT_CONTACT_SETTINGS.corporateEnquiryEmail),
    contactPublished: true,
    publicAddressVisible,
  };
}

export const DEFAULT_PROMO_SETTINGS: PromoSettings = {
  badge: "BOOK DIRECT",
  message: "Save 5% on your stay with code",
  mobileMessage: "Save 5% with code",
  code: "SERENITY5",
  endsAt: "",
  status: "active",
  discountType: "percentage",
  discountValue: 5,
  headerVisible: true,
};
