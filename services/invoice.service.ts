import db from "@/lib/db";
import { InvoiceInput, SaveInvoiceInput } from "@/schemas";
import { calculateInvoiceTotals, calculateInvoicePaymentStatus, roundMoney } from "@/lib/financial";
import { PdfService } from "./pdf.service";
import { StorageService } from "./storage.service";

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

  /**
   * Saves an existing/ready invoice and optionally uploads its PDF document.
   */
  static async saveInvoiceWithFile(
    data: SaveInvoiceInput,
    file?: { buffer: Buffer; fileName: string; mimeType: string } | null,
    options?: { markAsPaid?: boolean; paymentDate?: string; paymentMethod?: string }
  ) {
    const issueDate = new Date(data.issueDate);
    const dueDate = new Date(data.dueDate);
    const subtotal = roundMoney(data.subtotal);
    const taxRate = Number(data.taxRate ?? 20);
    const taxAmount = roundMoney(data.taxAmount ?? (subtotal * (taxRate / 100)));
    const total = roundMoney(data.total ?? (subtotal + taxAmount));

    return db.$transaction(async (tx) => {
      // 1. Check if invoice number is unique
      const existing = await tx.invoice.findUnique({
        where: { invoiceNumber: data.invoiceNumber },
      });
      if (existing) {
        throw new Error(`An invoice with number '${data.invoiceNumber}' already exists.`);
      }

      // 2. Upload file to local storage if provided
      let pdfUrl: string | null = null;
      let storagePath: string | null = null;
      let fileSize = 0;
      let fileName = "";

      if (file && file.buffer && file.buffer.length > 0) {
        fileName = file.fileName || `Invoice_${data.invoiceNumber}.pdf`;
        const uploaded = await StorageService.uploadFile(
          file.buffer,
          fileName,
          file.mimeType || "application/pdf",
          "invoices"
        );
        pdfUrl = uploaded.fileUrl;
        storagePath = uploaded.storagePath;
        fileSize = uploaded.fileSize;
      }

      // 3. Determine initial status
      let initialStatus = data.status || "Sent";
      if (options?.markAsPaid || data.status === "Paid") {
        initialStatus = "Paid";
      }

      // 4. Create the invoice record
      const invoice = await tx.invoice.create({
        data: {
          clientId: data.clientId,
          contractId: data.contractId || null,
          invoiceNumber: data.invoiceNumber,
          issueDate,
          dueDate,
          currency: data.currency || "EUR",
          subtotal,
          taxRate,
          taxAmount,
          total,
          status: initialStatus,
          paymentDate: initialStatus === "Paid" ? new Date(options?.paymentDate || data.issueDate) : null,
          notes: data.notes || null,
          pdfUrl,
          billingPeriodStart: data.billingPeriodStart ? new Date(data.billingPeriodStart) : null,
          billingPeriodEnd: data.billingPeriodEnd ? new Date(data.billingPeriodEnd) : null,
        },
        include: {
          client: true,
          contract: true,
        },
      });

      // 5. If file was uploaded, create a Document record
      if (pdfUrl && storagePath) {
        await tx.document.create({
          data: {
            name: fileName,
            type: "Invoice",
            fileUrl: pdfUrl,
            storagePath,
            fileSize,
            mimeType: file?.mimeType || "application/pdf",
            clientId: invoice.clientId,
            contractId: invoice.contractId,
            invoiceId: invoice.id,
          },
        });
      }

      // 6. If marked as paid, create a payment record
      if (initialStatus === "Paid") {
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: total,
            paymentDate: new Date(options?.paymentDate || data.issueDate),
            paymentMethod: options?.paymentMethod || "BankTransfer",
            notes: "Recorded on invoice upload",
          },
        });
      }

      // 7. If linked to a contract with recurring billing, advance the next invoice date
      if (invoice.contractId) {
        const recurring = await tx.recurringBilling.findUnique({
          where: { contractId: invoice.contractId },
        });
        if (recurring && recurring.active) {
          const nextDate = new Date(recurring.nextInvoiceDate);
          if (recurring.frequency === "Monthly") {
            nextDate.setMonth(nextDate.getMonth() + 1);
          } else if (recurring.frequency === "Quarterly") {
            nextDate.setMonth(nextDate.getMonth() + 3);
          } else if (recurring.frequency === "Yearly") {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
          }
          await tx.recurringBilling.update({
            where: { id: recurring.id },
            data: {
              lastInvoiceDate: issueDate,
              nextInvoiceDate: nextDate,
            },
          });
        }
      }

      return invoice;
    });
  }

  /**
   * Attaches or replaces a PDF document for an existing invoice
   */
  static async attachInvoicePdf(
    invoiceId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string }
  ) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw new Error("Invoice not found");

    const fileName = file.fileName || `Invoice_${invoice.invoiceNumber}.pdf`;
    const uploaded = await StorageService.uploadFile(
      file.buffer,
      fileName,
      file.mimeType || "application/pdf",
      "invoices"
    );

    await db.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { pdfUrl: uploaded.fileUrl },
      });

      await tx.document.create({
        data: {
          name: fileName,
          type: "Invoice",
          fileUrl: uploaded.fileUrl,
          storagePath: uploaded.storagePath,
          fileSize: uploaded.fileSize,
          mimeType: uploaded.mimeType,
          clientId: invoice.clientId,
          contractId: invoice.contractId,
          invoiceId: invoice.id,
        },
      });
    });

    return uploaded.fileUrl;
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
