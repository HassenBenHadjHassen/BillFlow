import db from "@/lib/db";
import { InvoiceInput, SaveInvoiceInput } from "@/schemas";
import { calculateInvoiceTotals, calculateInvoicePaymentStatus, roundMoney } from "@/lib/financial";
import { formatInvoiceNumber, INVOICE_TAX_RATE } from "@/lib/invoice";
import { PdfService } from "./pdf.service";
import { StorageService } from "./storage.service";
import type { Prisma } from "@prisma/client";

const itemOrder = [{ position: "asc" }, { createdAt: "asc" }] satisfies Prisma.InvoiceItemOrderByWithRelationInput[];
const defaultCompany = { companyName: "My Business", country: "France", invoiceNotes: null };

export class InvoiceService {
  /** Generates an invoice name from today's date and the client's company. */
  static async generateInvoiceNumber(clientId: string): Promise<string> {
    const client = await db.client.findUnique({ where: { id: clientId }, select: { companyName: true } });
    if (!client) throw new Error("Client not found");
    return formatInvoiceNumber(client.companyName);
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
        items: { orderBy: itemOrder },
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
        items: { orderBy: itemOrder },
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
    const taxRate = INVOICE_TAX_RATE;
    const taxAmount = 0;
    const total = subtotal;

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
        fileName = file.fileName || `${data.invoiceNumber}.pdf`;
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

      const chosenPaymentDate = options?.paymentDate
        ? new Date(options.paymentDate)
        : (data.paymentDate ? new Date(data.paymentDate) : issueDate);

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
          paymentDate: initialStatus === "Paid" ? chosenPaymentDate : null,
          notes: data.notes || null,
          pdfUrl,
          billingPeriodStart: data.billingPeriodStart ? new Date(data.billingPeriodStart) : null,
          billingPeriodEnd: data.billingPeriodEnd ? new Date(data.billingPeriodEnd) : null,
        },
        include: {
          client: true,
          contract: true,
          payments: true,
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
            paymentDate: chosenPaymentDate,
            paymentMethod: options?.paymentMethod || data.paymentMethod || "BankTransfer",
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

      const paid = initialStatus === "Paid" ? total : 0;
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

    const fileName = file.fileName || `${invoice.invoiceNumber}.pdf`;
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

  /**
   * Attaches or links an existing invoice to a contract
   */
  static async attachToContract(invoiceId: string, contractId: string | null) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw new Error("Invoice not found");

    if (contractId) {
      const contract = await db.contract.findUnique({
        where: { id: contractId },
      });
      if (!contract) throw new Error("Contract not found");
    }

    const updated = await db.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id: invoiceId },
        data: { contractId: contractId || null },
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

      // Also update any attached Document records for this invoice to point to the contract
      if (contractId) {
        await tx.document.updateMany({
          where: { invoiceId: invoiceId },
          data: { contractId: contractId },
        });
      }

