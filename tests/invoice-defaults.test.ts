import { describe, it, expect } from "vitest";
import db from "@/lib/db";
import { formatInvoiceNumber, INVOICE_TAX_RATE } from "@/lib/invoice";
import { InvoiceService } from "@/services/invoice.service";
import { RecurringBillingService } from "@/services/recurring.service";

describe("Invoice naming and zero VAT", () => {
  it("uses F, the current local date, and the first company word", () => {
    expect(formatInvoiceNumber("Alizee Consulting", new Date(2026, 10, 3))).toBe("F20261103-ALIZEE");
    expect(formatInvoiceNumber("  Alizée   Consulting  ", new Date(2026, 0, 9))).toBe("F20260109-ALIZEE");
  });

  it("handles a single company name and pads the date", () => {
    expect(formatInvoiceNumber("ALIZEE", new Date(2026, 1, 4))).toBe("F20260204-ALIZEE");
    expect(INVOICE_TAX_RATE).toBe(0);
  });

  it("records zero VAT and the correct paid amount even with stale tax input", async () => {
    const client = await db.client.create({ data: { companyName: "Taxfree Upload", email: "taxfree-upload@example.com" } });
    const invoice = await InvoiceService.saveInvoiceWithFile({ invoiceNumber: `UPLOAD-${Date.now()}`, clientId: client.id, issueDate: "2026-11-03", dueDate: "2026-12-03", currency: "EUR", subtotal: 150, taxRate: 20, taxAmount: 30, total: 180, status: "Paid" });
    const saved = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { payments: true } });
    expect(saved.taxRate).toBe(0);
    expect(saved.taxAmount).toBe(0);
    expect(saved.total).toBe(150);
    expect(saved.payments[0].amount).toBe(150);
  });

  it("generates a named invoice and line items without VAT", async () => {
    const client = await db.client.create({ data: { companyName: "Alizée Consulting", email: "alizee-test@example.com" } });
    const invoice = await InvoiceService.createInvoice({ clientId: client.id, issueDate: "2026-11-03", dueDate: "2026-12-03", currency: "EUR", items: [{ description: "Consulting", quantity: 2, unitPrice: 125, taxRate: 20 }] });
    expect(invoice.invoiceNumber).toBe(formatInvoiceNumber(client.companyName));
    expect(invoice.taxRate).toBe(0);
    expect(invoice.taxAmount).toBe(0);
    expect(invoice.total).toBe(250);
    expect(invoice.items[0].taxRate).toBe(0);
    expect(invoice.pdfUrl).toBeTruthy();
    const doc = await db.document.findFirstOrThrow({ where: { invoiceId: invoice.id } });
    expect(doc.name).toBe(`${invoice.invoiceNumber}.pdf`);
  });

  it("uses zero VAT and company-based naming for recurring invoices", async () => {
    const client = await db.client.create({ data: { companyName: "Recurring Company", email: "recurring-zero@example.com" } });
    const contract = await db.contract.create({ data: { clientId: client.id, title: "Monthly service", contractNumber: `ZERO-${Date.now()}`, startDate: new Date(), amount: 100, status: "Active", recurringBilling: { create: { amount: 100, nextInvoiceDate: new Date() } } }, include: { recurringBilling: true } });
    const result = await RecurringBillingService.generateInvoice(contract.recurringBilling!.id, true);
    expect(result.generated).toBe(true);
    const invoice = await db.invoice.findUniqueOrThrow({ where: { id: result.invoiceId } });
    expect(invoice.invoiceNumber).toBe(formatInvoiceNumber(client.companyName));
    expect(invoice.total).toBe(100);
    expect(invoice.taxRate).toBe(0);
    expect(invoice.taxAmount).toBe(0);
  });
});
