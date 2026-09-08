export type BadgeTone = "success" | "warning" | "info" | "violet" | "danger" | "neutral";
export type StatusDomain = "booking" | "payment" | "enquiry" | "promotion" | "calendar" | "category" | "source" | "content";
const mappings: Record<StatusDomain, Record<string, BadgeTone>> = {
  booking: { confirmed: "success", pending_payment: "warning", cancelled: "danger", checked_in: "info", checked_out: "neutral", expired: "neutral", corporate: "violet" },
  payment: { paid: "success", pending: "warning", failed: "danger", refunded: "violet", not_applicable: "neutral" },
  enquiry: { new: "info", contacted: "info", pending: "warning", pending_approval: "warning", approved: "success", declined: "danger", converted: "violet", resolved: "success", closed: "neutral", spam: "danger" },
  promotion: { active: "success", scheduled: "info", draft: "neutral", expired: "neutral", sold_out: "neutral", disabled: "neutral" },
  calendar: { success: "success", connected: "success", active: "success", conflict: "warning", error: "danger", syncing: "info", pending: "warning", waiting: "warning", disabled: "neutral", not_configured: "neutral", no_events: "info", invalid_url: "danger" },
  category: { corporate: "violet", standard: "neutral", booking: "neutral", block: "neutral", enquiry: "info" },
  source: {},
  content: { published: "success", approved: "success", active: "success", saved: "success", draft: "neutral", inactive: "neutral", unsaved: "warning" },
};
export function statusPresentation(domain: StatusDomain, value: unknown) {
  const key = typeof value === "string" ? value.trim().toLowerCase() : "";
  const words = (key || "unknown").replaceAll("_", " ");
  return { tone: mappings[domain][key] ?? "neutral", label: words.charAt(0).toUpperCase() + words.slice(1) };
}