      return inv;
    });

    const paid = updated.payments.reduce((sum, p) => sum + p.amount, 0);
    const paymentCalc = calculateInvoicePaymentStatus(
      updated.total,
      paid,
      updated.dueDate,
      updated.status
    );

    return {
      ...updated,
      amountPaid: paymentCalc.amountPaid,
      remainingBalance: paymentCalc.remainingBalance,
      computedStatus: paymentCalc.status,
    };
  }

  /**
   * Updates or sets the payment date ("got paid at") for an existing invoice.
   * Also synchronizes the invoice's payments ledger so reports and dashboard reflect the correct cash flow date.
   */
  static async updatePaymentDate(invoiceId: string, paymentDateInput: string | Date) {
    const paymentDate = new Date(paymentDateInput);
    if (isNaN(paymentDate.getTime())) {
      throw new Error("Invalid payment date");
    }

    return db.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: { orderBy: { paymentDate: "desc" } } },
      });

      if (!invoice) throw new Error("Invoice not found");

      // 1. If invoice has payments, update the latest payment's date
      if (invoice.payments.length > 0) {
        await tx.payment.update({
          where: { id: invoice.payments[0].id },
          data: { paymentDate },
        });
      } else {
        // If invoice was marked Paid but has no payment record, create one
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: invoice.total,
            paymentDate,
            paymentMethod: "BankTransfer",
            notes: "Payment recorded",
          },
        });
      }

      // 2. Update invoice's paymentDate and ensure status is Paid
      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paymentDate,
          status: "Paid",
        },
        include: {
          client: true,
          contract: true,
          payments: { orderBy: { paymentDate: "desc" } },
          items: true,
        },
      });

      const paid = updated.payments.reduce((sum, p) => sum + p.amount, 0);
      const paymentCalc = calculateInvoicePaymentStatus(
        updated.total,
        paid,
        updated.dueDate,
        updated.status
      );

      return {
        ...updated,
        amountPaid: paymentCalc.amountPaid,
        remainingBalance: paymentCalc.remainingBalance,
        computedStatus: paymentCalc.status,
      };
    });
  }

  static async createInvoice(data: InvoiceInput, options?: { autoSend?: boolean }) {
    const items = data.items.map((item, position) => ({
      ...item,
      position,
      taxRate: INVOICE_TAX_RATE,
      total: roundMoney(item.quantity * item.unitPrice),
    }));
    const totals = calculateInvoiceTotals(items);
    if (!Number.isSafeInteger(Math.round(totals.total * 100))) {
      throw new Error("The invoice total is too large.");
    }

    let storedPath: string | undefined;
    try {
      return await db.$transaction(async (tx) => {
        const client = await tx.client.findUnique({ where: { id: data.clientId } });
        if (!client || client.isArchived) throw new Error("Choose an active client.");
        if (data.contractId) {
          const contract = await tx.contract.findUnique({ where: { id: data.contractId } });
          if (!contract || contract.isArchived || contract.clientId !== client.id) {
            throw new Error("Choose a contract belonging to this client.");
          }
        }

        const baseNumber = data.invoiceNumber || formatInvoiceNumber(client.companyName);
        let invoiceNumber = baseNumber;
        const matches = await tx.invoice.findMany({
          where: { invoiceNumber: { startsWith: baseNumber } },
          select: { invoiceNumber: true },
        });
        const usedNumbers = new Set(matches.map((match) => match.invoiceNumber));
        if (data.invoiceNumber && usedNumbers.has(invoiceNumber)) {
          throw new Error("An invoice with this number already exists.");
        }
        for (let suffix = 2; usedNumbers.has(invoiceNumber); suffix++) {
          invoiceNumber = baseNumber + "-" + suffix;
        }

        const company = await tx.companySettings.findFirst() || defaultCompany;
        const issueDate = new Date(data.issueDate);
        const invoice = await tx.invoice.create({
          data: {
            clientId: client.id,
            contractId: data.contractId || null,
            invoiceNumber,
            issueDate,
            dueDate: new Date(data.dueDate),
            currency: data.currency,
            ...totals,
            taxRate: INVOICE_TAX_RATE,
            status: options?.autoSend ? "Sent" : "Draft",
            notes: data.notes?.trim() ?? company.invoiceNotes,
            showUnitPrice: data.showUnitPrice,
            vatNotice: data.vatNotice,
            billingPeriodStart: data.billingPeriodStart ? new Date(data.billingPeriodStart) : null,
            billingPeriodEnd: data.billingPeriodEnd ? new Date(data.billingPeriodEnd) : null,
            items: { create: items },
          },
          include: { client: true, contract: true, items: { orderBy: itemOrder } },
        });

        const pdf = await PdfService.generateAndSaveInvoicePdf({
          invoice,
          client: invoice.client,
          contract: invoice.contract,
          items: invoice.items,
          company,
        });
        storedPath = pdf.storagePath;
        await tx.invoice.update({ where: { id: invoice.id }, data: { pdfUrl: pdf.fileUrl } });
        await tx.document.create({
          data: {
            name: pdf.name,
            type: "Invoice",
            fileUrl: pdf.fileUrl,
            storagePath: pdf.storagePath,
            fileSize: pdf.fileSize,
            mimeType: pdf.mimeType,
            clientId: invoice.clientId,
            contractId: invoice.contractId,
            invoiceId: invoice.id,
          },
        });
        return { ...invoice, pdfUrl: pdf.fileUrl };
      });
    } catch (error) {
      if (storedPath) await StorageService.deleteFile(storedPath);
      throw error;
    }
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
      include: { client: true, contract: true, items: { orderBy: itemOrder } },
    });
    if (!invoice) throw new Error("Invoice not found");

    const company = await db.companySettings.findFirst() || defaultCompany;
    const pdf = await PdfService.generateAndSaveInvoicePdf({
      invoice,
      client: invoice.client,
      contract: invoice.contract,
      items: invoice.items,
      company,
    });
    try {
      await db.$transaction([
        db.invoice.update({ where: { id: invoiceId }, data: { pdfUrl: pdf.fileUrl } }),
        db.document.create({
          data: {
            name: pdf.name,
            type: "Invoice",
            fileUrl: pdf.fileUrl,
            storagePath: pdf.storagePath,
            fileSize: pdf.fileSize,
            mimeType: pdf.mimeType,
            clientId: invoice.clientId,
            contractId: invoice.contractId,
            invoiceId,
          },
        }),
      ]);
    } catch (error) {
      await StorageService.deleteFile(pdf.storagePath);
      throw error;
    }
    return pdf.fileUrl;
  }

  static async archiveInvoice(id: string) {
    return db.invoice.update({
      where: { id },
      data: { isArchived: true },
    });
  }
}
