import { describe, it, expect } from "vitest";
import { PdfService } from "@/services/pdf.service";

describe("PDF Invoice Generation", () => {
  it("should generate a valid PDF document with metadata and line items", async () => {
    const mockInvoiceData = {
      invoice: {
        id: "inv-test-1",
        invoiceNumber: "INV-2026-TEST",
        issueDate: new Date("2026-10-01"),
        dueDate: new Date("2026-10-31"),
        currency: "EUR",
        subtotal: 1000,
        taxRate: 20,
        taxAmount: 200,
        total: 1200,
        status: "Sent",
        notes: "Test invoice notes",
      },
      client: {
        companyName: "Acme Corp SARL",
        contactName: "Alice Dubois",
        email: "alice@acme.com",
        address: "10 Main Street",
        city: "Paris",
        country: "France",
      },
      contract: {
        title: "Web Retainer",
        contractNumber: "CTR-2026-001",
      },
      items: [
        {
          description: "Full Stack Engineering Retainer - October 2026",
          quantity: 1,
          unitPrice: 1000,
          taxRate: 20,
          total: 1000,
        },
      ],
      company: {
        companyName: "Nexus Digital Studio",
        email: "contact@nexusdigital.fr",
        country: "France",
        iban: "FR76 3000 4000 1234 5678",
        bic: "BNPAFRPP",
      },
    };

    const pdfBytes = await PdfService.generateInvoicePdf(mockInvoiceData);

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Verify PDF header magic bytes "%PDF-"
    const headerStr = Buffer.from(pdfBytes.slice(0, 5)).toString("ascii");
    expect(headerStr).toBe("%PDF-");
  });
});
