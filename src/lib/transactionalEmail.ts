import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { normalizeNotificationRecipients } from "@/src/lib/notificationRecipients";
import { formatAud, formatDateAu } from "@/src/lib/booking";
import { formatMelbourneReceiptDate, receiptCode } from "@/src/lib/paymentReceipt";
import { renderSerenityEmail } from "@/src/lib/serenityEmailTemplate";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
  replyTo?: string;
};

const sender = () => process.env.RESEND_FROM_EMAIL?.trim();
const notificationsInbox = () => process.env.RESEND_NOTIFY_EMAIL?.trim();

async function notificationRecipients(): Promise<string[]> {
  const fallback = notificationsInbox();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", "notification_recipients").maybeSingle();
  if (error) throw error;
  if (!data) return fallback ? [fallback] : [];
  const value = data.value && typeof data.value === "object" && !Array.isArray(data.value)
    ? (data.value as Record<string, unknown>).emails : undefined;
  return normalizeNotificationRecipients(value);
}

async function sendEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = sender();
  if (!apiKey || !from) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": message.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: renderSerenityEmail(message.subject, message.text),
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend rejected email (${response.status}): ${body.slice(0, 500)}`);
  }
}

async function sendAdminNotification(message: Omit<EmailMessage, "to">) {
  if (!process.env.RESEND_API_KEY || !sender()) return;
  const recipients = await notificationRecipients();
  const results = await Promise.allSettled(recipients.map((to) => sendEmail({
    ...message,
    to,
    idempotencyKey: `${message.idempotencyKey}/${to}`,
  })));
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length) throw new Error(`${failures.length} notification email(s) could not be sent.`);
}

export async function sendAdminPasswordRecovery(to: string, recoveryUrl: string) {
  if (!process.env.RESEND_API_KEY || !sender()) {
    throw new Error("Resend is not configured for password recovery.");
  }

  await sendEmail({
    to,
    subject: "Reset your Serenity admin password",
    idempotencyKey: `admin-password-recovery/${crypto.randomUUID()}`,
    text: [
      "A password reset was requested for your Serenity admin account.",
      "",
      "Use this link to choose a new password:",
      recoveryUrl,
      "",
      "If you did not request this, you can ignore this email. Never share this link with anyone.",
      "",
      "Serenity Stays",
    ].join("\n"),
  });
}

export async function notifyContactMessage(input: {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  projectType: string;
  preferredHouse: string;
  message: string;
}) {
  await sendAdminNotification({
    replyTo: input.email,
    subject: `New Serenity contact message · ${input.reference}`,
    idempotencyKey: `contact-message/${input.id}`,
    text: [
      `New contact message ${input.reference}`,
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone || "Not provided"}`,
      `Enquiry type: ${input.projectType || "Not provided"}`,
      `Preferred house: ${input.preferredHouse || "Not provided"}`,
      "",
      "Message:",
      input.message,
    ].join("\n"),
  });
}

export async function acknowledgeContactMessage(input: {
  id: string;
  reference: string;
  firstName: string;
  email: string;
}) {
  if (!process.env.RESEND_API_KEY || !sender()) {
    throw new Error("Resend is not configured for contact confirmations.");
  }

  await sendEmail({
    to: input.email,
    replyTo: notificationsInbox(),
    subject: `We received your message · ${input.reference}`,
    idempotencyKey: `contact-confirmation/${input.id}`,
    text: [
      `Hi ${input.firstName},`,
      "",
      "Thanks for contacting Serenity. We've received your message and our team will review it and get back to you.",
      `Your reference: ${input.reference}`,
      "",
      "If you didn't send this message, you can ignore this email.",
      "",
      "Serenity Stays",
    ].join("\n"),
  });
}

