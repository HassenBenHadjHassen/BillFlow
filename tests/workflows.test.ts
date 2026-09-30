import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "@/lib/db";
import { ClientService } from "@/services/client.service";
import { ContractService } from "@/services/contract.service";
import { InvoiceService } from "@/services/invoice.service";
import { PaymentService } from "@/services/payment.service";
import { RecurringBillingService } from "@/services/recurring.service";
import { DashboardService } from "@/services/dashboard.service";
import { addDays, subDays } from "date-fns";

describe("End-to-End Business Workflows", () => {
  let clientId: string;
  let contractId: string;
  let invoiceId: string;

  beforeAll(async () => {
    // Setup test environment
    const user = await db.user.findFirst();
    if (!user) {
      await db.user.create({
        data: {
          name: "Test Admin",
          email: "test@billflow.io",
          passwordHash: "dummyhash",
        },
      });
    }
  });

  afterAll(async () => {
    // Disconnect cleanly
    await db.$disconnect();
  });

  it("WORKFLOW 1: Client -> Contract -> Monthly Recurring -> Invoice -> Payment -> Paid", async () => {
    // 1. Create client
    const client = await ClientService.createClient({
      companyName: "Workflow Test Client Corp",
      email: "workflow@testclient.com",
      country: "France",
    });
    clientId = client.id;
    expect(client.id).toBeDefined();

    // 2. Create contract with recurring billing enabled
    const contract = await ContractService.createContract({
      clientId: client.id,
      title: "Full-Stack Maintenance Agreement",
      contractNumber: `CTR-WF-${Date.now()}`,
      startDate: new Date().toISOString().split("T")[0],
      amount: 2500,
      currency: "EUR",
      billingFrequency: "Monthly",
      paymentTerms: 30,
      status: "Active",
      autoSetupRecurring: true,
    });
    contractId = contract.id;
    expect(contract.id).toBeDefined();

    // Verify recurring billing record was created
    const recurring = await db.recurringBilling.findUnique({
      where: { contractId: contract.id },
    });
    expect(recurring).not.toBeNull();
    expect(recurring?.amount).toBe(2500);

    // 3. Generate invoice
    const invoice = await InvoiceService.createInvoice({
      clientId: client.id,
      contractId: contract.id,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: addDays(new Date(), 30).toISOString().split("T")[0],
      currency: "EUR",
      items: [
        {
          description: "Monthly Maintenance Retainer",
          quantity: 1,
          unitPrice: 2500,
          taxRate: 20,
        },
      ],
    }, { autoSend: true });
    invoiceId = invoice.id;

    expect(invoice.total).toBe(3000); // 2500 + 500 VAT
    expect(invoice.status).toBe("Sent");
    expect(invoice.invoiceNumber).toMatch(/^INV-/);

    // 4. Record full payment
    const payment = await PaymentService.recordPayment({
      invoiceId: invoice.id,
      amount: 3000,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "BankTransfer",
      reference: "WIRE-WF-001",
    });
    expect(payment.id).toBeDefined();

    // 5. Verify invoice status becomes Paid
    const updatedInvoice = await InvoiceService.getInvoiceById(invoice.id);
    expect(updatedInvoice?.computedStatus).toBe("Paid");
    expect(updatedInvoice?.remainingBalance).toBe(0);
    expect(updatedInvoice?.amountPaid).toBe(3000);

    // 6. Verify Dashboard totals reflect payment
    const dashboard = await DashboardService.getDashboardData();
    expect(dashboard.metrics.revenueThisMonth).toBeGreaterThanOrEqual(3000);
  });

  it("WORKFLOW 2: Recurring Billing Idempotency & Duplicate Prevention", async () => {
    // 1. Create client and contract with next invoice date due today
    const client = await ClientService.createClient({
      companyName: "Idempotency Client",
      email: "idempotent@test.com",
    });

    const todayStr = new Date().toISOString().split("T")[0];
    const contract = await ContractService.createContract({
      clientId: client.id,
      title: "Idempotency Test Service",
      contractNumber: `CTR-IDEM-${Date.now()}`,
      startDate: todayStr,
      amount: 1200,
      billingFrequency: "Monthly",
      status: "Active",
      autoSetupRecurring: true,
    });

    const recurringConfig = await db.recurringBilling.findUnique({
      where: { contractId: contract.id },
    });
    expect(recurringConfig).not.toBeNull();

    // 2. Generate recurring invoice for the due period
    const firstRun = await RecurringBillingService.generateInvoice(recurringConfig!.id, true);
    expect(firstRun.generated).toBe(true);
    expect(firstRun.invoiceId).toBeDefined();

    const invoiceCountBefore = await db.invoice.count({
      where: { contractId: contract.id },
    });
    expect(invoiceCountBefore).toBe(1);

    // 3. Run the generation again immediately for the same configuration
    // Idempotency rule: MUST NOT create another invoice for the same period
    const secondRun = await RecurringBillingService.generateInvoice(recurringConfig!.id, false);
    expect(secondRun.generated).toBe(false);
    expect(secondRun.reason).toMatch(/Invoice already exists for period|not yet due/);

    const invoiceCountAfter = await db.invoice.count({
      where: { contractId: contract.id },
    });
    expect(invoiceCountAfter).toBe(1); // Still exactly 1!
  });

  it("WORKFLOW 3: Contract Expiration & Historical Renewal", async () => {
    // 1. Create client and expiring contract (ending in 10 days)
    const client = await ClientService.createClient({
      companyName: "Expiring Client Ltd",
      email: "renew@test.com",
    });

    const originalContractNumber = `CTR-ORIG-${Date.now()}`;
    const oldContract = await ContractService.createContract({
      clientId: client.id,
      title: "Annual Cloud Management",
      contractNumber: originalContractNumber,
      startDate: subDays(new Date(), 350).toISOString().split("T")[0],
      endDate: addDays(new Date(), 10).toISOString().split("T")[0],
      amount: 4000,
      billingFrequency: "Monthly",
      status: "Active",
      autoSetupRecurring: true,
    });

    // Check expiration info
    const expiration = ContractService.getExpirationInfo(oldContract.endDate, oldContract.status);
    expect(expiration.isExpiringSoon).toBe(true);

    // 2. Renew contract
    const renewedContractNumber = `${originalContractNumber}-R2`;
    const newContract = await ContractService.renewContract({
      contractId: oldContract.id,
      title: "Annual Cloud Management (Year 2)",
      contractNumber: renewedContractNumber,
      startDate: oldContract.endDate!.toISOString().split("T")[0],
      endDate: addDays(oldContract.endDate!, 365).toISOString().split("T")[0],
      amount: 4500, // renegotiated rate
      billingFrequency: "Monthly",
      paymentTerms: 30,
    });

    expect(newContract.status).toBe("Active");
    expect(newContract.amount).toBe(4500);
    expect(newContract.previousContractId).toBe(oldContract.id);

    // Verify historical contract is preserved and marked Expired
    const oldContractInDb = await db.contract.findUnique({
      where: { id: oldContract.id },
    });
    expect(oldContractInDb).not.toBeNull();
    expect(oldContractInDb?.contractNumber).toBe(originalContractNumber);
    expect(oldContractInDb?.status).toBe("Expired");
  });

  it("WORKFLOW 4: Partial Payment -> Partially Paid -> Full Payment -> Paid", async () => {
    // 1. Create invoice with total 1200
    const client = await ClientService.createClient({
      companyName: "Partial Payment Client",
      email: "partial@test.com",
    });

    const invoice = await InvoiceService.createInvoice({
      clientId: client.id,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: addDays(new Date(), 20).toISOString().split("T")[0],
      currency: "EUR",
      items: [
        {
          description: "Technical Consulting Milestone",
          quantity: 1,
          unitPrice: 1000,
          taxRate: 20, // total 1200
        },
      ],
    }, { autoSend: true });

    // 2. Record first installment of 500
    await PaymentService.recordPayment({
      invoiceId: invoice.id,
      amount: 500,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "BankTransfer",
      reference: "INSTALLMENT-1",
    });

    const partiallyPaidInvoice = await InvoiceService.getInvoiceById(invoice.id);
    expect(partiallyPaidInvoice?.computedStatus).toBe("PartiallyPaid");
    expect(partiallyPaidInvoice?.amountPaid).toBe(500);
    expect(partiallyPaidInvoice?.remainingBalance).toBe(700);

    // 3. Record second installment of 700
    await PaymentService.recordPayment({
      invoiceId: invoice.id,
      amount: 700,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "BankTransfer",
      reference: "INSTALLMENT-2",
    });

    const fullyPaidInvoice = await InvoiceService.getInvoiceById(invoice.id);
    expect(fullyPaidInvoice?.computedStatus).toBe("Paid");
    expect(fullyPaidInvoice?.amountPaid).toBe(1200);
    expect(fullyPaidInvoice?.remainingBalance).toBe(0);
  });

  it("WORKFLOW 5: Save Ready Invoice with Attached PDF & Document Vault Linking", async () => {
    // 1. Create client
    const client = await ClientService.createClient({
      companyName: "Saved Invoices Client SARL",
      email: "saved@client.com",
    });

    // 2. Create contract with attached PDF buffer
    const mockContractPdf = Buffer.from("%PDF-1.4 Mock Contract Content");
    const contract = await ContractService.createContract(
      {
        clientId: client.id,
        title: "Signed Engineering Retainer",
        contractNumber: `CTR-SIGNED-${Date.now()}`,
        startDate: new Date().toISOString().split("T")[0],
        amount: 3500,
        billingFrequency: "Monthly",
        status: "Active",
        autoSetupRecurring: true,
      },
      {
        buffer: mockContractPdf,
        fileName: "Signed_Agreement.pdf",
        mimeType: "application/pdf",
      }
    );
    expect(contract.fileUrl).toBeDefined();
    expect(contract.fileUrl).toContain("/api/documents/stream");

    // Verify contract document in vault
    const contractDoc = await db.document.findFirst({
      where: { contractId: contract.id, type: "SignedContract" },
    });
    expect(contractDoc).not.toBeNull();
    expect(contractDoc?.name).toBe("Signed_Agreement.pdf");

    // 3. Save a ready invoice with custom number and attached invoice PDF
    const mockInvoicePdf = Buffer.from("%PDF-1.4 Mock Ready Invoice PDF Content");
    const savedInvoice = await InvoiceService.saveInvoiceWithFile(
      {
        invoiceNumber: `INV-EXISTING-${Date.now()}`,
        clientId: client.id,
        contractId: contract.id,
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: addDays(new Date(), 30).toISOString().split("T")[0],
        currency: "EUR",
        subtotal: 3500,
        taxRate: 20,
        taxAmount: 700,
        total: 4200,
        status: "Sent",
        notes: "Monthly retainer invoice already prepared externally.",
      },
      {
        buffer: mockInvoicePdf,
        fileName: "External_Invoice_2026_09.pdf",
        mimeType: "application/pdf",
      }
    );

    expect(savedInvoice.id).toBeDefined();
    expect(savedInvoice.total).toBe(4200);
    expect(savedInvoice.pdfUrl).toBeDefined();
    expect(savedInvoice.pdfUrl).toContain("/api/documents/stream");

    // Verify invoice document in vault
    const invoiceDoc = await db.document.findFirst({
      where: { invoiceId: savedInvoice.id, type: "Invoice" },
    });
    expect(invoiceDoc).not.toBeNull();
    expect(invoiceDoc?.name).toBe("External_Invoice_2026_09.pdf");

    // 4. Verify getInvoiceById correctly computes remaining balance
    const fetchedInvoice = await InvoiceService.getInvoiceById(savedInvoice.id);
    expect(fetchedInvoice?.remainingBalance).toBe(4200);
    expect(fetchedInvoice?.computedStatus).toBe("Sent");
    expect(fetchedInvoice?.pdfUrl).toBe(savedInvoice.pdfUrl);

    // 5. Test advancing recurring schedule
    const recurring = await db.recurringBilling.findUnique({
      where: { contractId: contract.id },
    });
    expect(recurring).not.toBeNull();
    if (recurring) {
      const advanced = await RecurringBillingService.advanceSchedule(recurring.id);
      expect(advanced.nextInvoiceDate).not.toEqual(recurring.nextInvoiceDate);
    }
  });
});

