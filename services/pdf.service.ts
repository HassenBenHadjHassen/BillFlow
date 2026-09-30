import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { format } from "date-fns";
import { formatPdfCurrency } from "@/lib/financial";
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
  };
  client: {
    companyName: string;
    contactName?: string | null;
    email: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    vatNumber?: string | null;
    siret?: string | null;
  };
  contract?: {
    title: string;
    contractNumber: string;
  } | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    total: number;
  }>;
  company: {
    companyName: string;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    email?: string | null;
    phone?: string | null;
    siret?: string | null;
    vatNumber?: string | null;
    iban?: string | null;
    bic?: string | null;
    invoiceNotes?: string | null;
  };
}

function cleanPdfText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u202F\u00A0]/g, " ")
    .replace(/[^\x00-\xFF]/g, " ")
    .trim();
}

export class PdfService {
  /**
   * Generates a professional PDF invoice using vector graphics and typography
   */
  static async generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]); // A4 in points
    const { width, height } = page.getSize();

    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    // Color palette
    const primaryColor = rgb(0.12, 0.23, 0.44); // Deep Navy #1e3a8a
    const secondaryColor = rgb(0.4, 0.45, 0.55); // Slate
    const darkColor = rgb(0.09, 0.11, 0.15); // Almost black
    const lightBg = rgb(0.96, 0.97, 0.99); // Off-white table header
    const borderColor = rgb(0.88, 0.9, 0.94);

    let y = height - 50;

    // Header: Company Name & Invoice Title
    page.drawText(cleanPdfText(data.company.companyName.toUpperCase()), {
      x: 50,
      y,
      size: 20,
      font: fontBold,
      color: primaryColor,
    });

    const invoiceTitle = "INVOICE";
    const titleWidth = fontBold.widthOfTextAtSize(invoiceTitle, 22);
    page.drawText(invoiceTitle, {
      x: width - 50 - titleWidth,
      y,
      size: 22,
      font: fontBold,
      color: primaryColor,
    });

    y -= 14;
    const invNumberText = cleanPdfText(`# ${data.invoice.invoiceNumber}`);
    const invNumberWidth = fontBold.widthOfTextAtSize(invNumberText, 12);
    page.drawText(invNumberText, {
      x: width - 50 - invNumberWidth,
      y,
      size: 12,
      font: fontBold,
      color: secondaryColor,
    });

    // Top decorative bar
    y -= 18;
    page.drawLine({
      start: { x: 50, y },
      end: { x: width - 50, y },
      thickness: 1.5,
      color: borderColor,
    });

    // Info Blocks: Seller (Company) on Left, Buyer (Client) on Right
    y -= 25;
    const col1X = 50;
    const col2X = 320;
    let sellerY = y;
    let buyerY = y;

    // Seller Info
    page.drawText("ISSUED BY", {
      x: col1X,
      y: sellerY,
      size: 8,
      font: fontBold,
      color: secondaryColor,
    });
    sellerY -= 14;

    page.drawText(cleanPdfText(data.company.companyName), {
      x: col1X,
      y: sellerY,
      size: 10,
      font: fontBold,
      color: darkColor,
    });
    sellerY -= 13;

    if (data.company.address) {
      page.drawText(cleanPdfText(data.company.address), { x: col1X, y: sellerY, size: 9, font: fontRegular, color: secondaryColor });
      sellerY -= 12;
    }
    const cityZip = [data.company.postalCode, data.company.city, data.company.country].filter(Boolean).join(" ");
    if (cityZip) {
      page.drawText(cleanPdfText(cityZip), { x: col1X, y: sellerY, size: 9, font: fontRegular, color: secondaryColor });
      sellerY -= 12;
    }
    if (data.company.email) {
      page.drawText(cleanPdfText(`Email: ${data.company.email}`), { x: col1X, y: sellerY, size: 9, font: fontRegular, color: secondaryColor });
      sellerY -= 12;
    }
    if (data.company.phone) {
      page.drawText(cleanPdfText(`Phone: ${data.company.phone}`), { x: col1X, y: sellerY, size: 9, font: fontRegular, color: secondaryColor });
      sellerY -= 12;
    }
    if (data.company.siret) {
      page.drawText(cleanPdfText(`SIRET: ${data.company.siret}`), { x: col1X, y: sellerY, size: 8, font: fontRegular, color: secondaryColor });
      sellerY -= 11;
    }
    if (data.company.vatNumber) {
      page.drawText(cleanPdfText(`VAT: ${data.company.vatNumber}`), { x: col1X, y: sellerY, size: 8, font: fontRegular, color: secondaryColor });
      sellerY -= 11;
    }

    // Buyer Info
    page.drawText("BILLED TO", {
      x: col2X,
      y: buyerY,
      size: 8,
      font: fontBold,
      color: secondaryColor,
    });
    buyerY -= 14;

    page.drawText(cleanPdfText(data.client.companyName), {
      x: col2X,
      y: buyerY,
      size: 10,
      font: fontBold,
      color: darkColor,
    });
    buyerY -= 13;

    if (data.client.contactName) {
      page.drawText(cleanPdfText(`Attn: ${data.client.contactName}`), { x: col2X, y: buyerY, size: 9, font: fontRegular, color: secondaryColor });
      buyerY -= 12;
    }
    if (data.client.address) {
      page.drawText(cleanPdfText(data.client.address), { x: col2X, y: buyerY, size: 9, font: fontRegular, color: secondaryColor });
      buyerY -= 12;
    }
    const clientCityZip = [data.client.postalCode, data.client.city, data.client.country].filter(Boolean).join(" ");
    if (clientCityZip) {
      page.drawText(cleanPdfText(clientCityZip), { x: col2X, y: buyerY, size: 9, font: fontRegular, color: secondaryColor });
      buyerY -= 12;
    }
    if (data.client.email) {
      page.drawText(cleanPdfText(`Email: ${data.client.email}`), { x: col2X, y: buyerY, size: 9, font: fontRegular, color: secondaryColor });
      buyerY -= 12;
    }
    if (data.client.vatNumber) {
      page.drawText(cleanPdfText(`VAT: ${data.client.vatNumber}`), { x: col2X, y: buyerY, size: 8, font: fontRegular, color: secondaryColor });
      buyerY -= 11;
    }

    // Invoice Meta (Dates & Contract)
    y = Math.min(sellerY, buyerY) - 15;

    // Meta box
    page.drawRectangle({
      x: 50,
      y: y - 26,
      width: width - 100,
      height: 36,
      color: lightBg,
      borderColor,
      borderWidth: 1,
    });

    const metaY = y - 10;
    page.drawText("ISSUE DATE", { x: 65, y: metaY + 6, size: 7, font: fontBold, color: secondaryColor });
    page.drawText(format(new Date(data.invoice.issueDate), "dd/MM/yyyy"), { x: 65, y: metaY - 6, size: 9, font: fontBold, color: darkColor });

    page.drawText("DUE DATE", { x: 180, y: metaY + 6, size: 7, font: fontBold, color: secondaryColor });
    page.drawText(format(new Date(data.invoice.dueDate), "dd/MM/yyyy"), { x: 180, y: metaY - 6, size: 9, font: fontBold, color: darkColor });

    page.drawText("STATUS", { x: 300, y: metaY + 6, size: 7, font: fontBold, color: secondaryColor });
    page.drawText(cleanPdfText(data.invoice.status.toUpperCase()), { x: 300, y: metaY - 6, size: 9, font: fontBold, color: primaryColor });

    if (data.contract) {
      page.drawText("CONTRACT REF", { x: 420, y: metaY + 6, size: 7, font: fontBold, color: secondaryColor });
      page.drawText(cleanPdfText(data.contract.contractNumber), { x: 420, y: metaY - 6, size: 9, font: fontBold, color: darkColor });
    }

    y -= 50;

    // Items Table Header
    page.drawRectangle({
      x: 50,
      y: y - 18,
      width: width - 100,
      height: 22,
      color: primaryColor,
    });

    page.drawText("DESCRIPTION", { x: 60, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("QTY", { x: 320, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("UNIT PRICE", { x: 380, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("TAX", { x: 450, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("TOTAL", { x: 495, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });

    y -= 26;

    // Items Rows
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const isEven = i % 2 === 0;

      if (isEven) {
        page.drawRectangle({
          x: 50,
          y: y - 14,
          width: width - 100,
          height: 20,
          color: lightBg,
        });
      }

      // Truncate description if too long
      const cleanedDesc = cleanPdfText(item.description);
      const desc = cleanedDesc.length > 45 ? `${cleanedDesc.substring(0, 42)}...` : cleanedDesc;

      page.drawText(desc, { x: 60, y: y - 8, size: 8.5, font: fontRegular, color: darkColor });
      page.drawText(String(item.quantity), { x: 325, y: y - 8, size: 8.5, font: fontRegular, color: darkColor });
      page.drawText(formatPdfCurrency(item.unitPrice, data.invoice.currency), { x: 380, y: y - 8, size: 8.5, font: fontRegular, color: darkColor });
      page.drawText(`${item.taxRate}%`, { x: 452, y: y - 8, size: 8.5, font: fontRegular, color: darkColor });
      page.drawText(formatPdfCurrency(item.total, data.invoice.currency), { x: 495, y: y - 8, size: 8.5, font: fontBold, color: darkColor });

      y -= 20;
    }

    // Totals Section
    y -= 15;
    const totalsX = 350;
    const totalsValX = 480;

    page.drawText("Subtotal HT:", { x: totalsX, y, size: 9, font: fontRegular, color: secondaryColor });
    const subtotalStr = formatPdfCurrency(data.invoice.subtotal, data.invoice.currency);
    page.drawText(subtotalStr, { x: totalsValX, y, size: 9, font: fontRegular, color: darkColor });

    y -= 16;
    page.drawText(`Tax (${data.invoice.taxRate}%):`, { x: totalsX, y, size: 9, font: fontRegular, color: secondaryColor });
    const taxStr = formatPdfCurrency(data.invoice.taxAmount, data.invoice.currency);
    page.drawText(taxStr, { x: totalsValX, y, size: 9, font: fontRegular, color: darkColor });

    y -= 22;
    page.drawRectangle({
      x: totalsX - 10,
      y: y - 8,
      width: width - totalsX - 40,
      height: 26,
      color: lightBg,
      borderColor: primaryColor,
      borderWidth: 1,
    });

    page.drawText("TOTAL TTC:", { x: totalsX, y: y - 2, size: 10, font: fontBold, color: primaryColor });
    const totalStr = formatPdfCurrency(data.invoice.total, data.invoice.currency);
    page.drawText(totalStr, { x: totalsValX - 5, y: y - 2, size: 11, font: fontBold, color: primaryColor });

    // Payment & Banking Instructions
    y -= 45;
    page.drawText("PAYMENT DETAILS", { x: 50, y, size: 8, font: fontBold, color: secondaryColor });
    y -= 13;

    if (data.company.iban) {
      page.drawText(cleanPdfText(`IBAN: ${data.company.iban}`), { x: 50, y, size: 8.5, font: fontRegular, color: darkColor });
      y -= 12;
    }
    if (data.company.bic) {
      page.drawText(cleanPdfText(`BIC / SWIFT: ${data.company.bic}`), { x: 50, y, size: 8.5, font: fontRegular, color: darkColor });
      y -= 12;
    }

    // Notes
    const notes = data.invoice.notes || data.company.invoiceNotes;
    if (notes) {
      y -= 6;
      page.drawText("NOTES / TERMS", { x: 50, y, size: 8, font: fontBold, color: secondaryColor });
      y -= 12;
      const notesClean = cleanPdfText(notes.replace(/\r?\n/g, " "));
      const displayNotes = notesClean.length > 100 ? `${notesClean.substring(0, 97)}...` : notesClean;
      page.drawText(displayNotes, { x: 50, y, size: 8, font: fontRegular, color: secondaryColor });
    }

    // Footer
    page.drawLine({
      start: { x: 50, y: 40 },
      end: { x: width - 50, y: 40 },
      thickness: 0.5,
      color: borderColor,
    });

    const footerText = cleanPdfText(`${data.company.companyName} - Invoice ${data.invoice.invoiceNumber} - Page 1 of 1`);
    const footerWidth = fontRegular.widthOfTextAtSize(footerText, 7.5);
    page.drawText(footerText, {
      x: (width - footerWidth) / 2,
      y: 28,
      size: 7.5,
      font: fontRegular,
      color: secondaryColor,
    });

    return doc.save();
  }

  /**
   * Generates invoice PDF and saves it to file storage
   */
  static async generateAndSaveInvoicePdf(data: InvoicePdfData): Promise<{
    storagePath: string;
    fileUrl: string;
  }> {
    const pdfBytes = await this.generateInvoicePdf(data);
    const fileName = `Invoice_${data.invoice.invoiceNumber}.pdf`;
    const folder = `invoices/${data.invoice.id}`;

    const storedFile = await StorageService.uploadFile(
      pdfBytes,
      fileName,
      "application/pdf",
      folder
    );

    return {
      storagePath: storedFile.storagePath,
      fileUrl: storedFile.fileUrl,
    };
  }
}
