import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { randomUUID } from "node:crypto";
import { formatCurrency } from "@/lib/financial";
import {
  getInvoiceLogo, getInvoiceVatNotice, invoiceBankDetails, invoiceBillingDetails,
  invoiceFooter, invoiceLabels, invoicePaper, invoicePartyBlock, type InvoiceCompany, type InvoiceParty,
} from "@/lib/invoice";
import { StorageService } from "./storage.service";

export interface InvoicePdfData {
  invoice: {
    id: string;
    invoiceNumber: string;
    issueDate: Date;
    dueDate: Date;
    currency: string;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    status: string;
    notes?: string | null;
    billingPeriodStart?: Date | null;
    billingPeriodEnd?: Date | null;
    showUnitPrice?: boolean;
    vatNotice?: string | null;
  };
  client: InvoiceParty;
  contract?: { title: string; contractNumber: string } | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    total: number;
  }>;
  company: InvoiceCompany;
}

function pdfColor(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return rgb((value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

const { ink, text, muted, accent, surface, border, divider } = {
  ink: pdfColor(invoicePaper.ink),
  text: pdfColor(invoicePaper.text),
  muted: pdfColor(invoicePaper.muted),
  accent: pdfColor(invoicePaper.accent),
  surface: pdfColor(invoicePaper.surface),
  border: pdfColor(invoicePaper.border),
  divider: pdfColor(invoicePaper.divider),
};
const white = rgb(1, 1, 1);
const pageSize: [number, number] = [595.28, 841.89];
const margin = 40;
const right = pageSize[0] - margin;
const contentWidth = right - margin;
const top = pageSize[1] - margin;
const bottom = 67;

function printable(value: string, supported: Set<number>): string {
  return Array.from(value.normalize("NFC").replace(/[^\S\n]+/g, " "), (char) => {
    if (char === "\n" || supported.has(char.codePointAt(0)!)) return char;
    const base = char.normalize("NFD").replace(/\p{M}/gu, "");
    return Array.from(base).every((part) => supported.has(part.codePointAt(0)!)) ? base : "?";
  }).join("");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  return text.split("\n").flatMap((paragraph) => {
    const lines: string[] = [];
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const next = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const char of word) {
        if (line && font.widthOfTextAtSize(line + char, size) > width) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
    return [...lines, line];
  });
}

export class PdfService {
  static async generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
    const { invoice, company, client, contract } = data;
    const doc = await PDFDocument.create();
    doc.setTitle("Facture " + invoice.invoiceNumber);
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
    const supported = new Set(regular.getCharacterSet());
    const clean = (value: string) => printable(value, supported);
    const money = (amount: number) => formatCurrency(amount, invoice.currency);

    let page: PDFPage = doc.addPage(pageSize);
    let y = top;

    function draw(value: string, x: number, baseline: number, size = 9, font = regular, color = ink) {
      page.drawText(clean(value), { x, y: baseline, size, font, color });
    }

    function aligned(value: string, x: number, baseline: number, size: number, {
      font = regular, color = ink, width = contentWidth, center = false,
    } = {}) {
      const textWidth = font.widthOfTextAtSize(clean(value), size);
      const scale = textWidth > width ? width / textWidth : 1;
      draw(value, x - textWidth * scale / (center ? 2 : 1), baseline, size * scale, font, color);
    }

    function line(baseline: number, start = margin, end = right, color = border, thickness = 0.6) {
      page.drawLine({ start: { x: start, y: baseline }, end: { x: end, y: baseline }, thickness, color });
    }

    function panel(x: number, upper: number, width: number, height: number, style: "card" | "dark" | "dashed" = "card") {
      const r = style === "dark" ? 3 : 4;
      const path = `M ${r} 0 H ${width - r} Q ${width} 0 ${width} ${r} V ${height - r}
        Q ${width} ${height} ${width - r} ${height} H ${r} Q 0 ${height} 0 ${height - r} V ${r} Q 0 0 ${r} 0 Z`;
      page.drawSvgPath(path, {
        x, y: upper,
        color: style === "dark" ? ink : style === "card" ? surface : undefined,
        borderColor: style === "dark" ? undefined : style === "dashed" ? divider : border,
        borderWidth: style === "dark" ? 0 : style === "dashed" ? 0.55 : 0.85,
        borderDashArray: style === "dashed" ? [1.4, 1.1] : undefined,
      });
    }

    function nextPage() {
      page = doc.addPage(pageSize);
      y = top;
      draw("FACTURE", margin, y - 7, 11, bold);
      aligned("N° " + invoice.invoiceNumber, right, y - 7, 9, { font: bold, color: accent, width: contentWidth - 65 });
      y -= 18;
      line(y);
      y -= 18;
    }

    function ensureSpace(height: number) {
      if (y - height < bottom) nextPage();
    }

    draw("FACTURE", margin, y - 23, 27, bold);
    const logo = getInvoiceLogo(company.logo);
    if (logo) {
      try {
        const image = logo.startsWith("data:image/png") ? await doc.embedPng(logo) : await doc.embedJpg(logo);
        const dimensions = image.scaleToFit(104, 46);
        page.drawImage(image, { ...dimensions, x: right - dimensions.width, y: y - 24 - dimensions.height / 2 });
      } catch {
        // A previously saved invalid logo should not prevent invoice generation.
      }
    }
    const numberLines = wrap(clean("N° " + invoice.invoiceNumber), bold, 11, contentWidth - (logo ? 120 : 0));
    numberLines.forEach((part, index) => draw(part, margin, y - 42 - index * 13, 11, bold, accent));
    y -= 63 + (numberLines.length - 1) * 13;
    line(y, margin, right, border, 1);
    y -= 21;

    const gap = 12;
    const cardWidth = (contentWidth - gap * 2) / 3;
    const inset = 10;
    const cardTextWidth = cardWidth - 2 * inset;
    const detailSize = 8.5;
    const cardStep = 11.5;
    const cardBase = 44;
    type CardLine = { value: string; prefix?: string; size: number; font: PDFFont; color: typeof text };
    function partyLines(party: ReturnType<typeof invoicePartyBlock>): CardLine[] {
      return [
        ...wrap(clean(party.name), bold, 10, cardTextWidth).map((value) => ({ value, size: 10, font: bold, color: ink })),
        ...party.details.flatMap((detail) => wrap(clean(detail), regular, detailSize, cardTextWidth)
          .map((value) => ({ value, size: detailSize, font: regular, color: text }))),
      ];
    }
    const billingLines = invoiceBillingDetails(invoice, company, contract).flatMap(({ label, value, emphasis }): CardLine[] => {
      const prefix = label + " : ";
      if (emphasis) return [{ value, prefix, size: detailSize, font: bold, color: ink }];
      return wrap(clean(prefix + value), regular, detailSize, cardTextWidth)
        .map((value) => ({ value, size: detailSize, font: regular, color: text }));
    });
    const cards = [
      { heading: invoiceLabels.issuer, lines: partyLines(invoicePartyBlock(company)) },
      { heading: invoiceLabels.client, lines: partyLines(invoicePartyBlock(client, true)) },
      { heading: invoiceLabels.billing, lines: billingLines },
    ];
    const cardRows = Math.max(...cards.map((card) => card.lines.length));
    let cardOffset = 0;
    while (cardOffset < cardRows) {
      ensureSpace(cardOffset === 0 ? 131 : cardBase + cardStep);
      const rows = Math.min(cardRows - cardOffset, Math.floor((y - bottom - cardBase) / cardStep));
      const height = Math.max(cardOffset === 0 ? 131 : 0, cardBase + rows * cardStep);
      for (const [index, card] of cards.entries()) {
        const x = margin + index * (cardWidth + gap);
        panel(x, y, cardWidth, height);
        draw(card.heading.toUpperCase(), x + inset, y - 17, 7.5, bold, accent);
        line(y - 22, x + inset, x + cardWidth - inset, divider);
        card.lines.slice(cardOffset, cardOffset + rows).forEach(({ value, prefix, size, font, color }, row) => {
          const baseline = y - 36 - row * cardStep;
          if (prefix) draw(prefix, x + inset, baseline, size, regular, text);
          draw(value, x + inset + (prefix ? regular.widthOfTextAtSize(clean(prefix), size) : 0), baseline, size, font, color);
        });
      }
      cardOffset += rows;
      y -= height + 20;
      if (cardOffset < cardRows) nextPage();
    }

    const showUnitPrice = invoice.showUnitPrice !== false;
    const quantityX = showUnitPrice ? margin + contentWidth * 0.62 : right - 9;
    const priceX = margin + contentWidth * 0.77;
    const totalX = right - 8;
    const descriptionWidth = showUnitPrice ? contentWidth * 0.57 - 16 : contentWidth - 66;
    const items = data.items.length ? data.items : [
      { description: "Prestations", quantity: 1, unitPrice: invoice.subtotal, total: invoice.subtotal },
    ];

    const tableHeaderHeight = 23;
    const rowInset = 13;
    const rowStep = 10.5;
    function tableHeader() {
      panel(margin, y, contentWidth, tableHeaderHeight, "dark");
      const options = { font: bold, color: white };
      draw(invoiceLabels.description.toUpperCase(), margin + 8, y - 14.5, 8, bold, white);
      aligned(invoiceLabels.quantity.toUpperCase(), quantityX, y - 14.5, 8, { ...options, center: showUnitPrice });
      if (showUnitPrice) {
        aligned(invoiceLabels.unitPrice.toUpperCase(), priceX, y - 14.5, 8, { ...options, center: true });
        aligned(invoiceLabels.lineTotal.toUpperCase(), totalX, y - 14.5, 8, options);
      }
      y -= tableHeaderHeight;
    }

    const firstItemLines = wrap(clean(items[0].description), regular, 9, descriptionWidth);
    ensureSpace(tableHeaderHeight + rowInset + Math.min(firstItemLines.length, 5) * rowStep);
    tableHeader();
    for (const [row, item] of items.entries()) {
      const description = row === 0 ? firstItemLines : wrap(clean(item.description), regular, 9, descriptionWidth);
      let offset = 0;
      while (offset < description.length) {
        const remaining = description.length - offset;
        const available = Math.floor((y - bottom - rowInset) / rowStep);
        if (available < 1 || (offset === 0 && available < remaining && remaining <= 5)) {
          nextPage();
          tableHeader();
        }
        const count = Math.min(remaining, Math.floor((y - bottom - rowInset) / rowStep));
        const height = rowInset + count * rowStep;
        if (row % 2 === 1) {
          page.drawRectangle({ x: margin, y: y - height, width: contentWidth, height, color: surface });
        }
        description.slice(offset, offset + count).forEach((part, index) => draw(part, margin + 8, y - 15 - index * rowStep));
        if (offset === 0) {
          aligned(String(item.quantity), quantityX, y - 15, 9, { center: showUnitPrice, width: 48 });
          if (showUnitPrice) {
            aligned(money(item.unitPrice), priceX, y - 15, 9, { center: true, width: 75 });
            aligned(money(item.total), totalX, y - 15, 9, { font: bold, width: 75 });
          }
        }
        y -= height;
        line(y);
        offset += count;
      }
    }

    y -= 14;
    ensureSpace(67);
    const totalsWidth = 220;
    const totalsX = right - totalsWidth;
    panel(totalsX, y, totalsWidth, 67);
    draw(invoiceLabels.subtotal, totalsX + 9, y - 18, 8.5, regular, text);
    aligned(money(invoice.subtotal), totalX, y - 18, 8.5, { font: bold, width: 99 });
    draw("TVA (" + invoice.taxRate + "%) :", totalsX + 9, y - 31, 8.5, regular, text);
    aligned(money(invoice.taxAmount), totalX, y - 31, 8.5, { font: bold, width: 99 });
    line(y - 40, totalsX + 9, totalX, divider, 0.85);
    draw(invoiceLabels.net, totalsX + 9, y - 56, 10, bold);
    aligned(money(invoice.total), totalX, y - 56, 11, { font: bold, color: accent, width: 99 });
    y -= 67;

    const notice = getInvoiceVatNotice(invoice.vatNotice);
    if (notice) {
      const noticeLines = wrap(clean("« " + notice + " »"), italic, 8, contentWidth - 20);
      const height = 11 + 11 * noticeLines.length;
      y -= 26;
      ensureSpace(height);
      panel(margin, y, contentWidth, height, "dashed");
      noticeLines.forEach((value, index) => aligned(value, margin + contentWidth / 2, y - 13.5 - index * 11, 8, {
        font: italic, color: muted, center: true,
      }));
      y -= height;
    }

    const bank = invoiceBankDetails(company);
    if (bank.length) {
      const detailWidth = contentWidth - 18;
      const rows: Array<Array<{ value: string; x: number }>> = [[]];
      let x = 0;
      for (const detail of bank) {
        for (const part of wrap(clean(detail), regular, 8.5, detailWidth)) {
          const width = regular.widthOfTextAtSize(part, 8.5);
          if (x + width > detailWidth) {
            rows.push([]);
            x = 0;
          }
          rows.at(-1)!.push({ value: part, x });
          x += width + 16;
        }
      }
      y -= 18;
      let offset = 0;
      while (offset < rows.length) {
        ensureSpace(42);
        const count = Math.min(rows.length - offset, Math.floor((y - bottom - 30) / 12));
        const height = 30 + count * 12;
        panel(margin, y, contentWidth, height);
        draw(invoiceLabels.bank.toUpperCase(), margin + 9, y - 16, 8, bold, accent);
        rows.slice(offset, offset + count).forEach((row, index) => {
          row.forEach(({ value, x }) => draw(value, margin + 9 + x, y - 29 - index * 12, 8.5, regular, text));
        });
        y -= height;
        offset += count;
      }
    }

    const notes = invoice.notes ?? company.invoiceNotes;
    if (notes?.trim()) {
      y -= 18;
      ensureSpace(27);
      line(y);
      draw(invoiceLabels.notes.toUpperCase(), margin, y - 13, 8, bold, muted);
      y -= 24;
      for (const part of wrap(clean(notes), regular, 8, contentWidth)) {
        ensureSpace(9);
        draw(part, margin, y, 8, regular, text);
        y -= 11;
      }
    }

    const footer = invoiceFooter(company);
    const pages = doc.getPages();
    for (const [index, currentPage] of pages.entries()) {
      page = currentPage;
      line(47);
      aligned(footer, margin + contentWidth / 2, 32, 7.5, { color: muted, center: true });
      if (pages.length > 1) {
        aligned("Page " + (index + 1) + " / " + pages.length, right, 19, 7.5, { color: muted });
      }
    }
    return doc.save();
  }

  static async generateAndSaveInvoicePdf(data: InvoicePdfData) {
    const pdfBytes = await this.generateInvoicePdf(data);
    // Use a safe filename even when the display number contains punctuation.
    const safeNumber = data.invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]+/g, "_");
    const name = safeNumber + ".pdf";
    const stored = await StorageService.uploadFile(pdfBytes, name, "application/pdf", "invoices/" + data.invoice.id + "/" + randomUUID());
    return { ...stored, name };
  }
}
