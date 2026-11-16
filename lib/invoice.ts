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

export function invoicePartyDetails(party: InvoiceParty): string[] {
  return [
    party.contactName,
    party.address,
    [party.postalCode, party.city].filter(Boolean).join(" "),
    party.country,
    party.email,
    party.phone,
    party.siret && "SIRET · " + party.siret,
    party.vatNumber && "N° TVA · " + party.vatNumber,
  ].filter((value): value is string => Boolean(value));
}

const invoiceDateFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatInvoiceDate(date: string | Date): string {
  const value = new Date(date);
  return Number.isFinite(value.getTime()) ? invoiceDateFormat.format(value) : "—";
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
