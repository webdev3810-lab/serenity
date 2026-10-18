/** Format an Australian contact number as the user types, including local 04 numbers. */
export function formatAustralianContactPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("61")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 9);
  if (!digits) return value.trim() ? "+61" : "";

  if (digits.startsWith("4")) {
    return `+61 ${digits.slice(0, 3)}${digits.length > 3 ? ` ${digits.slice(3, 6)}` : ""}${digits.length > 6 ? ` ${digits.slice(6)}` : ""}`;
  }
  return `+61 ${digits.slice(0, 1)}${digits.length > 1 ? ` ${digits.slice(1, 5)}` : ""}${digits.length > 5 ? ` ${digits.slice(5)}` : ""}`;
}
