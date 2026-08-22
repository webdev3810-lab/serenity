export const AU_LOCALE = "en-AU";
export const AU_TIME_ZONE = "Australia/Melbourne";

export const formatAuNumber = (value: number, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat(AU_LOCALE, options).format(value);

export const formatAuTime = (date: Date) =>
  new Intl.DateTimeFormat(AU_LOCALE, {
    timeZone: AU_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
