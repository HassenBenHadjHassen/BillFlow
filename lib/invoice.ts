/** Billflow invoices are always issued without VAT. */
export const INVOICE_TAX_RATE = 0;

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
