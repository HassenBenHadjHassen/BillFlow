import type { CSSProperties, ReactNode } from "react";
import { formatCurrency } from "@/lib/financial";
import {
  getInvoiceLogo, getInvoiceVatNotice, invoiceBankDetails, invoiceBillingDetails,
  invoiceFooter, invoiceLabels, invoicePaper, invoicePartyBlock, type InvoiceParty,
} from "@/lib/invoice";
import type { InvoicePdfData } from "@/services/pdf.service";

type PreviewProps = {
  company: InvoicePdfData["company"];
  client?: InvoiceParty;
  contract?: InvoicePdfData["contract"];
  invoice: Omit<InvoicePdfData["invoice"], "id" | "status" | "issueDate" | "dueDate" | "billingPeriodStart" | "billingPeriodEnd"> & {
    issueDate: string;
    dueDate: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
  };
  items: InvoicePdfData["items"];
};

const paperColors = Object.fromEntries(
  Object.entries(invoicePaper).map(([name, value]) => ["--invoice-" + name, value]),
) as CSSProperties;

function BillingCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded border border-[var(--invoice-border)] bg-[var(--invoice-surface)] p-2 text-[10px] leading-snug text-[color:var(--invoice-text)] [overflow-wrap:anywhere]">
      <h3 className="mb-1 border-b border-[var(--invoice-divider)] pb-0.5 text-[9px] font-bold uppercase tracking-wide text-[color:var(--invoice-accent)]">{label}</h3>
      {children}
    </div>
  );
}

function Party({ label, party, billingContact }: { label: string; party?: InvoiceParty; billingContact?: boolean }) {
  const { name, details } = invoicePartyBlock(party, billingContact);
  return (
    <BillingCard label={label}>
      <p className="font-bold text-[color:var(--invoice-ink)]">{name}</p>
      {details.map((detail, index) => <p className="whitespace-pre-line" key={index}>{detail}</p>)}
    </BillingCard>
  );
}

