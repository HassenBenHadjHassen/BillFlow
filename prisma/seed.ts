import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays, subMonths } from "date-fns";

const db = new PrismaClient();

async function main() {
  console.log("Seeding realistic business database for Billflow...");

  // 1. Clean up existing records
  await db.payment.deleteMany();
  await db.invoiceItem.deleteMany();
  await db.invoice.deleteMany();
  await db.document.deleteMany();
  await db.recurringBilling.deleteMany();
  await db.contract.deleteMany();
  await db.client.deleteMany();
  await db.companySettings.deleteMany();
  await db.user.deleteMany();

  // 2. Create Owner User
  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await db.user.create({
    data: {
      name: "Alexandre Martin",
      email: "alexandre@billflow.io",
      passwordHash,
    },
  });
  console.log(` Created owner user: ${user.email} (password: password123)`);

  // 3. Create Company Settings
  const settings = await db.companySettings.create({
    data: {
      companyName: "Nexus Digital Studio",
      address: "42 Rue de la Paix",
      city: "Paris",
      postalCode: "75002",
      country: "France",
      email: "contact@nexusdigital.fr",
      phone: "+33 1 42 68 00 00",
      website: "https://nexusdigital.fr",
      siret: "849 123 456 00018",
      vatNumber: "FR 12 849123456",
      iban: "FR76 3000 4000 0112 3456 7890 123",
      bic: "BNPAFRPP",
      defaultCurrency: "EUR",
      defaultTaxRate: 20,
      defaultPaymentTerms: 30,
      invoicePrefix: "INV",
      invoiceNotes: "Payment is due within 30 days of invoice receipt. Bank wire transfer is preferred.",
    },
  });
  console.log(" Created company settings");

  // 4. Create 3 Clients
  const client1 = await db.client.create({
    data: {
      companyName: "Acme Corp SARL",
      contactName: "Alice Dubois",
      email: "alice@acme-corp.com",
      phone: "+33 6 12 34 56 78",
      address: "15 Avenue des Champs-Élysées",
      city: "Paris",
      postalCode: "75008",
      country: "France",
      vatNumber: "FR 89 123456789",
      siret: "123 456 789 00012",
      notes: "Key client for full-stack web applications and maintenance retainers.",
    },
  });

  const client2 = await db.client.create({
    data: {
      companyName: "Starlight Media SAS",
      contactName: "Marc Laurent",
      email: "marc@starlight-media.com",
      phone: "+33 6 98 76 54 32",
      address: "8 Rue Victor Hugo",
      city: "Lyon",
      postalCode: "69002",
      country: "France",
      vatNumber: "FR 45 987654321",
      siret: "987 654 321 00045",
      notes: "Media agency managing cloud streaming infrastructure.",
    },
  });

  const client3 = await db.client.create({
    data: {
      companyName: "FinTech Horizon Ltd",
      contactName: "Sophie Moreau",
      email: "sophie@fintech-horizon.com",
      phone: "+33 6 45 67 89 01",
      address: "22 Boulevard Haussmann",
      city: "Paris",
      postalCode: "75009",
      country: "France",
      vatNumber: "FR 33 456789012",
      siret: "456 789 012 00033",
      notes: "Fintech scaleup requiring high-security frontend design systems.",
    },
  });
  console.log(" Created 3 clients");

  const today = new Date();

  // 5. Create 3 Contracts
  // Contract 1: Active monthly retainer
  const contract1 = await db.contract.create({
    data: {
      clientId: client1.id,
      title: "Web Platform Development & Maintenance",
      contractNumber: "CTR-2026-001",
      description: "Dedicated monthly development retainer (40h/month) and high-availability maintenance.",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      renewalDate: new Date("2026-11-15"),
      amount: 3500.0,
      currency: "EUR",
      billingFrequency: "Monthly",
      paymentTerms: 30,
      status: "Active",
      signedDate: new Date("2025-12-20"),
      notes: "Renews automatically on November 15th unless notice given 30 days prior.",
    },
  });

  await db.recurringBilling.create({
    data: {
      contractId: contract1.id,
      frequency: "Monthly",
      amount: 3500.0,
      currency: "EUR",
      nextInvoiceDate: new Date("2026-10-01"),
      lastInvoiceDate: new Date("2026-09-01"),
      active: true,
    },
  });

  // Contract 2: Expiring Soon (ends in 14 days)
  const contract2 = await db.contract.create({
    data: {
      clientId: client2.id,
      title: "Cloud Infrastructure & DevOps SLA",
      contractNumber: "CTR-2026-002",
      description: "24/7 Kubernetes cluster monitoring, backups, and failover management.",
      startDate: subMonths(today, 6),
      endDate: addDays(today, 14), // Expiring in 14 days!
      renewalDate: addDays(today, 7),
      amount: 1800.0,
      currency: "EUR",
      billingFrequency: "Monthly",
      paymentTerms: 30,
      status: "Active",
      signedDate: subMonths(today, 6),
      notes: "Needs renewal review before expiration.",
    },
  });

  await db.recurringBilling.create({
    data: {
      contractId: contract2.id,
      frequency: "Monthly",
      amount: 1800.0,
      currency: "EUR",
      nextInvoiceDate: addDays(today, 1),
      lastInvoiceDate: subMonths(today, 1),
      active: true,
    },
  });

  // Contract 3: Quarterly Design System
  const contract3 = await db.contract.create({
    data: {
      clientId: client3.id,
      title: "Design System Architecture & UI Kit",
      contractNumber: "CTR-2026-003",
      description: "Quarterly architectural delivery and UI library component audits.",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2027-02-28"),
      renewalDate: new Date("2027-01-15"),
      amount: 6000.0,
      currency: "EUR",
      billingFrequency: "Quarterly",
      paymentTerms: 30,
      status: "Active",
      signedDate: new Date("2026-02-20"),
    },
  });

  await db.recurringBilling.create({
    data: {
      contractId: contract3.id,
      frequency: "Quarterly",
      amount: 6000.0,
      currency: "EUR",
      nextInvoiceDate: new Date("2026-11-01"),
      lastInvoiceDate: new Date("2026-08-01"),
      active: true,
    },
  });
  console.log(" Created 3 contracts with recurring billing configurations");

  // 6. Invoices across various statuses
  // Inv 1: Paid (Acme)
  const inv1 = await db.invoice.create({
    data: {
      clientId: client1.id,
      contractId: contract1.id,
      invoiceNumber: "INV-2026-001",
      issueDate: new Date("2026-07-01"),
      dueDate: new Date("2026-07-31"),
      currency: "EUR",
      subtotal: 3500.0,
      taxRate: 20,
      taxAmount: 700.0,
      total: 4200.0,
      status: "Paid",
      paymentDate: new Date("2026-07-28"),
      billingPeriodStart: new Date("2026-07-01"),
      billingPeriodEnd: new Date("2026-07-31"),
      notes: "July retainer fee",
      items: {
        create: [
          {
            description: "Monthly Development Retainer - July 2026",
            quantity: 1,
            unitPrice: 3500.0,
            taxRate: 20,
            total: 3500.0,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 4200.0,
            paymentDate: new Date("2026-07-28"),
            paymentMethod: "BankTransfer",
            reference: "WIRE-ACM-20260728",
            notes: "Full payment received via bank transfer",
          },
        ],
      },
    },
  });

  // Inv 2: Paid (Acme)
  const inv2 = await db.invoice.create({
    data: {
      clientId: client1.id,
      contractId: contract1.id,
      invoiceNumber: "INV-2026-002",
      issueDate: new Date("2026-08-01"),
      dueDate: new Date("2026-08-31"),
      currency: "EUR",
      subtotal: 3500.0,
      taxRate: 20,
      taxAmount: 700.0,
      total: 4200.0,
      status: "Paid",
      paymentDate: new Date("2026-08-25"),
      billingPeriodStart: new Date("2026-08-01"),
      billingPeriodEnd: new Date("2026-08-31"),
      notes: "August retainer fee",
      items: {
        create: [
          {
            description: "Monthly Development Retainer - August 2026",
            quantity: 1,
            unitPrice: 3500.0,
            taxRate: 20,
            total: 3500.0,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 4200.0,
            paymentDate: new Date("2026-08-25"),
            paymentMethod: "BankTransfer",
            reference: "WIRE-ACM-20260825",
            notes: "Full payment received",
          },
        ],
      },
    },
  });

  // Inv 3: Partially Paid (Acme)
  const inv3 = await db.invoice.create({
    data: {
      clientId: client1.id,
      contractId: contract1.id,
      invoiceNumber: "INV-2026-003",
      issueDate: new Date("2026-09-01"),
      dueDate: addDays(today, 10),
      currency: "EUR",
      subtotal: 3500.0,
      taxRate: 20,
      taxAmount: 700.0,
      total: 4200.0,
      status: "PartiallyPaid",
      billingPeriodStart: new Date("2026-09-01"),
      billingPeriodEnd: new Date("2026-09-30"),
      notes: "September retainer fee",
      items: {
        create: [
          {
            description: "Monthly Development Retainer - September 2026",
            quantity: 1,
            unitPrice: 3500.0,
            taxRate: 20,
            total: 3500.0,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 2000.0,
            paymentDate: subDays(today, 3),
            paymentMethod: "BankTransfer",
            reference: "PARTIAL-ACM-09",
            notes: "First installment received, remainder scheduled next week",
          },
        ],
      },
    },
  });

  // Inv 4: Overdue (Starlight Media)
  const inv4 = await db.invoice.create({
    data: {
      clientId: client2.id,
      contractId: contract2.id,
      invoiceNumber: "INV-2026-004",
      issueDate: subDays(today, 45),
      dueDate: subDays(today, 15), // 15 days overdue!
      currency: "EUR",
      subtotal: 1800.0,
      taxRate: 20,
      taxAmount: 360.0,
      total: 2160.0,
      status: "Overdue",
      notes: "DevOps SLA for July/August",
      items: {
        create: [
          {
            description: "DevOps Infrastructure Support & Monitoring",
            quantity: 1,
            unitPrice: 1800.0,
            taxRate: 20,
            total: 1800.0,
          },
        ],
      },
    },
  });

  // Inv 5: Sent (Starlight Media)
  const inv5 = await db.invoice.create({
    data: {
      clientId: client2.id,
      contractId: contract2.id,
      invoiceNumber: "INV-2026-005",
      issueDate: subDays(today, 5),
      dueDate: addDays(today, 25),
      currency: "EUR",
      subtotal: 1800.0,
      taxRate: 20,
      taxAmount: 360.0,
      total: 2160.0,
      status: "Sent",
      notes: "DevOps SLA for August/September",
      items: {
        create: [
          {
            description: "DevOps Infrastructure Support & Monitoring",
            quantity: 1,
            unitPrice: 1800.0,
            taxRate: 20,
            total: 1800.0,
          },
        ],
      },
    },
  });

  // Inv 6: Draft (FinTech Horizon)
  const inv6 = await db.invoice.create({
    data: {
      clientId: client3.id,
      contractId: contract3.id,
      invoiceNumber: "INV-2026-006",
      issueDate: today,
      dueDate: addDays(today, 30),
      currency: "EUR",
      subtotal: 6000.0,
      taxRate: 20,
      taxAmount: 1200.0,
      total: 7200.0,
      status: "Draft",
      notes: "Q3 Design System deliverables and accessibility compliance audit",
      items: {
        create: [
          {
            description: "Design System Architecture (Q3 milestone)",
            quantity: 1,
            unitPrice: 4500.0,
            taxRate: 20,
            total: 4500.0,
          },
          {
            description: "Accessibility & WCAG 2.1 AAA Audit",
            quantity: 1,
            unitPrice: 1500.0,
            taxRate: 20,
            total: 1500.0,
          },
        ],
      },
    },
  });
  console.log(" Created 6 invoices with mixed statuses (Paid, PartiallyPaid, Overdue, Sent, Draft)");

  // 7. Create Documents
  await db.document.createMany({
    data: [
      {
        name: "Signed_Contract_Acme_2026.pdf",
        type: "SignedContract",
        fileUrl: "/api/documents/stream?path=contracts%2FCTR-2026-001_signed.pdf",
        storagePath: "contracts/CTR-2026-001_signed.pdf",
        fileSize: 452100,
        mimeType: "application/pdf",
        clientId: client1.id,
        contractId: contract1.id,
      },
      {
        name: "DevOps_SLA_Terms_Starlight.pdf",
        type: "Contract",
        fileUrl: "/api/documents/stream?path=contracts%2FCTR-2026-002_sla.pdf",
        storagePath: "contracts/CTR-2026-002_sla.pdf",
        fileSize: 320400,
        mimeType: "application/pdf",
        clientId: client2.id,
        contractId: contract2.id,
      },
      {
        name: "Invoice_INV-2026-001.pdf",
        type: "Invoice",
        fileUrl: "/api/documents/stream?path=invoices%2FINV-2026-001.pdf",
        storagePath: "invoices/INV-2026-001.pdf",
        fileSize: 85200,
        mimeType: "application/pdf",
        clientId: client1.id,
        contractId: contract1.id,
        invoiceId: inv1.id,
      },
      {
        name: "Wire_Transfer_Receipt_July.pdf",
        type: "Receipt",
        fileUrl: "/api/documents/stream?path=payments%2Freceipt_july_acme.pdf",
        storagePath: "payments/receipt_july_acme.pdf",
        fileSize: 112000,
        mimeType: "application/pdf",
        clientId: client1.id,
      },
    ],
  });
  console.log(" Created attached documents");

  console.log("\n Database successfully seeded with realistic business data!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
