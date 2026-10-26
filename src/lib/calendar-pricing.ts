import { pricingDates } from "./date-pricing";

type CalendarPricingChange =
  | { propertyId: string; action: "default"; rate: number }
  | { propertyId: string; action: "override"; dates: string[]; rate: number; label: string }
  | { propertyId: string; action: "reset"; dates: string[] };

export function parseCalendarPricingChange(value: unknown): CalendarPricingChange {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Choose a house and a price change.");
  const body = value as Record<string, unknown>;
  const propertyId = typeof body.propertyId === "string" ? body.propertyId.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId)) throw new Error("Choose a valid house.");
  if (!["default", "override", "reset"].includes(String(body.action))) throw new Error("Choose a valid price change.");
  const action = body.action as "default" | "override" | "reset";
  let rate = 0;
  if (action !== "reset") {
    if (typeof body.rate !== "number" || !Number.isFinite(body.rate) || body.rate < 0 || body.rate > 100000) throw new Error("Enter a nightly rate between AUD $0 and AUD $100,000.");
    rate = Math.round((body.rate + Number.EPSILON) * 100) / 100;
  }
  if (action === "default") return { propertyId, action, rate };
  const dates = pricingDates(String(body.startDate ?? ""), String(body.endDate ?? ""));
  if (action === "reset") return { propertyId, action, dates };
  if (body.label !== undefined && typeof body.label !== "string") throw new Error("Enter a valid rate label.");
  const label = String(body.label ?? "").trim();
  if (label.length > 120) throw new Error("Rate labels must be 120 characters or fewer.");
  return { propertyId, action, dates, rate, label };
}
