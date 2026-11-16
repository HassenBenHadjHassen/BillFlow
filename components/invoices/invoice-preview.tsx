import { formatCurrency } from "@/lib/financial";
import { formatInvoiceDate, getInvoiceLogo, getInvoiceVatNotice, invoicePartyDetails, type InvoiceParty } from "@/lib/invoice";
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

function Party({ label, party }: { label: string; party?: InvoiceParty }) {
  return (
    <div className="min-w-0 break-words">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1.5 font-semibold">{party?.companyName ?? "—"}</p>
      {party && <div className="mt-1 space-y-0.5 whitespace-pre-line text-[11px] text-slate-600">
        {invoicePartyDetails(party).map((detail, index) => <p key={index}>{detail}</p>)}
      </div>}
    </div>
  );
}

export function InvoicePreview({ company, client, contract, invoice, items }: PreviewProps) {
  const logo = getInvoiceLogo(company.logo);
  const notice = getInvoiceVatNotice(invoice.vatNotice);
  const money = (amount: number) => formatCurrency(amount, invoice.currency);

  return (
    <article lang="fr" aria-label="Aperçu de la facture" className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-900 shadow-sm sm:p-6">
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="min-w-0 break-words">
          <p className="text-2xl font-semibold tracking-tight">FACTURE</p>
          <p className="mt-0.5 font-mono text-[11px] text-slate-600">N° {invoice.invoiceNumber || "—"}</p>
        </div>
        {logo && <img src={logo} alt="Logo de l’entreprise" className="max-h-10 max-w-24 object-contain" />}
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Party label="Émetteur" party={company} />
        <Party label="Client" party={client} />
      </div>

      <div className="space-y-1 break-words text-[11px] text-slate-700">
        <div className="grid grid-cols-2 gap-4 font-medium">
          <p>Émission · {formatInvoiceDate(invoice.issueDate)}</p>
          <p>Échéance · {formatInvoiceDate(invoice.dueDate)}</p>
        </div>
        {contract && <p>Contrat · {contract.contractNumber} · {contract.title}</p>}
        {(invoice.billingPeriodStart || invoice.billingPeriodEnd) && (
          <p>Période · {formatInvoiceDate(invoice.billingPeriodStart)} – {formatInvoiceDate(invoice.billingPeriodEnd)}</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-100">
            <tr>
              <th scope="col" className="pl-2 pr-1 !py-2 !tracking-normal !text-slate-600">Description</th>
              <th scope="col" className="px-1 !py-2 text-right !tracking-normal !text-slate-600">Qté</th>
              {invoice.showUnitPrice && <>
                <th scope="col" className="px-1 !py-2 text-right !tracking-normal !text-slate-600">Prix unit. HT</th>
                <th scope="col" className="pl-1 pr-2 !py-2 text-right !tracking-normal !text-slate-600">Total HT</th>
              </>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-[11px] tabular-nums">
            {items.map((item, index) => (
              <tr key={index}>
                <td className="min-w-24 whitespace-pre-wrap break-words pl-2 pr-1 !py-2 [overflow-wrap:anywhere]">{item.description || "—"}</td>
                <td className="px-1 !py-2 text-right align-top">{item.quantity || "—"}</td>
                {invoice.showUnitPrice && <>
                  <td className="whitespace-nowrap px-1 !py-2 text-right align-top">{money(item.unitPrice)}</td>
                  <td className="whitespace-nowrap pl-1 pr-2 !py-2 text-right align-top font-semibold">{money(item.total)}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto max-w-[240px] space-y-1.5 text-[11px] tabular-nums">
        <div className="flex justify-between gap-3 px-2"><dt>Total HT</dt><dd>{money(invoice.subtotal)}</dd></div>
        <div className="flex justify-between gap-3 px-2"><dt>TVA ({invoice.taxRate} %)</dt><dd>{money(invoice.taxAmount)}</dd></div>
        <div className="flex justify-between gap-3 rounded-md bg-slate-100 px-2 py-2 text-xs font-semibold">
          <dt>Net à payer</dt><dd>{money(invoice.total)}</dd>
        </div>
      </dl>

      {notice && <p className="break-words text-[11px] text-slate-600">{notice}</p>}
      {(company.iban || company.bic) && (
        <div className="space-y-0.5 break-words text-[11px] text-slate-600">
          <p className="mb-1 font-semibold uppercase tracking-wide text-slate-900">Règlement par virement</p>
          {company.iban && <p>IBAN · {company.iban}</p>}
          {company.bic && <p>BIC / SWIFT · {company.bic}</p>}
        </div>
      )}
      {invoice.notes && (
        <div className="space-y-1 break-words text-[11px] text-slate-600">
          <p className="font-semibold uppercase tracking-wide text-slate-900">Conditions et notes</p>
          <p className="whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}
    </article>
  );
}
