import type { ParsedCalendarEvent } from "@/src/lib/calendar/types";

const DATE_PATTERN = /^(\d{4})(\d{2})(\d{2})/;

export function isIcsCalendarText(value: string) {
  const normalized = value.replace(/^\uFEFF/, "").toUpperCase();
  return normalized.includes("BEGIN:VCALENDAR") && normalized.includes("END:VCALENDAR");
}

function toDateValue(value: string) {
  const match = value.trim().match(DATE_PATTERN);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

export function addCalendarDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function compareCalendarDates(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function unescapeIcsText(value: string) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function stableFallbackId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `event-${(hash >>> 0).toString(16)}`;
}

function readIcsProperty(line: string) {
  const separator = line.indexOf(":");
  if (separator < 0) return null;
  const [nameWithParameters, value] = [line.slice(0, separator), line.slice(separator + 1)];
  const [name, ...parameters] = nameWithParameters.split(";");
  return { name: name.toUpperCase(), parameters, value };
}

export function parseIcsCalendar(input: string): ParsedCalendarEvent[] {
  const lines: string[] = [];
  for (const line of input.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    if (/^[ \t]/.test(line) && lines.length) lines[lines.length - 1] += line.slice(1);
    else lines.push(line);
  }

  const events: ParsedCalendarEvent[] = [];
  let current: Record<string, { value: string; parameters: string[] }> | null = null;
  let rawLines: string[] = [];

  const finishEvent = () => {
    if (!current) return;
    const startDate = toDateValue(current.DTSTART?.value ?? "");
    if (!startDate) {
      current = null;
      rawLines = [];
      return;
    }

    const endDate = toDateValue(current.DTEND?.value ?? "") ?? addCalendarDays(startDate, 1);
    const safeEndDate = compareCalendarDates(endDate, startDate) > 0 ? endDate : addCalendarDays(startDate, 1);
    const summary = unescapeIcsText(current.SUMMARY?.value ?? "Reserved").slice(0, 160) || "Reserved";
    const status = current.STATUS?.value.trim().toUpperCase() === "CANCELLED" ? "cancelled" : "active";
    const transparent = current.TRANSP?.value.trim().toUpperCase() === "TRANSPARENT";
    const externalEventId = unescapeIcsText(current.UID?.value ?? "").slice(0, 512) || stableFallbackId(rawLines.join("\n"));

    events.push({
      externalEventId,
      startDate,
      endDate: safeEndDate,
      summary,
      status,
      isBlocking: status === "active" && !transparent,
    });
    current = null;
    rawLines = [];
  };

  for (const line of lines) {
    const property = readIcsProperty(line);
    if (!property) continue;
    if (property.name === "BEGIN" && property.value.trim().toUpperCase() === "VEVENT") {
      current = {};
      rawLines = [line];
      continue;
    }
    if (property.name === "END" && property.value.trim().toUpperCase() === "VEVENT") {
      finishEvent();
      continue;
    }
    if (current) {
      rawLines.push(line);
      current[property.name] = { value: property.value, parameters: property.parameters };
    }
  }
  finishEvent();
  return events;
}

export type IcsExportEvent = {
  uid: string;
  startDate: string;
  endDate: string;
  summary: string;
};

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function formatIcsDate(value: string) {
  return value.replaceAll("-", "");
}

export function buildIcsCalendar(events: IcsExportEvent[], now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Serenity Stays//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(event.uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${formatIcsDate(event.startDate)}`,
      `DTEND;VALUE=DATE:${formatIcsDate(event.endDate)}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function groupCalendarDates(values: string[]) {
  const dates = [...new Set(values)].sort(compareCalendarDates);
  const ranges: Array<{ startDate: string; endDate: string }> = [];
  for (const date of dates) {
    const previous = ranges[ranges.length - 1];
    if (!previous || compareCalendarDates(date, previous.endDate) !== 0) {
      ranges.push({ startDate: date, endDate: addCalendarDays(date, 1) });
    } else {
      previous.endDate = addCalendarDays(date, 1);
    }
  }
  return ranges;
}
