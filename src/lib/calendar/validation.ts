const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.azure.internal",
  "instance-data.ec2.internal",
  "169.254.169.254",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 0
    || parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && (parts[1] === 0 || parts[1] === 168))
    || (parts[0] === 198 && parts[1] >= 18 && parts[1] <= 19)
    || parts[0] >= 224;
}

function isPrivateIpv6(hostname: string) {
  const compact = hostname.toLowerCase();
  return compact === "::"
    || compact === "::1"
    || compact.startsWith("fc")
    || compact.startsWith("fd")
    || /^fe[89ab]/.test(compact)
    || compact.startsWith("ff")
    || compact.startsWith("::ffff:127.")
    || compact.startsWith("::ffff:10.")
    || compact.startsWith("::ffff:192.168.")
    || compact.startsWith("::ffff:169.254.");
}

export function isBlockedCalendarHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return BLOCKED_HOSTS.has(normalized)
    || normalized.endsWith(".localhost")
    || normalized.endsWith(".local")
    || normalized.endsWith(".internal")
    || isPrivateIpv4(normalized)
    || (normalized.includes(":") && isPrivateIpv6(normalized));
}

function looksLikePlatformWebpage(url: URL) {
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  const calendarPath = path.endsWith(".ics") || path.includes("/ical") || path.includes("calendar");
  return (host.includes("airbnb.") || host.includes("vrbo.") || host.includes("stayz.")) && !calendarPath;
}

export function normalizeCalendarPropertySlug(value: string) {
  return value.trim().replace(/\.ics$/i, "");
}

export function validateCalendarFeedUrl(value: string): { ok: true; message: ""; normalizedUrl: string } | { ok: false; message: string; normalizedUrl?: undefined } {
  const input = value.trim();
  if (!input) return { ok: false, message: "Paste an iCal feed URL." };
  try {
    const normalizedInput = input.replace(/^webcal:\/\//i, "https://");
    const url = new URL(normalizedInput);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (url.protocol !== "https:") return { ok: false, message: "Use an HTTPS or webcal iCal URL supplied by the booking platform." };
    if (url.username || url.password || isBlockedCalendarHostname(hostname)) {
      return { ok: false, message: "This calendar URL is not allowed. Use a public HTTPS iCal feed without embedded credentials." };
    }
    if (looksLikePlatformWebpage(url)) return { ok: false, message: "This is a listing webpage, not a private iCal export URL. Copy the calendar export link ending in .ics." };
    if (url.pathname === "/" && !url.search) return { ok: false, message: "This looks like a website URL. Paste the platform's calendar export URL ending in .ics or /ical." };
    url.hash = "";
    return { ok: true, message: "", normalizedUrl: url.toString() };
  } catch {
    return { ok: false, message: "Enter a valid HTTPS or webcal iCal feed URL." };
  }
}
