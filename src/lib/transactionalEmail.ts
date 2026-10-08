import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
  replyTo?: string;
};

const sender = () => process.env.RESEND_FROM_EMAIL?.trim();
const notificationsInbox = () => process.env.RESEND_NOTIFY_EMAIL?.trim();

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
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend rejected email (${response.status}): ${body.slice(0, 500)}`);
  }
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
  const to = notificationsInbox();
  if (!to) return;
  await sendEmail({
    to,
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
      input.message,
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
}) {
  const to = notificationsInbox();
  if (!to) return;
  await sendEmail({
    to,
    replyTo: input.email,
    subject: `New Serenity corporate enquiry · ${input.reference}`,
    idempotencyKey: `corporate-enquiry/${input.id}`,
    text: [
      `New corporate enquiry ${input.reference}`,
      `Company: ${input.company}`,
      `Contact: ${input.contact}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone || "Not provided"}`,
      `Dates: ${input.arrival || "Not specified"} to ${input.departure || "Not specified"}`,
      `Houses: ${input.houses.join(", ") || "Not specified"}`,
      "",
      input.notes || "No notes supplied.",
    ].join("\n"),
  });
}

export async function sendBookingConfirmation(bookingId: string) {
  if (!process.env.RESEND_API_KEY || !sender()) return;
  const supabase = createSupabaseAdminClient();
  const { data: booking, error } = await supabase.from("bookings")
    .select("id, reference, property_id, check_in, checkout, guest_details, total, currency")
    .eq("id", bookingId).single();
  if (error) throw error;
  const guest = booking.guest_details && typeof booking.guest_details === "object" && !Array.isArray(booking.guest_details)
    ? booking.guest_details as Record<string, unknown> : {};
  const email = String(guest.email ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error(`Booking ${booking.reference} has no valid guest email`);
  const { data: property, error: propertyError } = await supabase.from("properties")
    .select("name").eq("id", booking.property_id).single();
  if (propertyError) throw propertyError;
  const amount = new Intl.NumberFormat("en-AU", { style: "currency", currency: booking.currency || "AUD" }).format(Number(booking.total));
  await sendEmail({
    to: email,
    replyTo: notificationsInbox(),
    subject: `Your Serenity booking is confirmed · ${booking.reference}`,
    idempotencyKey: `booking-confirmation/${booking.id}`,
    text: [
      `Hello ${String(guest.firstName ?? "there")},`,
      "",
      "Your booking and payment are confirmed.",
      `Reference: ${booking.reference}`,
      `Home: ${property.name}`,
      `Check-in: ${booking.check_in}`,
      `Checkout: ${booking.checkout}`,
      `Total paid: ${amount}`,
      "",
      "We'll send your arrival details separately before check-in.",
      "If you have questions, reply to this email.",
      "",
      "Serenity Stays",
    ].join("\n"),
  });
}
