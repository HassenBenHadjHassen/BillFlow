import db from "@/lib/db";
import { InvoiceInput } from "@/schemas";
import { calculateInvoiceTotals, calculateInvoicePaymentStatus, roundMoney } from "@/lib/financial";
import { PdfService } from "./pdf.service";

export class InvoiceService {
  /**
   * Generates a sequential invoice number: e.g. INV-2026-001
   * Runs server-side and transactionally
   */
  static async generateInvoiceNumber(prefix: string = "INV"): Promise<string> {
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-`;

    const latest = await db.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: pattern,
        },
      },
      orderBy: {
        invoiceNumber: "desc",
      },
      select: {
        invoiceNumber: true,
      },
    });

    let nextSeq = 1;
    if (latest?.invoiceNumber) {
      const parts = latest.invoiceNumber.split("-");
      const lastSeqStr = parts[parts.length - 1];
      const parsed = parseInt(lastSeqStr, 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }

    const seqFormatted = String(nextSeq).padStart(3, "0");
    return `${pattern}${seqFormatted}`;
  }

  static async getInvoices(filters?: {
    clientId?: string;
    contractId?: string;
    status?: string;
    showArchived?: boolean;
  }) {
    const where: {
      isArchived?: boolean;
      clientId?: string;
      contractId?: string;
      status?: string;
    } = {
      isArchived: filters?.showArchived ? undefined : false,
    };

    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.contractId) where.contractId = filters.contractId;
    if (filters?.status && filters.status !== "ALL") where.status = filters.status;

    const invoices = await db.invoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
      include: {
        client: true,
        contract: true,
        items: true,
        payments: true,
      },
    });

    return invoices.map((inv) => {
      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const paymentCalc = calculateInvoicePaymentStatus(
        inv.total,
        paid,
        inv.dueDate,
        inv.status
      );

      return {
        ...inv,
        amountPaid: paymentCalc.amountPaid,
        remainingBalance: paymentCalc.remainingBalance,
        computedStatus: paymentCalc.status,
      };
    });
  }

  static async getInvoiceById(id: string) {
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        contract: true,
        items: true,
        payments: {
          orderBy: { paymentDate: "desc" },
        },
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!invoice) return null;

    const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const paymentCalc = calculateInvoicePaymentStatus(
      invoice.total,
      paid,
      invoice.dueDate,
      invoice.status
    );

    return {
      ...invoice,
      amountPaid: paymentCalc.amountPaid,
      remainingBalance: paymentCalc.remainingBalance,
      computedStatus: paymentCalc.status,
    };
  }

  static async createInvoice(data: InvoiceInput, options?: { autoSend?: boolean }) {
    // 1. Authoritative server-side calculation
    const totals = calculateInvoiceTotals(data.items);
    const issueDate = new Date(data.issueDate);
    const dueDate = new Date(data.dueDate);

    // 2. Fetch company settings for prefix and invoice details
    const settings = await db.companySettings.findFirst() || {
      companyName: "My Business",
      invoicePrefix: "INV",
      defaultTaxRate: 20,
      invoiceNotes: null,
      address: null,
      city: null,
      postalCode: null,
      country: "France",
      email: null,
      phone: null,
      siret: null,
      vatNumber: null,
      iban: null,
      bic: null,
    };

    return db.$transaction(async (tx) => {
      // 3. Sequential numbering
      const invoiceNumber = await this.generateInvoiceNumber(settings.invoicePrefix);

      // 4. Create invoice record
      const invoice = await tx.invoice.create({
        data: {
          clientId: data.clientId,
          contractId: data.contractId || null,
          invoiceNumber,
          issueDate,
          dueDate,
          currency: data.currency || "EUR",
          subtotal: totals.subtotal,
          taxRate: data.items[0]?.taxRate || settings.defaultTaxRate,
          taxAmount: totals.taxAmount,
          total: totals.total,
          status: options?.autoSend ? "Sent" : "Draft",
          notes: data.notes || settings.invoiceNotes || null,
          billingPeriodStart: data.billingPeriodStart ? new Date(data.billingPeriodStart) : null,
          billingPeriodEnd: data.billingPeriodEnd ? new Date(data.billingPeriodEnd) : null,
          items: {
            create: data.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              total: roundMoney(item.quantity * item.unitPrice),
            })),
          },
        },
        include: {
          client: true,
          contract: true,
          items: true,
        },
      });

      // 5. Generate PDF and link to invoice & documents
      try {
        const pdfResult = await PdfService.generateAndSaveInvoicePdf({
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            currency: invoice.currency,
            subtotal: invoice.subtotal,
            taxRate: invoice.taxRate,
            taxAmount: invoice.taxAmount,
            total: invoice.total,
            status: invoice.status,
            notes: invoice.notes,
          },
          client: invoice.client,
          contract: invoice.contract ? {
            title: invoice.contract.title,
            contractNumber: invoice.contract.contractNumber,
          } : null,
          items: invoice.items,
          company: settings,
        });

        // Update invoice with pdfUrl
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl: pdfResult.fileUrl },
        });

        // Create document record
        await tx.document.create({
          data: {
            name: `Invoice_${invoice.invoiceNumber}.pdf`,
            type: "Invoice",
            fileUrl: pdfResult.fileUrl,
            storagePath: pdfResult.storagePath,
            fileSize: 0,
            mimeType: "application/pdf",
            clientId: invoice.clientId,
            contractId: invoice.contractId,
            invoiceId: invoice.id,
          },
        });

        return { ...invoice, pdfUrl: pdfResult.fileUrl };
      } catch (err) {
        console.error("PDF generation during invoice creation failed:", err);
        return invoice;
      }
    });
  }

  static async updateInvoiceStatus(id: string, newStatus: string) {
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!invoice) throw new Error("Invoice not found");

    // Immutability checks: Do not arbitrarily change status of fully paid invoices without proper audit
    if (invoice.status === "Paid" && newStatus === "Draft") {
      throw new Error("Cannot set a paid invoice back to Draft. Delete payments or issue a credit note instead.");
    }

    return db.invoice.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  static async regeneratePdf(invoiceId: string) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true, contract: true, items: true },
    });

    if (!invoice) throw new Error("Invoice not found");

    const settings = await db.companySettings.findFirst() || {
      companyName: "My Business",
      defaultTaxRate: 20,
      invoiceNotes: null,
      address: null,
      city: null,
      postalCode: null,
      country: "France",
      email: null,
      phone: null,
      siret: null,
      vatNumber: null,
      iban: null,
      bic: null,
    };

    const pdfResult = await PdfService.generateAndSaveInvoicePdf({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        currency: invoice.currency,
        subtotal: invoice.subtotal,
        taxRate: invoice.taxRate,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        status: invoice.status,
        notes: invoice.notes,
      },
      client: invoice.client,
      contract: invoice.contract ? {
        title: invoice.contract.title,
        contractNumber: invoice.contract.contractNumber,
      } : null,
      items: invoice.items,
      company: settings,
    });

    await db.invoice.update({
      where: { id: invoice.id },
      data: { pdfUrl: pdfResult.fileUrl },
    });

    return pdfResult.fileUrl;
  }

  static async archiveInvoice(id: string) {
    return db.invoice.update({
      where: { id },
      data: { isArchived: true },
    });
  }
}
