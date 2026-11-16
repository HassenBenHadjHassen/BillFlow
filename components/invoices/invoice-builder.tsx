"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, format, parseISO } from "date-fns";
import { ArrowLeft, Eye, Plus, Trash2 } from "lucide-react";
import { createInvoiceAction } from "@/actions/invoice.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { calculateInvoiceTotals, calculateItemTotal, formatCurrency } from "@/lib/financial";
import { formatInvoiceNumber, INVOICE_TAX_RATE, type INVOICE_VAT_NOTICES, type InvoiceParty } from "@/lib/invoice";
import type { CompanySettingsDTO } from "@/types";
import { InvoicePreview } from "./invoice-preview";

type ClientChoice = InvoiceParty & { id: string };
type ContractChoice = {
  id: string;
  clientId: string;
  title: string;
  contractNumber: string;
  currency: string;
  paymentTerms: number;
  amount: number;
};
type Line = { id: number; description: string; quantity: string; unitPrice: string };
type VatNotice = "" | keyof typeof INVOICE_VAT_NOTICES;
const templates = ["Consulting", "Development", "Maintenance"];
const dateInput = (date: Date) => format(date, "yyyy-MM-dd");
const blankLine: Omit<Line, "id"> = { description: "", quantity: "1", unitPrice: "" };

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="bf-field min-w-0">
    <label htmlFor={id} className="bf-label">{label}</label>
    {children}
  </div>;
}

