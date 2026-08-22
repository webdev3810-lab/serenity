const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168);
}

export function validateCalendarFeedUrl(value: string) {
  const input = value.trim();
  if (!input) return { ok: false, message: "Paste an iCal feed URL." };
  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (url.protocol !== "https:") return { ok: false, message: "Use the HTTPS iCal URL supplied by the booking platform." };
    if (url.username || url.password || BLOCKED_HOSTS.has(hostname) || isPrivateIpv4(hostname)) {
      return { ok: false, message: "This calendar URL is not allowed. Use a public HTTPS iCal feed without embedded credentials." };
    }
    if (url.pathname === "/" && !url.search) return { ok: false, message: "This looks like a website URL. Paste the platform's calendar export URL ending in .ics or /ical." };
    return { ok: true, message: "" };
  } catch {
    return { ok: false, message: "Enter a valid HTTPS iCal feed URL." };
  }
}