export async function notifyCorporateEnquiry(input: {
  id: string;
  reference: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  arrival: string;
  departure: string;
  houses: string[];
  notes: string;
  kind: "question" | "stay" | "insurance";
}) {
  const enquiryLabel = input.kind === "insurance" ? "insurance accommodation quote request" : input.kind === "question" ? "corporate question" : "corporate booking enquiry";
  await sendAdminNotification({
    replyTo: input.email,
    subject: `New Serenity ${enquiryLabel} · ${input.reference}`,
    idempotencyKey: `corporate-enquiry/${input.id}`,
    text: [
      `New ${enquiryLabel} ${input.reference}`,
      `${input.kind === "insurance" ? "Insurer / organisation" : "Company"}: ${input.company}`,
      `Contact: ${input.contact}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone || "Not provided"}`,
      `Dates: ${input.arrival || "Not specified"} to ${input.departure || "Not specified"}`,
      `Houses: ${input.houses.join(", ") || "Not specified"}`,
      "",
      "Notes:",
      input.notes || "No notes supplied.",
    ].join("\n"),
  });
}

export async function acknowledgeCorporateEnquiry(input: {
  id: string;
  reference: string;
  contact: string;
  email: string;
  kind: "question" | "stay" | "insurance";
}) {
  if (!process.env.RESEND_API_KEY || !sender()) {
    throw new Error("Resend is not configured for corporate enquiry confirmations.");
  }

  await sendEmail({
    to: input.email,
    replyTo: notificationsInbox(),
    subject: `We received your ${input.kind === "insurance" ? "insurance accommodation request" : input.kind === "question" ? "corporate question" : "corporate enquiry"} · ${input.reference}`,
    idempotencyKey: `corporate-enquiry-confirmation/${input.id}`,
    text: [
      `Hi ${input.contact},`,
      "",
      input.kind === "insurance"
        ? "Thanks for your insurance accommodation request. The Serenity team has received it and will review suitable options and quote details with you."
        : input.kind === "question"
        ? "Thanks for your question about corporate bookings. The Serenity team has received it and will get back to you."
        : "Thanks for your corporate booking enquiry. The Serenity team has received it and will review the details with you.",
      `Your reference: ${input.reference}`,
      "",
      "This is an enquiry receipt, not a booking confirmation. No stay has been reserved or charged.",
      "",
      "Serenity Stays",
    ].join("\n"),
  });
}

export async function sendCorporateBookingEmails(groupReference: string) {
  if (!process.env.RESEND_API_KEY || !sender()) return;
  const supabase = createSupabaseAdminClient();
  const { data: bookings, error } = await supabase.from("bookings")
    .select("id, property_id, check_in, checkout, free_cancellation_until, adults, guest_details, total, currency, payment_status, booking_status, stripe_payment_intent_id, updated_at")
    .eq("group_reference", groupReference)
    .order("reference", { ascending: true });
  if (error) throw error;
  if (!bookings?.length || bookings.some((booking) => booking.payment_status !== "paid" || booking.booking_status !== "confirmed" || booking.currency.toUpperCase() !== "AUD")) {
    throw new Error("Corporate booking group is not fully paid and confirmed.");
  }

  const guest = bookings[0].guest_details && typeof bookings[0].guest_details === "object" && !Array.isArray(bookings[0].guest_details)
    ? bookings[0].guest_details as Record<string, unknown> : {};
  const email = String(guest.email ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Corporate booking has no valid contact email.");
  const { data: properties, error: propertiesError } = await supabase.from("properties")
    .select("id, name").in("id", bookings.map((booking) => booking.property_id));
  if (propertiesError) throw propertiesError;
  if (!properties || properties.length !== bookings.length) throw new Error("Corporate booking houses could not be loaded.");
  const houseNames = bookings.map((booking) => properties.find((property) => property.id === booking.property_id)?.name ?? "House");
  const houseDetails = bookings.map((booking, index) => `${houseNames[index]} · ${formatDateAu(booking.check_in)} to ${formatDateAu(booking.checkout)} · ${booking.adults} guest${booking.adults === 1 ? "" : "s"} · ${formatAud(Number(booking.total))} · free cancellation deadline: ${booking.free_cancellation_until ? formatDateAu(booking.free_cancellation_until) : "see booking terms"}, 11:59 pm Melbourne time`);
  const total = formatAud(bookings.reduce((sum, booking) => sum + Number(booking.total), 0));
  const contact = String(guest.contactName ?? guest.firstName ?? "there");
  const receipt = receiptCode(groupReference);
  const paidAt = formatMelbourneReceiptDate(bookings[0].updated_at);
  const paymentId = bookings[0].stripe_payment_intent_id ?? "Recorded in Stripe";

  const results = await Promise.allSettled([
    sendEmail({
      to: email,
      replyTo: notificationsInbox(),
      subject: `Your Serenity corporate booking is confirmed · ${groupReference}`,
      idempotencyKey: `corporate-booking-confirmation/${groupReference}`,
      text: [
        `Hello ${contact},`,
        "",
        "Your payment succeeded and your corporate booking is confirmed.",
        `Reference: ${groupReference}`,
        `Receipt code: ${receipt}`,
        `Paid: ${paidAt} Melbourne time`,
        "Houses and stay dates:", ...houseDetails,
        `Total paid: ${total}`,
        `Stripe payment: ${paymentId}`,
        "",
        "Keep this confirmation as proof of your booking and payment. This is not a tax invoice.",
        "We'll send your arrival details separately before check-in.",
        "",
        "Serenity Stays",
      ].join("\n"),
    }),
    sendAdminNotification({
      replyTo: email,
      subject: `New paid corporate booking · ${groupReference}`,
      idempotencyKey: `paid-corporate-booking/${groupReference}`,
      text: [
        `Paid corporate booking ${groupReference}`,
        `Receipt code: ${receipt}`,
        `Company: ${String(guest.companyName ?? "Not provided")}`,
        `Contact: ${contact}`,
        `Email: ${email}`,
        "Houses and stay dates:", ...houseDetails,
        `Total paid: ${total}`,
        `Stripe payment: ${paymentId}`,
      ].join("\n"),
    }),
  ]);
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length) throw new Error(`${failures.length} corporate booking email send(s) failed.`);
}

