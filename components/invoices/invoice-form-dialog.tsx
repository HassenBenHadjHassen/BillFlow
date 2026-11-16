"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveInvoiceAction } from "@/actions/invoice.actions";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, roundMoney } from "@/lib/financial";
import { formatInvoiceNumber, INVOICE_TAX_RATE } from "@/lib/invoice";
import type { ClientDTO } from "@/types";
import { UploadCloud, FileText, Check, X, Clock3, FilePenLine, ArrowRight } from "lucide-react";

function localDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
interface InvoiceFormDialogProps { open: boolean; onOpenChange: (open: boolean) => void; clients?: ClientDTO[]; contracts?: any[]; preselectedClientId?: string; preselectedContractId?: string; onSuccess?: (invoice: any) => void; }

export function InvoiceFormDialog(props: InvoiceFormDialogProps) {
  return <Dialog open={props.open} onOpenChange={props.onOpenChange} className="max-w-[620px]">{props.open && <InvoiceFormDialogContent {...props} />}</Dialog>;
}

function InvoiceFormDialogContent({ onOpenChange, clients = [], contracts = [], preselectedClientId, preselectedContractId, onSuccess }: InvoiceFormDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const id = React.useId();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const initialContract = contracts.find((contract) => contract.id === preselectedContractId);
  const [clientId, setClientId] = React.useState(preselectedClientId || initialContract?.clientId || "");
  const [contractId, setContractId] = React.useState(preselectedContractId || "");
  const [numberOverride, setNumberOverride] = React.useState<string | null>(null);
  const [namingDate] = React.useState(() => new Date());
  const client = clients.find((item) => item.id === clientId);
  const invoiceNumber = numberOverride ?? (client ? formatInvoiceNumber(client.companyName, namingDate) : "");
  const [issueDate, setIssueDate] = React.useState(() => localDate(new Date()));
  const [dueDate, setDueDate] = React.useState(() => { const date = new Date(); date.setDate(date.getDate() + 30); return localDate(date); });
  const [currency, setCurrency] = React.useState(initialContract?.currency || "EUR");
  const [subtotal, setSubtotal] = React.useState<number | string>(initialContract?.amount ?? "");
  const total = subtotal === "" ? 0 : roundMoney(Number(subtotal) || 0);
  const [status, setStatus] = React.useState<"Paid" | "Sent" | "Draft">("Sent");
  const [paymentDate, setPaymentDate] = React.useState(() => localDate(new Date()));
  const [paymentMethod, setPaymentMethod] = React.useState("BankTransfer");
  const [notes, setNotes] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!clientId || !invoiceNumber.trim()) { setError("Choose a client and enter an invoice number."); return; }
    setIsLoading(true); setError(null);
    const data = new FormData();
    if (file) data.append("file", file);
    for (const [key, value] of Object.entries({ invoiceNumber: invoiceNumber.trim(), clientId, issueDate, dueDate, currency, subtotal: String(subtotal), taxRate: String(INVOICE_TAX_RATE), taxAmount: "0", total: String(total), status })) data.append(key, value);
    if (contractId) data.append("contractId", contractId);
    if (notes) data.append("notes", notes);
    if (status === "Paid") { data.append("paymentDate", paymentDate); data.append("paymentMethod", paymentMethod); }
    try {
      const result = await saveInvoiceAction(data);
      if (result.success && result.invoice) { toast({ title: "Invoice saved", description: `${result.invoice.invoiceNumber} is ready in your workspace.`, type: "success" }); onSuccess?.(result.invoice); onOpenChange(false); router.refresh(); }
      else setError(result.error || "Could not save this invoice.");
    } catch { setError("Could not save this invoice. Please try again."); }
    finally { setIsLoading(false); }
  }
  const paymentStates = [{ value: "Sent", label: "Awaiting payment", icon: Clock3 }, { value: "Paid", label: "Paid", icon: Check }, { value: "Draft", label: "Draft", icon: FilePenLine }] as const;
  return <>
    <DialogHeader><p className="bf-eyebrow mb-0">Billing</p><DialogTitle>Record existing invoice</DialogTitle><DialogDescription>Add an invoice and keep its details and payment in one place.</DialogDescription></DialogHeader>
    {error && <p role="alert" className="mb-5 rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs leading-relaxed text-rose-700">{error}</p>}
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="bf-field"><label className="bf-label" htmlFor={`${id}-client`}>Client <span className="text-slate-400">*</span></label><select id={`${id}-client`} required className="bf-select" value={clientId} onChange={(event) => { setClientId(event.target.value); setContractId(""); setNumberOverride(null); }}><option value="" disabled>Choose a client</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.companyName}</option>)}</select></div>
        <div className="bf-field"><label className="bf-label" htmlFor={`${id}-number`}>Invoice number <span className="text-slate-400">*</span></label><Input id={`${id}-number`} required placeholder="F20261103-ALIZEE" value={invoiceNumber} onChange={(event) => setNumberOverride(event.target.value)} className="font-mono text-xs" /></div>
      </div>
      <div className="bf-field"><label className="bf-label" htmlFor={`${id}-contract`}>Contract <span className="ml-1 text-xs font-normal text-slate-400">Optional</span></label><select id={`${id}-contract`} className="bf-select" value={contractId} onChange={(event) => { const value = event.target.value; setContractId(value); const contract = contracts.find((item) => item.id === value); if (contract) { setSubtotal(contract.amount); setCurrency(contract.currency || "EUR"); } }}><option value="">Standalone invoice</option>{contracts.filter((item) => item.clientId === clientId).map((item) => <option key={item.id} value={item.id}>{item.contractNumber} · {item.title}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-4"><div className="bf-field"><label className="bf-label" htmlFor={`${id}-issued`}>Issue date</label><Input id={`${id}-issued`} type="date" required value={issueDate} onChange={(event) => setIssueDate(event.target.value)} /></div><div className="bf-field"><label className="bf-label" htmlFor={`${id}-due`}>Due date</label><Input id={`${id}-due`} type="date" required value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div></div>
      <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-4"><div className="bf-field"><label className="bf-label" htmlFor={`${id}-amount`}>Amount <span className="text-slate-400">*</span></label><Input id={`${id}-amount`} type="number" min="0" step="0.01" required placeholder="0.00" value={subtotal} onChange={(event) => setSubtotal(event.target.value)} /></div><div className="bf-field"><label className="bf-label" htmlFor={`${id}-currency`}>Currency</label><select id={`${id}-currency`} className="bf-select" value={currency} onChange={(event) => setCurrency(event.target.value)}><option>EUR</option><option>USD</option><option>GBP</option></select></div></div>
      <div className="flex items-center justify-between rounded-xl border border-border bg-slate-50/70 px-4 py-4 dark:bg-slate-800/40"><div><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Invoice total</span><span className="ml-2 rounded border border-border bg-white px-1.5 py-0.5 text-[10px] text-slate-400 dark:bg-slate-900">0% VAT</span></div><output className="text-xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-white" aria-live="polite">{formatCurrency(total, currency)}</output></div>
      <fieldset><legend className="bf-label mb-2">Payment status</legend><div className="grid grid-cols-3 gap-2">{paymentStates.map(({ value, label, icon: Icon }) => <button type="button" key={value} aria-pressed={status === value} onClick={() => setStatus(value)} className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-[11px] font-medium transition-colors ${status === value ? "border-slate-800 bg-slate-50 text-slate-900 dark:border-slate-400 dark:bg-slate-800 dark:text-white" : "border-border text-slate-400 hover:border-slate-300 hover:text-slate-700"}`}><Icon className="hidden h-3.5 w-3.5 sm:block" />{label}</button>)}</div></fieldset>
      {status === "Paid" && <div className="grid grid-cols-1 gap-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 sm:grid-cols-2 dark:border-emerald-900 dark:bg-emerald-950/20"><div className="bf-field"><label className="bf-label" htmlFor={`${id}-paid`}>Payment received on</label><Input id={`${id}-paid`} type="date" required value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></div><div className="bf-field"><label className="bf-label" htmlFor={`${id}-method`}>Payment method</label><select id={`${id}-method`} className="bf-select" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="BankTransfer">Bank transfer</option><option value="Card">Card</option><option value="Cash">Cash</option><option value="PayPal">PayPal</option><option value="Other">Other</option></select></div></div>}
      <div className="bf-field"><label className="bf-label" htmlFor={`${id}-file`}>Invoice PDF <span className="ml-1 text-xs font-normal text-slate-400">Optional</span></label>{file ? <div className="flex items-center gap-3 rounded-xl border border-border p-3.5"><FileText className="h-5 w-5 shrink-0 text-slate-400" /><span className="min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-200">{file.name}</span><button type="button" onClick={() => setFile(null)} className="bf-icon-button h-7 w-7" aria-label="Remove attachment"><X className="h-4 w-4" /></button></div> : <label htmlFor={`${id}-file`} className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-ring dark:border-slate-700 dark:bg-slate-900"><span className="bf-avatar h-9 w-9 rounded-lg"><UploadCloud className="h-4 w-4" /></span><span><span className="block text-xs font-medium text-slate-600 dark:text-slate-300">Click to upload your invoice</span><span className="mt-1 block text-[11px] text-slate-400">PDF, up to 25 MB</span></span><input id={`${id}-file`} type="file" className="sr-only" accept="application/pdf,.pdf" onChange={(event) => { const selected = event.target.files?.[0]; if (!selected) return; if (selected.size > 25 * 1024 * 1024) { setError("Choose a PDF smaller than 25 MB."); return; } if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) { setError("Choose a PDF file."); return; } setError(null); setFile(selected); }} /></label>}</div>
      <div className="bf-field"><label className="bf-label" htmlFor={`${id}-notes`}>Notes <span className="ml-1 text-xs font-normal text-slate-400">Optional</span></label><Input id={`${id}-notes`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything you’d like to remember about this invoice" /></div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" isLoading={isLoading}>Save invoice <ArrowRight className="h-3.5 w-3.5" /></Button></DialogFooter>
    </form>
  </>;
}
