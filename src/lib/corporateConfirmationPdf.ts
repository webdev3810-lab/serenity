import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { formatAud, formatDateAu } from "@/src/lib/booking";
import { receiptCode } from "@/src/lib/paymentReceipt";

export type CorporateConfirmationHouse = {
  reference: string;
  home: string;
  check_in: string;
  checkout: string;
  free_cancellation_until?: string | null;
  late_cancellation_fee?: number | null;
  adults: number;
  total: number;
};

export type CorporateConfirmationPdfDetails = {
  reference: string;
  total: number | null;
  houses: CorporateConfirmationHouse[];
};

function safeText(value: string, font: PDFFont) {
  const normalized = value.replace(/[\u2010-\u2015]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');
  return Array.from(normalized).map((character) => {
    try { font.encodeText(character); return character; } catch { return "?"; }
  }).join("");
}

function wrap(value: string, font: PDFFont, size: number, width: number) {
  const words = safeText(value, font).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) { line = next; continue; }
    if (line) lines.push(line);
    line = word;
    while (font.widthOfTextAtSize(line, size) > width && line.length > 1) {
      let split = line.length - 1;
      while (split > 1 && font.widthOfTextAtSize(line.slice(0, split), size) > width) split--;
      lines.push(line.slice(0, split));
      line = line.slice(split);
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function createCorporateConfirmationPdf({ reference, total, houses }: CorporateConfirmationPdfDetails) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Corporate booking confirmation ${reference}`);
  pdf.setAuthor("Serenity Corporate Bookings");
  pdf.setSubject("Confirmed corporate booking and payment receipt");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0, 0.16, 0.27);
  const muted = rgb(0.37, 0.43, 0.52);
  const border = rgb(0.84, 0.88, 0.93);
  const gold = rgb(0.82, 0.68, 0.39);
  const margin = 48;
  const width = 595.28;
  const height = 841.89;
  const contentWidth = width - margin * 2;

  const addPage = (continued: boolean) => {
    const page = pdf.addPage([width, height]);
    page.drawText("SERENITY CORPORATE BOOKINGS", { x: margin, y: height - 65, font: bold, size: 12, color: navy });
    page.drawRectangle({ x: margin, y: height - 83, width: contentWidth, height: 2, color: gold });
    page.drawText(continued ? "CORPORATE BOOKING CONFIRMED - CONTINUED" : "CORPORATE BOOKING CONFIRMED", { x: margin, y: height - 122, font: bold, size: 17, color: navy });
    if (continued) {
      page.drawText(safeText(`Booking reference: ${reference}`, regular), { x: margin, y: height - 149, font: regular, size: 10, color: muted });
      return { page, y: height - 183 };
    }
    page.drawText("Payment succeeded. Keep this confirmation for your records.", { x: margin, y: height - 146, font: regular, size: 10, color: muted });
    page.drawText("BOOKING REFERENCE", { x: margin, y: height - 193, font: bold, size: 8.5, color: muted });
    page.drawText(safeText(reference, bold), { x: margin, y: height - 215, font: bold, size: 15, color: navy });
    page.drawText("RECEIPT CODE", { x: margin, y: height - 251, font: bold, size: 8.5, color: muted });
    page.drawText(safeText(receiptCode(reference), bold), { x: margin, y: height - 273, font: bold, size: 14, color: navy });
    return { page, y: height - 313 };
  };

  let { page, y } = addPage(false);
  const sectionTitle = () => {
    page.drawText("HOUSE STAYS", { x: margin, y, font: bold, size: 9, color: muted });
    y -= 28;
  };
  sectionTitle();

  for (const house of houses) {
    const nameLines = wrap(house.home, bold, 12, contentWidth - 36);
    const stay = `${formatDateAu(house.check_in)} to ${formatDateAu(house.checkout)} | ${house.adults} guest${house.adults === 1 ? "" : "s"} | ${formatAud(Number(house.total))}`;
    const stayLines = wrap(stay, regular, 10, contentWidth - 36);
    const policy = house.free_cancellation_until ? `Free cancellation through ${formatDateAu(house.free_cancellation_until)}, 11:59 pm Melbourne time.${house.late_cancellation_fee == null ? "" : ` Afterward, up to ${formatAud(Number(house.late_cancellation_fee))} is retained and the rest refunded.`}` : "";
    const policyLines = policy ? wrap(policy, regular, 8.5, contentWidth - 36) : [];
    const rowHeight = 27 + nameLines.length * 17 + stayLines.length * 15 + policyLines.length * 12 + 12;
    if (y - rowHeight < 133) {
      ({ page, y } = addPage(true));
      sectionTitle();
    }
    page.drawRectangle({ x: margin, y: y - rowHeight, width: contentWidth, height: rowHeight, color: rgb(0.97, 0.98, 0.99), borderColor: border, borderWidth: 0.6 });
    let textY = y - 25;
    for (const line of nameLines) { page.drawText(line, { x: margin + 16, y: textY, font: bold, size: 12, color: navy }); textY -= 17; }
    for (const line of stayLines) { page.drawText(line, { x: margin + 16, y: textY - 2, font: regular, size: 10, color: navy }); textY -= 15; }
    for (const line of policyLines) { page.drawText(line, { x: margin + 16, y: textY - 2, font: regular, size: 8.5, color: muted }); textY -= 12; }
    y -= rowHeight + 10;
  }

  if (y < 112) ({ page, y } = addPage(true));
  if (total !== null) {
    page.drawText(safeText(`Total paid: ${formatAud(total)}`, bold), { x: margin, y: y - 12, font: bold, size: 14, color: navy });
    y -= 44;
  }
  if (y < 85) ({ page, y } = addPage(true));
  page.drawRectangle({ x: margin, y: y - 9, width: contentWidth, height: 0.7, color: border });
  page.drawText("This confirms payment and your booking. It is not a tax invoice.", { x: margin, y: y - 30, font: regular, size: 9, color: muted });
  page.drawText("Serenity Corporate Bookings | Pakenham, Victoria", { x: margin, y: y - 48, font: regular, size: 9, color: muted });

  return pdf.save();
}