export async function sendUnsuccessfulBookingEmails(input: { reference: string; corporate: boolean; reason: "expired" | "failed" }) {
  if (!process.env.RESEND_API_KEY || !sender()) return;
  const supabase = createSupabaseAdminClient();
  const { data: booking, error } = await supabase.from("bookings")
    .select("id, reference, guest_details, check_in, checkout, booking_status, payment_status")
    .eq(input.corporate ? "group_reference" : "reference", input.reference)
    .order("reference", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!booking || booking.booking_status !== "cancelled" || booking.payment_status === "paid") return;
  const { data: groupStays, error: groupStaysError } = input.corporate
    ? await supabase.from("bookings").select("reference, check_in, checkout").eq("group_reference", input.reference).order("reference", { ascending: true })
    : { data: null, error: null };
  if (groupStaysError) throw groupStaysError;
  const requestedDates = groupStays?.length
    ? groupStays.map((stay) => `  ${stay.reference}: ${stay.check_in} to ${stay.checkout}`)
    : [`Requested dates: ${booking.check_in} to ${booking.checkout}`];
  const guest = booking.guest_details && typeof booking.guest_details === "object" && !Array.isArray(booking.guest_details)
    ? booking.guest_details as Record<string, unknown> : {};
  const email = String(guest.email ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Unsuccessful booking has no valid contact email.");
  const contact = String(guest.contactName ?? guest.firstName ?? "there");
  const why = input.reason === "expired"
    ? "The checkout expired before payment was completed."
    : "The payment did not complete successfully.";
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.serenityhomesdirect.com").replace(/\/$/, "");
  const restart = input.corporate ? `${siteUrl}/corporate-stays#corporate-booking` : `${siteUrl}/homes`;
  const results = await Promise.allSettled([
    sendEmail({
      to: email,
      replyTo: notificationsInbox(),
      subject: `Your Serenity ${input.corporate ? "corporate booking" : "booking"} was not confirmed · ${input.reference}`,
      idempotencyKey: `booking-not-completed/${input.reference}`,
      text: [
        `Hello ${contact},`, "", why,
        `Reference: ${input.reference}`,
        ...requestedDates,
        "Your stay was not confirmed and these dates are not reserved by this booking.",
        "You can start a new booking here:", restart,
        "", "If you believe you were charged, please contact Serenity before paying again.", "", "Serenity Stays",
      ].join("\n"),
    }),
    sendAdminNotification({
      replyTo: email,
      subject: `${input.corporate ? "Corporate" : "Guest"} booking not completed · ${input.reference}`,
      idempotencyKey: `admin-booking-not-completed/${input.reference}`,
      text: [
        `Booking not completed: ${input.reference}`, `Reason: ${why}`,
        `Type: ${input.corporate ? "Corporate" : "Guest"}`,
        `Contact: ${contact}`, `Email: ${email}`,
        ...requestedDates,
        "The reservation is cancelled and should not block availability.",
      ].join("\n"),
    }),
  ]);
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length) throw new Error(`${failures.length} unsuccessful booking email send(s) failed.`);
}

