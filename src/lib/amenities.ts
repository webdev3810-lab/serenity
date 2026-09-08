export const AMENITY_GROUPS = { kitchen: "Kitchen", bathroom: "Bathroom", laundry: "Laundry", comfort: "Comfort", entertainment: "Entertainment", parking: "Parking", outdoor: "Outdoor", accessibility: "Accessibility", safety: "Safety", workspace: "Internet & workspace", other: "Other" } as const;
export type AmenityGroup = keyof typeof AMENITY_GROUPS;
export const AMENITY_ICONS = ["cooking", "bath", "laundry", "thermometer", "tv", "car", "trees", "accessibility", "shield", "wifi", "desk", "key", "bed", "check", "dog", "calendar", "coffee"] as const;
export type AmenityIconId = typeof AMENITY_ICONS[number];
export type Amenity = { id: string; label: string; icon: AmenityIconId; group: AmenityGroup };
export const AMENITY_CATALOG: Amenity[] = [
  { id: "kitchen", label: "Fully equipped kitchen", icon: "cooking", group: "kitchen" },
  { id: "dining", label: "Dining area", icon: "cooking", group: "kitchen" },
  { id: "coffee", label: "Coffee maker", icon: "coffee", group: "kitchen" },
  { id: "dishwasher", label: "Dishwasher", icon: "cooking", group: "kitchen" },
  { id: "bath", label: "Bathtub", icon: "bath", group: "bathroom" },
  { id: "hair-dryer", label: "Hair dryer", icon: "bath", group: "bathroom" },
  { id: "laundry", label: "Laundry facilities", icon: "laundry", group: "laundry" },
  { id: "washing-machine", label: "Washing machine", icon: "laundry", group: "laundry" },
  { id: "dryer", label: "Dryer", icon: "laundry", group: "laundry" },
  { id: "heating", label: "Heating", icon: "thermometer", group: "comfort" },
  { id: "air-conditioning", label: "Air conditioning", icon: "thermometer", group: "comfort" },
  { id: "family", label: "Family suitable", icon: "bed", group: "comfort" },
  { id: "pets", label: "Pet-friendly", icon: "dog", group: "comfort" },
  { id: "tv", label: "HDTV", icon: "tv", group: "entertainment" },
  { id: "netflix", label: "Netflix", icon: "tv", group: "entertainment" },
  { id: "parking", label: "Free parking", icon: "car", group: "parking" },
  { id: "garden", label: "Garden", icon: "trees", group: "outdoor" },
  { id: "patio", label: "Patio", icon: "trees", group: "outdoor" },
  { id: "step-free", label: "Step-free entrance", icon: "accessibility", group: "accessibility" },
  { id: "smoke-alarm", label: "Smoke alarm", icon: "shield", group: "safety" },
  { id: "first-aid", label: "First aid kit", icon: "shield", group: "safety" },
  { id: "wifi", label: "Wi-Fi", icon: "wifi", group: "workspace" },
  { id: "workspace", label: "Dedicated workspace", icon: "desk", group: "workspace" },
  { id: "corporate", label: "Corporate-stay friendly", icon: "desk", group: "workspace" },
  { id: "self-check-in", label: "Self check-in with key safe", icon: "key", group: "other" },
  { id: "entrance", label: "Private entrance", icon: "key", group: "other" },
  { id: "long-term", label: "Long-term stays allowed", icon: "calendar", group: "other" },
];
const aliases: Record<string, string> = { wifi: "wifi", "wi fi": "wifi", television: "tv", kitchen: "kitchen", "air-conditioning": "air-conditioning" };
export function normalizeAmenities(labels: string[], saved: unknown = []): Amenity[] {
  const details = Array.isArray(saved) ? saved : [];
  const seen = new Set<string>();
  return labels.flatMap(label => {
    const key = label.trim().toLowerCase(); if (!key || seen.has(key)) return []; seen.add(key);
    const existing = details.find(item => item && typeof item === "object" && String(item.label ?? item.name).toLowerCase() === key);
    const known = AMENITY_CATALOG.find(item => item.id === existing?.id || item.id === aliases[key] || item.label.toLowerCase() === key);
    return [{ id: known?.id ?? String(existing?.id || `custom:${key}`), label: label.trim(), icon: (AMENITY_ICONS as readonly string[]).includes(existing?.icon) ? existing.icon : known?.icon ?? "check", group: Object.hasOwn(AMENITY_GROUPS, existing?.group ?? "") ? existing.group : known?.group ?? "other" } as Amenity];
  });
}
