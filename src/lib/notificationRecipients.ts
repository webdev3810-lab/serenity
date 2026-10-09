export const MAX_NOTIFICATION_RECIPIENTS = 5;

export function normalizeNotificationRecipients(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim().toLowerCase());
}

export function validateNotificationRecipients(value: unknown): { emails: string[]; error?: string } {
  if (!Array.isArray(value)) return { emails: [], error: "Notification emails must be a list." };
  const emails = normalizeNotificationRecipients(value).filter(Boolean);
  if (emails.length > MAX_NOTIFICATION_RECIPIENTS) return { emails: [], error: "You can add up to 5 notification emails." };
  if (value.some((item) => typeof item !== "string")) return { emails: [], error: "Each notification email must be text." };
  if (emails.some((email) => email.length > 120 || !/^\S+@\S+\.\S+$/.test(email))) return { emails: [], error: "Enter a valid notification email address for each recipient." };
  if (new Set(emails).size !== emails.length) return { emails: [], error: "Notification email addresses must be unique." };
  return { emails };
}