export async function sendBookingEmails(bookingId: string) {
  if (!process.env.RESEND_API_KEY || !sender()) return;
  const supabase = createSupabaseAdminClient();
  const { data: booking, error } = await supabase.from("bookings")
    .select("id, reference, property_id, check_in, checkout, free_cancellation_until, guest_details, total, currency, stripe_payment_intent_id, updated_at")
    .eq("id", bookingId).single();
  if (error) throw error;
  const guest = booking.guest_details && typeof booking.guest_details === "object" && !Array.isArray(booking.guest_details)
    ? booking.guest_details as Record<string, unknown> : {};
  const email = String(guest.email ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error(`Booking ${booking.reference} has no valid guest email`);
  const { data: property, error: propertyError } = await supabase.from("properties")
    .select("name").eq("id", booking.property_id).single();
  if (propertyError) throw propertyError;
  const amount = booking.currency && booking.currency.toUpperCase() !== "AUD"
    ? new Intl.NumberFormat("en-AU", { style: "currency", currency: booking.currency, currencyDisplay: "code" }).format(Number(booking.total))
    : formatAud(Number(booking.total));
  const receipt = receiptCode(booking.reference);
  const paidAt = formatMelbourneReceiptDate(booking.updated_at);
  const paymentId = booking.stripe_payment_intent_id ?? "Recorded in Stripe";
  const guestName = `${String(guest.firstName ?? "")} ${String(guest.lastName ?? "")}`.trim() || "Guest";
  const confirmation = sendEmail({
    to: email,
    replyTo: notificationsInbox(),
    subject: `Your Serenity booking is confirmed · ${booking.reference}`,
    idempotencyKey: `booking-confirmation/${booking.id}`,
    text: [
      `Hello ${String(guest.firstName ?? "there")},`,
      "",
      "Your booking and payment are confirmed.",
      `Reference: ${booking.reference}`,
      `Receipt code: ${receipt}`,
      `Paid: ${paidAt} Melbourne time`,
      `Home: ${property.name}`,
      `Check-in: ${booking.check_in}`,
      `Checkout: ${booking.checkout}`,
      `Free cancellation deadline: ${booking.free_cancellation_until ? formatDateAu(booking.free_cancellation_until) : "See booking terms"}, 11:59 pm Melbourne time. Contact Serenity to cancel.`,
      `Total paid: ${amount}`,
      `Stripe payment: ${paymentId}`,
      "",
      "Keep this confirmation as proof of your booking and payment. This is not a tax invoice.",
      "We'll send your arrival details separately before check-in.",
      "If you have questions, reply to this email.",
      "",
      "Serenity Stays",
    ].join("\n"),
  });
  const notification = sendAdminNotification({
    replyTo: email,
    subject: `New paid Serenity booking · ${booking.reference}`,
    idempotencyKey: `paid-booking/${booking.id}`,
    text: [
      `Paid booking ${booking.reference}`,
      `Receipt code: ${receipt}`,
      `Guest: ${guestName}`,
      `Email: ${email}`,
      `Home: ${property.name}`,
      `Check-in: ${booking.check_in}`,
      `Checkout: ${booking.checkout}`,
      `Total paid: ${amount}`,
      `Stripe payment: ${paymentId}`,
    ].join("\n"),
  });
  const results = await Promise.allSettled([confirmation, notification]);
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length) throw new Error(`${failures.length} booking email send(s) failed.`);
}
