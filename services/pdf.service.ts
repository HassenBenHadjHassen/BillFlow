import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { randomUUID } from "node:crypto";
import { formatCurrency } from "@/lib/financial";
import { formatInvoiceDate, getInvoiceLogo, getInvoiceVatNotice, invoicePartyDetails, type InvoiceParty } from "@/lib/invoice";
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
  company: InvoiceParty & {
    logo?: string | null;
    iban?: string | null;
    bic?: string | null;
    invoiceNotes?: string | null;
  };
}

const ink = rgb(0.11, 0.15, 0.22);
const muted = rgb(0.32, 0.38, 0.46);
const rule = rgb(0.88, 0.9, 0.93);
const surface = rgb(0.96, 0.97, 0.98);
const pageSize: [number, number] = [595.28, 841.89];
const margin = 42;
const right = pageSize[0] - margin;
const contentWidth = right - margin;
const bottom = 58;

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
        if (font.widthOfTextAtSize(line + char, size) > width) {
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
    const supported = new Set(regular.getCharacterSet());
    const clean = (value: string) => printable(value, supported);
    const money = (amount: number) => formatCurrency(amount, invoice.currency);

    let page: PDFPage = doc.addPage(pageSize);
    let y = pageSize[1] - margin;
    function draw(value: string, x: number, baseline: number, size = 10, font = regular, color = ink) {
      page.drawText(clean(value), { x, y: baseline, size, font, color });
    }
    function drawRight(value: string, x: number, baseline: number, size = 10, font = regular, maxWidth = contentWidth) {
      const textWidth = font.widthOfTextAtSize(clean(value), size);
      const scale = textWidth > maxWidth ? maxWidth / textWidth : 1;
      draw(value, x - textWidth * scale, baseline, size * scale, font);
    }
    function line(baseline: number) {
      page.drawLine({ start: { x: margin, y: baseline }, end: { x: right, y: baseline }, thickness: 0.75, color: rule });
    }
    function nextPage() {
      page = doc.addPage(pageSize);
      y = pageSize[1] - margin;
      drawRight("Facture " + invoice.invoiceNumber, right, y, 10, bold);
      y -= 22;
    }
    function ensureSpace(height: number) {
      if (y - height < bottom) nextPage();
    }
    function paragraph(text: string, size = 10, font = regular, color = muted) {
      for (const part of wrap(clean(text), font, size, contentWidth)) {
        ensureSpace(14);
        draw(part, margin, y, size, font, color);
        y -= 14;
      }
    }

    draw("FACTURE", margin, y - 13, 26, bold);
    const logo = getInvoiceLogo(company.logo);
    if (logo) {
      try {
        const image = logo.startsWith("data:image/png") ? await doc.embedPng(logo) : await doc.embedJpg(logo);
        const dimensions = image.scaleToFit(115, 44);
        page.drawImage(image, { ...dimensions, x: right - dimensions.width, y: y - dimensions.height });
      } catch {
        // A previously saved invalid logo should not prevent invoice generation.
      }
    }
    draw("N° " + invoice.invoiceNumber, margin, y - 33, 10, regular, muted);
    y -= 55;
    line(y);
    y -= 23;

    const colWidth = (contentWidth - 26) / 2;
    const parties = [company, client].map((party, index) => ({
      heading: index === 0 ? "ÉMETTEUR" : "CLIENT",
      name: wrap(clean(party.companyName), bold, 12, colWidth),
      details: invoicePartyDetails(party).flatMap((part) => wrap(clean(part), regular, 9, colWidth)),
    }));
    for (const [index, party] of parties.entries()) {
      const x = margin + index * (colWidth + 26);
      draw(party.heading, x, y, 8, bold, muted);
      party.name.forEach((part, row) => draw(part, x, y - 19 - 15 * row, 12, bold));
    }
    y -= 19 + 15 * Math.max(...parties.map((party) => party.name.length));
    const detailsHeight = Math.max(...parties.map((party) => party.details.length));
    for (let row = 0; row < detailsHeight; row++) {
      ensureSpace(13);
      for (const [index, party] of parties.entries()) {
        if (party.details[row]) draw(party.details[row], margin + index * (colWidth + 26), y, 9, regular, muted);
      }
      y -= 13;
    }

    y -= 14;
    ensureSpace(32);
    draw("Émission · " + formatInvoiceDate(invoice.issueDate), margin, y, 10, bold);
    draw("Échéance · " + formatInvoiceDate(invoice.dueDate), margin + colWidth + 26, y, 10, bold);
    y -= 20;
    if (contract) paragraph("Contrat · " + contract.contractNumber + " · " + contract.title, 9);
    if (invoice.billingPeriodStart || invoice.billingPeriodEnd) {
      const start = invoice.billingPeriodStart ? formatInvoiceDate(invoice.billingPeriodStart) : "—";
      const end = invoice.billingPeriodEnd ? formatInvoiceDate(invoice.billingPeriodEnd) : "—";
      paragraph("Période · " + start + " – " + end, 9);
    }

    const showUnitPrice = invoice.showUnitPrice !== false;
    const quantityX = showUnitPrice ? margin + 315 : right - 12;
    const priceX = right - 108;
    const totalX = right - 12;
    const descriptionWidth = quantityX - margin - 64;
    const items = data.items.length ? data.items : [
      { description: "Prestations", quantity: 1, unitPrice: invoice.subtotal, total: invoice.subtotal },
    ];

    function tableHeader() {
      page.drawRectangle({ x: margin, y: y - 25, width: contentWidth, height: 25, color: surface });
      draw("DESCRIPTION", margin + 10, y - 16, 8, bold, muted);
      drawRight("QTÉ", quantityX, y - 16, 8, bold);
      if (showUnitPrice) {
        drawRight("PRIX UNIT. HT", priceX, y - 16, 8, bold);
        drawRight("TOTAL HT", totalX, y - 16, 8, bold);
      }
      y -= 37;
    }
    y -= 6;
    ensureSpace(62);
    tableHeader();
    for (const item of items) {
      const description = wrap(clean(item.description), regular, 10, descriptionWidth);
      for (const [index, part] of description.entries()) {
        if (y - 16 < bottom) {
          nextPage();
          tableHeader();
        }
        draw(part, margin + 10, y);
        if (index === 0) {
          drawRight(String(item.quantity), quantityX, y, 10, regular, 55);
          if (showUnitPrice) {
            drawRight(money(item.unitPrice), priceX, y, 10, regular, 78);
            drawRight(money(item.total), totalX, y, 10, bold, 90);
          }
        }
        y -= 14;
      }
      line(y + 5);
      y -= 10;
    }

    ensureSpace(92);
    y -= 10;
    const totalLabelX = right - 225;
    draw("Total HT", totalLabelX, y, 10, regular, muted);
    drawRight(money(invoice.subtotal), totalX, y, 10, regular, 100);
    y -= 18;
    draw("TVA (" + invoice.taxRate + " %)", totalLabelX, y, 10, regular, muted);
    drawRight(money(invoice.taxAmount), totalX, y, 10, regular, 100);
    y -= 26;
    page.drawRectangle({ x: totalLabelX - 10, y: y - 9, width: right - totalLabelX + 10, height: 29, color: surface });
    draw("NET À PAYER", totalLabelX, y, 10, bold);
    drawRight(money(invoice.total), totalX, y, 13, bold, 110);
    y -= 30;

    const notice = getInvoiceVatNotice(invoice.vatNotice);
    if (notice) paragraph(notice);
    if (company.iban || company.bic) {
      ensureSpace(34);
      y -= 6;
      paragraph("RÈGLEMENT PAR VIREMENT", 8, bold, ink);
      if (company.iban) paragraph("IBAN · " + company.iban, 9);
      if (company.bic) paragraph("BIC / SWIFT · " + company.bic, 9);
    }
    const notes = invoice.notes ?? company.invoiceNotes;
    if (notes) {
      ensureSpace(34);
      y -= 6;
      paragraph("CONDITIONS ET NOTES", 8, bold, ink);
      paragraph(notes, 9);
    }

    const pages = doc.getPages();
    for (const [index, currentPage] of pages.entries()) {
      page = currentPage;
      line(42);
      drawRight("Page " + (index + 1) + " / " + pages.length, right, 28, 8);
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
