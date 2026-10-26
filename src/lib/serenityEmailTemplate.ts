type EmailBlock =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "rows"; rows: Array<[string, string]> }
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "link"; url: string };

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);

function logoUrl() {
  const configured = process.env.EMAIL_ASSET_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const url = new URL(configured || "https://www.serenityhomesdirect.com");
    if (url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
      return new URL("/LOGO.png", url).toString();
    }
  } catch { /* Use the public site when a local preview URL is configured. */ }
  return "https://www.serenityhomesdirect.com/LOGO.png";
}

function toBlocks(text: string, reference: string): EmailBlock[] {
  const blocks: EmailBlock[] = [];
  let paragraph: string[] = [];
  let rows: Array<[string, string]> = [];
  let list: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", lines: paragraph });
    if (rows.length) blocks.push({ kind: "rows", rows });
    if (list.length) blocks.push({ kind: "list", items: list });
    paragraph = [];
    rows = [];
    list = [];
  };

  const lines = text.trim().replace(/\nSerenity Stays\s*$/i, "").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flush(); continue; }
    if (reference && line.endsWith(reference) && /^(new contact message|new .*enquiry|paid booking|paid corporate booking|booking not completed):?/i.test(line)) continue;
    if (/^https:\/\/\S+$/i.test(line)) {
      flush();
      blocks.push({ kind: "link", url: line });
      continue;
    }
    if (/^(houses and stay dates|message|notes):$/i.test(line)) {
      flush();
      blocks.push({ kind: "heading", text: line.slice(0, -1) });
      continue;
    }
    if (/^\s{2,}/.test(rawLine) || (blocks.at(-1)?.kind === "heading" && /\s·\s/.test(line))) {
      if (paragraph.length || rows.length) flush();
      list.push(line);
      continue;
    }
    const match = /^([^:]{2,46}):\s+(.+)$/.exec(line);
    if (match && !/^https?$/i.test(match[1])) {
      if (paragraph.length || list.length) flush();
      rows.push([match[1], match[2]]);
      continue;
    }
    if (rows.length || list.length) flush();
    paragraph.push(line);
  }
  flush();
  return blocks;
}

function renderBlock(block: EmailBlock, subject: string) {
  switch (block.kind) {
    case "paragraph":
      return `<p style="margin:0 0 18px;color:#344b5e;font-size:15px;line-height:1.65">${block.lines.map(escapeHtml).join("<br>")}</p>`;
    case "heading":
      return `<h2 style="margin:22px 0 10px;color:#082f49;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(block.text)}</h2>`;
    case "rows":
      return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:6px 0 22px;border-collapse:collapse;border:1px solid #dce7ed;border-radius:10px;background:#f8fbfc">${block.rows.map(([label, value]) => `<tr><td style="width:34%;padding:11px 14px;border-bottom:1px solid #e5edf1;color:#617789;font-size:13px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:11px 14px;border-bottom:1px solid #e5edf1;color:#082f49;font-size:14px;font-weight:600;vertical-align:top;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(value)}</td></tr>`).join("")}</table>`;
    case "list":
      return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:2px 0 20px;border-collapse:separate;border-spacing:0 8px">${block.items.map((item) => `<tr><td style="padding:13px 15px;border:1px solid #dce7ed;border-radius:10px;background:#f8fbfc;color:#082f49;font-size:14px;line-height:1.55;overflow-wrap:anywhere">${escapeHtml(item)}</td></tr>`).join("")}</table>`;
    case "link": {
      if (!/password|reset|not confirmed/i.test(subject)) {
        return `<p style="margin:0 0 18px;color:#344b5e;font-size:14px;line-height:1.6;overflow-wrap:anywhere">${escapeHtml(block.url)}</p>`;
      }
      const label = /password|reset/i.test(subject) ? "Reset password" : "Start a new booking";
      const safeUrl = escapeHtml(block.url);
      return `<p style="margin:4px 0 22px"><a href="${safeUrl}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#062b45;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">${label}</a><br><span style="display:block;margin-top:10px;color:#617789;font-size:11px;line-height:1.5;overflow-wrap:anywhere">${safeUrl}</span></p>`;
    }
  }
}

export function renderSerenityEmail(subject: string, text: string) {
  const [rawTitle, rawReference = ""] = subject.split(" · ");
  const title = rawTitle.trim();
  const reference = rawReference.trim();
  const status = /not (completed|confirmed)/i.test(title) ? "Booking update" : /confirmed|new paid/i.test(title) ? "Confirmed" : /received/i.test(title) ? "Received" : /reset|password/i.test(title) ? "Account security" : /contact|enquiry|question|quote request/i.test(title) ? "New enquiry" : "Serenity update";
  const preview = text.replace(/\s+/g, " ").trim().slice(0, 145);
  const body = toBlocks(text, reference).map((block) => renderBlock(block, title)).join("");
  const logo = escapeHtml(logoUrl());
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3f7f9;color:#082f49;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preview)}</div><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;background:#f3f7f9"><tr><td align="center" style="padding:28px 12px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;max-width:640px;border:1px solid #dce7ed;border-radius:18px;background:#ffffff;overflow:hidden"><tr><td style="padding:24px 30px;background:#062b45"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td width="102" style="width:102px;vertical-align:middle"><span style="display:inline-block;padding:4px;border-radius:10px;background:#ffffff"><img src="${logo}" width="94" height="48" alt="Serenity Stays" style="display:block;width:94px;height:48px;border:0;object-fit:contain"></span></td><td style="padding-left:15px;color:#ffffff;vertical-align:middle"><span style="display:block;color:#e7c98e;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">Serenity Stays</span><span style="display:block;margin-top:5px;color:#ffffff;font-size:14px;line-height:1.35">Private furnished homes</span></td></tr></table></td></tr><tr><td style="padding:32px 30px 12px"><span style="display:inline-block;padding:7px 11px;border-radius:999px;background:#edf4f8;color:#235b77;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(status)}</span><h1 style="margin:16px 0 8px;color:#062b45;font-size:27px;font-weight:700;line-height:1.22">${escapeHtml(title)}</h1>${reference ? `<p style="margin:0 0 16px;color:#617789;font-size:13px;overflow-wrap:anywhere">Reference: <strong style="color:#082f49">${escapeHtml(reference)}</strong></p>` : ""}<div style="height:2px;background:#d9b77a"></div></td></tr><tr><td style="padding:18px 30px 18px">${body}</td></tr><tr><td style="padding:20px 30px;border-top:1px solid #dce7ed;background:#f8fbfc;color:#617789;font-size:12px;line-height:1.6">Serenity Stays<br><a href="https://www.serenityhomesdirect.com" style="color:#235b77;text-decoration:underline">serenityhomesdirect.com</a></td></tr></table></td></tr></table></body></html>`;
}
