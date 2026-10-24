import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export type BookingConfirmationPdfDetails = {
  reference: string;
  property?: string;
  dates?: string;
  guests?: string;
  totalPaid?: string;
  guestName?: string;
  email?: string;
  receiptCode: string;
};

function supportedText(value: string, font: PDFFont) {
  const normalized = value.replace(/[\u2010-\u2015]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');
  return Array.from(normalized).map((character) => {
    try {
      font.encodeText(character);
      return character;
    } catch {
      return "?";
    }
  }).join("");
}

function wrapText(value: string, font: PDFFont, size: number, maxWidth: number) {
  const words = supportedText(value.replace(/\s+/g, " ").trim(), font).split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    while (font.widthOfTextAtSize(line, size) > maxWidth && line.length > 1) {
      let split = line.length - 1;
      while (split > 1 && font.widthOfTextAtSize(line.slice(0, split), size) > maxWidth) split--;
      lines.push(line.slice(0, split));
      line = line.slice(split);
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function createBookingConfirmationPdf(details: BookingConfirmationPdfDetails) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Booking confirmation ${details.reference}`);
  pdf.setAuthor("Serenity Corporate Stays");
  pdf.setSubject("Confirmed reservation and payment receipt");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]);
  const navy = rgb(0.03, 0.17, 0.27);
  const muted = rgb(0.36, 0.42, 0.45);
  const gold = rgb(0.82, 0.68, 0.39);
  const margin = 48;
  const contentWidth = page.getWidth() - margin * 2;

  page.drawText("SERENITY CORPORATE STAYS", { x: margin, y: 778, font: bold, size: 12, color: navy });
  page.drawRectangle({ x: margin, y: 758, width: contentWidth, height: 2, color: gold });
  page.drawText("RESERVATION CONFIRMED", { x: margin, y: 711, font: bold, size: 11, color: muted });

  const title = supportedText(`Booking confirmation #${details.reference}`, bold);
  const titleSize = Math.min(26, 26 * contentWidth / bold.widthOfTextAtSize(title, 26));
  page.drawText(title, { x: margin, y: 670, font: bold, size: titleSize, color: navy });
  page.drawText("Keep this document as proof of your confirmed booking and payment.", { x: margin, y: 638, font: regular, size: 10, color: muted });

  const fields = [
    ["PROPERTY", details.property],
    ["DATES", details.dates],
    ["GUESTS", details.guests],
    ["TOTAL PAID", details.totalPaid],
    ["GUEST NAME", details.guestName],
    ["RESERVATION REF", details.reference],
    ["RECEIPT CODE", details.receiptCode],
    ["EMAIL", details.email],
  ].filter((field): field is [string, string] => Boolean(field[1]));

  const columnWidth = 234;
  fields.forEach(([label, value], index) => {
    const x = margin + (index % 2) * (columnWidth + 30);
    const y = 574 - Math.floor(index / 2) * 81;
    page.drawText(label, { x, y, font: bold, size: 8.5, color: muted });
    wrapText(value, bold, 12, columnWidth).slice(0, 3).forEach((line, lineIndex) => {
      page.drawText(line, { x, y: y - 22 - lineIndex * 15, font: bold, size: 12, color: navy });
    });
  });

  page.drawRectangle({ x: margin, y: 171, width: contentWidth, height: 75, color: navy });
  page.drawText("ACCESS & CHECK-IN", { x: margin + 18, y: 220, font: bold, size: 9, color: gold });
  const accessMessage = details.email
    ? `Exact address and key-safe access details will be sent to ${details.email} before check-in.`
    : "Exact address and key-safe access details will be sent before check-in.";
  wrapText(accessMessage, regular, 10, contentWidth - 36).slice(0, 2).forEach((line, index) => {
    page.drawText(line, { x: margin + 18, y: 201 - index * 14, font: regular, size: 10, color: rgb(1, 1, 1) });
  });

  page.drawRectangle({ x: margin, y: 116, width: contentWidth, height: 0.7, color: gold });
  page.drawText("This confirms your booking and payment. It is not a tax invoice.", { x: margin, y: 94, font: regular, size: 9, color: muted });
  page.drawText("Serenity Corporate Stays  |  Pakenham, Victoria", { x: margin, y: 74, font: regular, size: 9, color: muted });

  return pdf.save();
}