export function InvoicePreview({ company, client, contract, invoice, items }: PreviewProps) {
  const logo = getInvoiceLogo(company.logo);
  const notice = getInvoiceVatNotice(invoice.vatNotice);
  const billing = invoiceBillingDetails(invoice, company, contract);
  const bank = invoiceBankDetails(company);
  const notes = invoice.notes ?? company.invoiceNotes;
  const showUnitPrice = invoice.showUnitPrice !== false;
  const money = (amount: number) => formatCurrency(amount, invoice.currency);

  return (
    <article lang="fr" aria-label="Aperçu de la facture" style={paperColors} className="flex aspect-[210/297] flex-col rounded border border-[var(--invoice-border)] bg-white p-4 text-xs text-[color:var(--invoice-ink)] shadow-sm [container-type:inline-size] sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--invoice-border)] pb-3.5">
        <div className="min-w-0 [overflow-wrap:anywhere]">
          <p className="text-[24px] font-bold leading-none tracking-wide">FACTURE</p>
          <p className="mt-1 text-[11px] font-bold text-[color:var(--invoice-accent)]">N° {invoice.invoiceNumber || "—"}</p>
        </div>
        {logo && <img src={logo} alt="Logo de l’entreprise" className="max-h-10 w-auto max-w-[22%] shrink-0 object-contain" />}
      </header>

      <div className="mb-4 grid grid-cols-1 gap-2 [@container_(min-width:240px)]:grid-cols-2 [@container_(min-width:375px)]:grid-cols-3 [&>*:last-child]:col-span-full [@container_(min-width:375px)]:[&>*:last-child]:col-span-1">
        <Party label={invoiceLabels.issuer} party={company} />
        <Party label={invoiceLabels.client} party={client} billingContact />
        <BillingCard label={invoiceLabels.billing}>
          {billing.map(({ label, value, emphasis }) => (
            <p key={label}>{label} : {emphasis ? <strong className="whitespace-nowrap text-[color:var(--invoice-ink)]">{value}</strong> : value}</p>
          ))}
        </BillingCard>
      </div>

      <div className="shrink-0 overflow-x-auto rounded-t">
        <table className="w-full text-left !text-[11px] leading-snug">
          <thead className="bg-[var(--invoice-ink)]">
            <tr>
              <th scope="col" className="w-[57%] px-2 !py-1.5 !text-[9px] !font-bold !text-white">{invoiceLabels.description}</th>
              <th scope="col" className={`px-1 !py-1.5 !text-[9px] !font-bold !text-white ${showUnitPrice ? "text-center" : "text-right"}`}>{invoiceLabels.quantity}</th>
              {showUnitPrice && <>
                <th scope="col" className="whitespace-nowrap px-1 !py-1.5 text-center !text-[9px] !font-bold !text-white">{invoiceLabels.unitPrice}</th>
                <th scope="col" className="whitespace-nowrap px-2 !py-1.5 text-right !text-[9px] !font-bold !text-white">{invoiceLabels.lineTotal}</th>
              </>}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {items.map((item, index) => (
              <tr className="border-b border-[var(--invoice-border)] even:bg-[var(--invoice-surface)]" key={index}>
                <td className="min-w-20 whitespace-pre-wrap px-2 !py-1.5 [overflow-wrap:anywhere]">{item.description || "—"}</td>
                <td className={`px-1 !py-1.5 align-top ${showUnitPrice ? "text-center" : "text-right"}`}>{item.quantity || "—"}</td>
                {showUnitPrice && <>
                  <td className="whitespace-nowrap px-1 !py-1.5 text-center align-top">{money(item.unitPrice)}</td>
                  <td className="whitespace-nowrap px-2 !py-1.5 text-right align-top font-bold">{money(item.total)}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-3 w-[43%] min-w-[11rem] max-w-full space-y-0.5 rounded border border-[var(--invoice-border)] bg-[var(--invoice-surface)] px-2 py-2 text-[10px] tabular-nums text-[color:var(--invoice-text)]">
        <div className="flex flex-wrap justify-between gap-x-2"><dt>{invoiceLabels.subtotal}</dt><dd className="font-bold text-[color:var(--invoice-ink)]">{money(invoice.subtotal)}</dd></div>
        <div className="flex flex-wrap justify-between gap-x-2"><dt>TVA ({invoice.taxRate}%) :</dt><dd className="font-bold text-[color:var(--invoice-ink)]">{money(invoice.taxAmount)}</dd></div>
        <div className="!mt-1 flex flex-wrap justify-between gap-x-2 border-t border-[var(--invoice-divider)] pt-1 text-[11px] font-bold text-[color:var(--invoice-ink)]">
          <dt>{invoiceLabels.net}</dt><dd className="text-[color:var(--invoice-accent)]">{money(invoice.total)}</dd>
        </div>
      </dl>

      {notice && <p className="mt-5 rounded border border-dashed border-[var(--invoice-divider)] px-2 py-1.5 text-center text-[10px] italic text-[color:var(--invoice-muted)]">« {notice} »</p>}

      {bank.length > 0 && (
        <div className="mt-3.5 rounded border border-[var(--invoice-border)] bg-[var(--invoice-surface)] p-2 text-[10px] text-[color:var(--invoice-text)] [overflow-wrap:anywhere]">
          <h3 className="mb-0.5 text-[9px] font-bold uppercase text-[color:var(--invoice-accent)]">{invoiceLabels.bank}</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {bank.map((detail) => <p className="min-w-0" key={detail}>{detail}</p>)}
          </div>
        </div>
      )}

      {notes?.trim() && (
        <div className="mt-3.5 border-t border-[var(--invoice-border)] pt-1.5 text-[10px] text-[color:var(--invoice-text)] [overflow-wrap:anywhere]">
          <h3 className="text-[9px] font-bold uppercase tracking-wide text-[color:var(--invoice-muted)]">{invoiceLabels.notes}</h3>
          <p className="whitespace-pre-wrap">{notes}</p>
        </div>
      )}

      <footer className="mt-auto pt-8 text-center text-[9px] text-[color:var(--invoice-muted)] [overflow-wrap:anywhere]">
        <p className="border-t border-[var(--invoice-border)] pt-2">{invoiceFooter(company)}</p>
      </footer>
    </article>
  );
}