export function InvoiceBuilder({
  clients, contracts, company, today, importHref, initialClientId, initialContractId, initialAmount, initialPeriodStart, initialPeriodEnd,
}: {
  clients: ClientChoice[];
  contracts: ContractChoice[];
  company: CompanySettingsDTO;
  today: string;
  importHref: string;
  initialClientId?: string;
  initialContractId?: string;
  initialAmount?: number;
  initialPeriodStart?: string;
  initialPeriodEnd?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const nextLine = useRef(1);
  const submitting = useRef(false);
  const initialContract = contracts.find((contract) => (
    contract.id === initialContractId && clients.some((client) => client.id === contract.clientId)
    && (!initialClientId || contract.clientId === initialClientId)
  ));

  const [clientId, setClientId] = useState(initialContract?.clientId ?? clients.find((client) => client.id === initialClientId)?.id ?? "");
  const [contractId, setContractId] = useState(initialContract?.id ?? "");
  const [numberOverride, setNumberOverride] = useState<string | null>(null);
  const [issueDate, setIssueDate] = useState(today);
  const [dueDateOverride, setDueDateOverride] = useState<string | null>(null);
  const [currencyOverride, setCurrencyOverride] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState(initialPeriodStart ?? "");
  const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd ?? "");
  const [notes, setNotes] = useState(company.invoiceNotes ?? "");
  const [showUnitPrice, setShowUnitPrice] = useState(true);
  const [vatNotice, setVatNotice] = useState<VatNotice>("");
  const [lines, setLines] = useState<Line[]>(() => [{
    ...blankLine,
    id: 0,
    description: initialContract?.title ?? "",
    unitPrice: String(initialAmount ?? initialContract?.amount ?? ""),
  }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "invoice" | null>(null);

  const client = clients.find((entry) => entry.id === clientId);
  const clientContracts = contracts.filter((entry) => entry.clientId === clientId);
  const contract = clientContracts.find((entry) => entry.id === contractId);
  const invoiceNumber = numberOverride ?? (client ? formatInvoiceNumber(client.companyName, parseISO(today)) : "");
  const terms = contract?.paymentTerms ?? company.defaultPaymentTerms;
  const dueDate = dueDateOverride ?? (issueDate ? dateInput(addDays(parseISO(issueDate), terms)) : "");
  const currency = currencyOverride ?? contract?.currency ?? company.defaultCurrency;
  const currencies = Array.from(new Set([currency, "EUR", "USD", "GBP", company.defaultCurrency]));
  const items = lines.map((line) => ({
    description: line.description.trim(),
    quantity: Number(line.quantity),
    unitPrice: Number(line.unitPrice),
    taxRate: INVOICE_TAX_RATE,
    total: calculateItemTotal(Number(line.quantity), Number(line.unitPrice)),
  }));
  const totals = calculateInvoiceTotals(items);

  function addLine(description = "") {
    const id = nextLine.current++;
    setLines((current) => [...current, { ...blankLine, id, description }]);
  }

  function addTemplate(description: string) {
    if (lines.length === 1 && !lines[0].description) {
      setLines([{ ...lines[0], description }]);
    } else {
      addLine(description);
    }
  }

  function updateLine(id: number, change: Partial<Omit<Line, "id">>) {
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...change } : line));
  }

  function changeContract(value: string) {
    setContractId(value);
    setCurrencyOverride(null);
    setDueDateOverride(null);
    const next = clientContracts.find((entry) => entry.id === value);
    const useContractLine = lines.length === 1 && (
      (!lines[0].description && !lines[0].unitPrice)
      || (contract && lines[0].description === contract.title && lines[0].quantity === "1" && Number(lines[0].unitPrice) === contract.amount)
    );
    if (useContractLine) {
      setLines([{ ...blankLine, id: lines[0].id, description: next?.title ?? "", unitPrice: String(next?.amount ?? "") }]);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const draft = submitter?.getAttribute("value") === "draft";
    submitting.current = true;
    setSaving(draft ? "draft" : "invoice");
    setError(null);
    try {
      const result = await createInvoiceAction({
        clientId,
        contractId: contract?.id,
        invoiceNumber: numberOverride ?? undefined,
        issueDate,
        dueDate,
        currency,
        notes,
        showUnitPrice,
        vatNotice: vatNotice || undefined,
        billingPeriodStart: periodStart || undefined,
        billingPeriodEnd: periodEnd || undefined,
        items,
      }, { autoSend: !draft });
      if (!result.success || !result.invoice) {
        setError(result.error || "Could not save this invoice.");
        return;
      }
      toast({ title: draft ? "Draft saved" : "Invoice created", description: result.invoice.invoiceNumber, type: "success" });
      router.push("/invoices/" + result.invoice.id);
    } catch {
      setError("Could not save this invoice. Please try again.");
    } finally {
      submitting.current = false;
      setSaving(null);
    }
  }

  return (
    <form onSubmit={submit} className="bf-page">
      <header className="bf-page-header">
        <div>
          <Link href="/invoices" className="bf-link mb-3"><ArrowLeft className="h-3.5 w-3.5" /> Invoices</Link>
          <h1 className="bf-title">New invoice</h1>
          <p className="bf-subtitle">Choose a client, add your services, and preview the invoice before saving.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" value="draft" variant="outline" disabled={!clients.length || saving !== null} isLoading={saving === "draft"}>Save as draft</Button>
          <Button type="submit" value="invoice" disabled={!clients.length || saving !== null} isLoading={saving === "invoice"}>Save invoice</Button>
        </div>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</p>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <fieldset disabled={saving !== null} className="min-w-0 space-y-5">
          <legend className="sr-only">Invoice editor</legend>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Invoice details</CardTitle>
                <Link href={importHref} className="bf-link">Record an existing invoice</Link>
              </div>
              <CardDescription>Use a client from your directory and optionally link a contract.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!clients.length && <p className="text-sm text-slate-500">Add a client in the <Link href="/clients" className="font-medium underline">client directory</Link> to create an invoice.</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="invoice-client" label="Client">
                  <select id="invoice-client" required className="bf-select" value={clientId} onChange={(event) => {
                    changeContract("");
                    setClientId(event.target.value);
                    setNumberOverride(null);
                  }}>
                    <option value="">Choose a client</option>
                    {clients.map((entry) => <option key={entry.id} value={entry.id}>{entry.companyName}</option>)}
                  </select>
                </Field>
                <Field id="invoice-contract" label="Contract (optional)">
                  <select id="invoice-contract" className="bf-select" value={contract?.id ?? ""} disabled={!clientContracts.length} onChange={(event) => changeContract(event.target.value)}>
                    <option value="">Standalone invoice</option>
                    {clientContracts.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
                  </select>
                </Field>
                <Field id="invoice-number" label="Invoice number">
                  <Input id="invoice-number" required maxLength={100} value={invoiceNumber} className="font-mono text-xs" onChange={(event) => setNumberOverride(event.target.value)} />
                  {numberOverride !== null
                    ? <button className="bf-link" type="button" onClick={() => setNumberOverride(null)}>Use automatic number</button>
                    : <p className="text-[11px] text-slate-500">A suffix is added if this number is already in use.</p>}
                </Field>
                <Field id="invoice-currency" label="Currency">
                  <select id="invoice-currency" className="bf-select" value={currency} onChange={(event) => setCurrencyOverride(event.target.value)}>
                    {currencies.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </Field>
                <Field id="invoice-issue" label="Issue date">
                  <Input id="invoice-issue" type="date" required value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
                </Field>
                <Field id="invoice-due" label="Due date">
                  <Input id="invoice-due" type="date" required min={issueDate} value={dueDate} onChange={(event) => setDueDateOverride(event.target.value || null)} />
                </Field>
              </div>
              <details className="text-xs text-slate-600 dark:text-slate-300" open={initialPeriodStart || initialPeriodEnd ? true : undefined}>
                <summary className="cursor-pointer font-medium">Billing period (optional)</summary>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <Field id="invoice-period-start" label="Period start">
                    <Input id="invoice-period-start" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
                  </Field>
                  <Field id="invoice-period-end" label="Period end">
                    <Input id="invoice-period-end" type="date" min={periodStart || undefined} value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
                  </Field>
                </div>
              </details>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Line items</CardTitle>
              <CardDescription>Add the services or products you’re billing for.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {templates.map((name) => (
                  <Button key={name} type="button" size="sm" variant="secondary" disabled={lines.length >= 100} onClick={() => addTemplate(name)}>
                    <Plus className="h-3.5 w-3.5" />{name}
                  </Button>
                ))}
              </div>
              {lines.map((line, index) => (
                <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] items-end gap-3 rounded-lg border border-border p-3">
                  <div className="col-span-2">
                    <Field id={"line-" + line.id + "-description"} label={"Description " + (index + 1)}>
                      <textarea id={"line-" + line.id + "-description"} required maxLength={2000} rows={2} value={line.description} placeholder="e.g. Website maintenance" onChange={(event) => updateLine(line.id, { description: event.target.value })} className="w-full resize-y border bg-card px-3 py-2 text-sm" />
                    </Field>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="self-start" disabled={lines.length === 1} aria-label={"Remove item " + (index + 1)} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Field id={"line-" + line.id + "-quantity"} label="Quantity">
                    <Input id={"line-" + line.id + "-quantity"} type="number" required min="0.01" step="any" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} />
                  </Field>
                  <Field id={"line-" + line.id + "-price"} label="Unit price">
                    <Input id={"line-" + line.id + "-price"} type="number" required min="0" step="any" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} />
                  </Field>
                  <p className="min-w-0 self-center break-all text-right text-xs font-semibold tabular-nums">{formatCurrency(items[index].total, currency)}</p>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" disabled={lines.length >= 100} onClick={() => addLine()}>
                <Plus className="h-4 w-4" />Add line item
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PDF options</CardTitle>
              <CardDescription>Set what appears on the invoice you share with your client.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showUnitPrice} onChange={(event) => setShowUnitPrice(event.target.checked)} />
                Show unit prices and line totals
              </label>
              <Field id="invoice-vat-note" label="VAT notice (optional)">
                <select id="invoice-vat-note" className="bf-select" value={vatNotice} onChange={(event) => setVatNotice(event.target.value as VatNotice)}>
                  <option value="">No notice</option>
                  <option value="exemption">French VAT exemption (Article 293 B)</option>
                  <option value="cibsExemption">French VAT exemption (Article L. 223-3 CIBS)</option>
                  <option value="reverseCharge">EU reverse charge (Article 196)</option>
                </select>
              </Field>
              <Field id="invoice-notes" label="Payment terms and notes">
                <textarea id="invoice-notes" rows={3} maxLength={5000} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full border bg-card px-3 py-2 text-sm" />
              </Field>
              <p className="text-xs text-slate-500">Issuer and bank details come from <Link href="/settings" className="font-medium underline">Company Settings</Link>.</p>
            </CardContent>
          </Card>
        </fieldset>

        <aside className="min-w-0 rounded-xl border border-border bg-muted p-3 sm:p-4 xl:sticky xl:top-0" aria-labelledby="invoice-preview-heading">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h2 id="invoice-preview-heading" className="flex items-center gap-2 text-sm font-semibold"><Eye className="h-4 w-4" /> Live preview</h2>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">PDF · French</span>
          </div>
          <InvoicePreview
            company={company}
            client={client}
            contract={contract}
            invoice={{ invoiceNumber, issueDate, dueDate, currency, taxRate: INVOICE_TAX_RATE, notes: notes.trim(), showUnitPrice, vatNotice, billingPeriodStart: periodStart, billingPeriodEnd: periodEnd, ...totals }}
            items={items}
          />
        </aside>
      </div>
    </form>
  );
}
