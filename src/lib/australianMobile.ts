/** The editable part of an Australian mobile number, without its +61 prefix. */
export function australianMobileLocalDigits(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("61") && digits.length > 9) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length > 9) digits = digits.slice(1);
  return digits.slice(0, 9);
}

/** Group the nine editable digits for readability without changing the stored number. */
export function formatAustralianMobileLocal(value: string): string {
  return australianMobileLocalDigits(value).replace(/(\d{3})(?=\d)/g, "$1 ");
}

/** Accept the editable digits or a pasted Australian mobile and store E.164. */
export function normalizeAustralianMobile(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (/^614\d{8}$/.test(digits)) return `+${digits}`;
  if (/^04\d{8}$/.test(digits)) return `+61${digits.slice(1)}`;
  if (/^4\d{8}$/.test(digits)) return `+61${digits}`;
  return null;
}
