/** Billflow invoices are always issued without VAT. */
export const INVOICE_TAX_RATE = 0;

export const INVOICE_VAT_NOTICES = {
  exemption: "TVA non applicable, article 293 B du CGI",
  cibsExemption: "TVA non applicable, article L. 223-3 du Code des impositions des biens et des services (CIBS)",
  reverseCharge: "Autoliquidation — Article 196 de la directive 2006/112/CE",
} as const;

export function getInvoiceVatNotice(key: string | null | undefined): string | undefined {
  if (key === "exemption" || key === "cibsExemption" || key === "reverseCharge") return INVOICE_VAT_NOTICES[key];
}

export function getInvoiceLogo(logo?: string | null): string | undefined {
  if (logo && logo.length <= 1_400_000 && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(logo)) {
    return logo;
  }
}

export interface InvoiceParty {
  companyName: string;
  contactName?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  siret?: string | null;
  vatNumber?: string | null;
}

export type InvoiceCompany = InvoiceParty & {
  logo?: string | null;
  bankName?: string | null;
  iban?: string | null;
  bic?: string | null;
  invoiceNotes?: string | null;
};

export const invoicePaper = {
  ink: "#0f172a",
  text: "#475569",
  muted: "#64748b",
  accent: "#1e40af",
  surface: "#f5f7fa",
  border: "#dce4ef",
  divider: "#cbd5e1",
};

export const invoiceLabels = {
  issuer: "Émetteur",
  client: "Client / Facturation",
  billing: "Détails de facturation",
  description: "Description",
  quantity: "Qté",
  unitPrice: "Prix unit. HT",
  lineTotal: "Total HT",
  subtotal: "Total HT :",
  net: "Total Net à Payer :",
  bank: "Coordonnées bancaires pour le règlement",
  notes: "Conditions & notes",
};

function invoiceAddress(party: InvoiceParty) {
  const locality = [party.postalCode, party.city].filter(Boolean).join(" ");
  return [party.address, locality].filter(Boolean).join(", ");
}

export function invoicePartyBlock(party?: InvoiceParty, billingContact = false) {
  const contact = party?.contactName?.trim();
  const company = party?.companyName;
  const name = (billingContact ? contact || company : company || contact) || "—";
  if (!party) return { name, details: [] };
  const secondaryName = billingContact ? company : contact;
  const address = [invoiceAddress(party), party.country].filter(Boolean).join(", ");
  const details = [
    secondaryName !== name ? secondaryName : null,
    address,
    party.email && "Email : " + party.email,
    party.phone && "Tél : " + party.phone,
    party.siret && "SIRET : " + party.siret,
    party.vatNumber && "TVA Intra : " + party.vatNumber,
  ].filter((value): value is string => Boolean(value));
  return { name, details };
}

export function invoiceBankDetails(company: InvoiceCompany): string[] {
  return [
    company.bankName && "Banque : " + company.bankName,
    company.iban && "IBAN : " + company.iban,
    company.bic && "BIC : " + company.bic,
  ].filter((value): value is string => Boolean(value));
}

export function invoiceFooter(company: InvoiceCompany): string {
  return [
    company.companyName,
    company.siret && "SIRET " + company.siret,
    invoiceAddress(company),
  ].filter(Boolean).join(" • ").replace(/\s+/g, " ");
}

function formatInvoiceDate(date?: string | Date | null): string {
  const value = date ? new Date(date) : null;
  return value && Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : "—";
}

export function invoiceBillingDetails(
  invoice: {
    issueDate: string | Date;
    dueDate: string | Date;
    billingPeriodStart?: string | Date | null;
    billingPeriodEnd?: string | Date | null;
  },
  company: InvoiceCompany,
  contract?: { title: string; contractNumber: string } | null,
) {
  const details = [
    { label: "Date d’émission", value: formatInvoiceDate(invoice.issueDate), emphasis: true },
    { label: "Date d’échéance", value: formatInvoiceDate(invoice.dueDate), emphasis: true },
  ];
  if (company.iban) details.push({ label: "Règlement", value: "Virement", emphasis: false });
  if (contract) details.push({ label: "Contrat", value: contract.contractNumber + " · " + contract.title, emphasis: false });
  if (invoice.billingPeriodStart || invoice.billingPeriodEnd) {
    details.push({
      label: "Période",
      value: formatInvoiceDate(invoice.billingPeriodStart) + " – " + formatInvoiceDate(invoice.billingPeriodEnd),
      emphasis: false,
    });
  }
  return details;
}

/** F + today's local calendar date + the first word of the client's company. */
export function formatInvoiceNumber(companyName: string, date: Date = new Date()): string {
  const firstWord = companyName.trim().split(/\s+/)[0] || "CLIENT";
  const company = firstWord
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "") || "CLIENT";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `F${year}${month}${day}-${company}`;
}
