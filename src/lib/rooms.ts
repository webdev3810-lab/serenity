export const BED_TYPES = { king: "King bed", queen: "Queen bed", double: "Double bed", single: "Single bed", bunk: "Bunk bed", sofa: "Sofa bed", cot: "Cot", floor: "Floor mattress" } as const;
export type BedType = keyof typeof BED_TYPES;
export type RoomArrangement = { room: string; beds: string; bedTypes?: { type: BedType; quantity: number }[]; photo?: string; description?: string; kind?: "bedroom" | "other" };
export function normalizeRooms(value: unknown): RoomArrangement[] {
  return Array.isArray(value) ? value.filter(v => v && typeof v === "object").map(v => ({ ...v, room: String(v.room ?? ""), beds: String(v.beds ?? "") })) : [];
}
export function roomBedLabel(room: RoomArrangement) { return room.bedTypes?.length ? room.bedTypes.map(b=>`${b.quantity} ${BED_TYPES[b.type]?.toLowerCase() ?? "bed"}${b.quantity === 1 ? "" : "s"}`).join(" · ") : room.beds; }
export function roomTotals(rooms: RoomArrangement[]) {
  if (!rooms.length || rooms.some(r=>!r.bedTypes?.length || !r.kind)) return null;
  return { bedrooms: rooms.filter(r=>r.kind === "bedroom").length, beds: rooms.reduce((n,r)=>n+r.bedTypes!.reduce((s,b)=>s+b.quantity,0),0) };
}
export function validateRooms(value: unknown): string[] {
  if (!Array.isArray(value)) return value == null ? [] : ["Sleeping arrangements must be a room list."];
  const errors: string[] = []; if (value.length > 30) errors.push("Use at most 30 rooms.");
  for (const r of value) {
    if (!r || typeof r !== "object") { errors.push("Invalid room."); continue; }
    if (String(r.room ?? "").length > 80 || String(r.beds ?? "").length > 300 || String(r.description ?? "").length > 300) errors.push("Room name, beds or description is too long.");
    if (r.bedTypes !== undefined && (!Array.isArray(r.bedTypes) || !r.bedTypes.length || r.bedTypes.some((b: { type: string; quantity: number })=>!b || !Object.hasOwn(BED_TYPES, b.type) || !Number.isInteger(b.quantity) || b.quantity < 1 || b.quantity > 30))) errors.push("Choose a valid bed type and quantity from 1 to 30.");
    if (r.kind !== undefined && r.kind !== "bedroom" && r.kind !== "other") errors.push("Choose whether the room is a bedroom or another sleeping space.");
    if (r.photo && !/^https:\/\/[^\s]+$|^\/(?!\/)[^\s]*$/.test(String(r.photo))) errors.push("Room photos must use a safe image URL.");
  }
  return errors;
}
