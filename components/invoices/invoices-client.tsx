"use client";

import * as React from "react";
import Link from "next/link";
import { Receipt, Plus, Search, ArrowUpRight, FileText, Download, Check, Clock3, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InvoiceFormDialog } from "@/components/invoices/invoice-form-dialog";
import { formatCurrency } from "@/lib/financial";
import { format } from "date-fns";
import type { ClientDTO } from "@/types";
import type { InvoiceService } from "@/services/invoice.service";

type InvoiceRow = Awaited<ReturnType<typeof InvoiceService.getInvoices>>[number];
const filters = [{ label: "All invoices", value: "ALL" }, { label: "Paid", value: "Paid" }, { label: "Awaiting payment", value: "Sent" }, { label: "Partially paid", value: "PartiallyPaid" }, { label: "Overdue", value: "Overdue" }, { label: "Draft", value: "Draft" }];
const statusStyles = { Paid: { label: "Paid", variant: "success" }, Sent: { label: "Awaiting payment", variant: "indigo" }, PartiallyPaid: { label: "Partially paid", variant: "warning" }, Overdue: { label: "Overdue", variant: "destructive" }, Draft: { label: "Draft", variant: "secondary" }, Cancelled: { label: "Cancelled", variant: "secondary" } } as const;
function invoiceStatus(invoice: InvoiceRow) { return invoice.computedStatus || invoice.status; }

export function InvoicesClient({ initialInvoices, clients = [], contracts = [] }: { initialInvoices: InvoiceRow[]; clients?: ClientDTO[]; contracts?: any[] }) {
  const [invoices, setInvoices] = React.useState(initialInvoices);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  React.useEffect(() => { setInvoices(initialInvoices); }, [initialInvoices]);
  const counts = invoices.reduce<Record<string, number>>((result, invoice) => { const status = invoiceStatus(invoice); result[status] = (result[status] || 0) + 1; return result; }, {});
  const filtered = invoices.filter((invoice) => {
    const query = search.trim().toLowerCase();
    return (statusFilter === "ALL" || invoiceStatus(invoice) === statusFilter) && (!query || invoice.invoiceNumber.toLowerCase().includes(query) || invoice.client.companyName.toLowerCase().includes(query) || invoice.contract?.title.toLowerCase().includes(query));
  });
  const summaries = [
    { label: "Total invoices", value: invoices.length, icon: Receipt, color: "text-slate-500" },
    { label: "Paid", value: counts.Paid || 0, icon: Check, color: "text-emerald-600" },
    { label: "Awaiting payment", value: (counts.Sent || 0) + (counts.PartiallyPaid || 0), icon: Clock3, color: "text-blue-600" },
    { label: "Overdue", value: counts.Overdue || 0, icon: AlertCircle, color: "text-rose-500" },
  ];
  return <div className="bf-page">
    <div className="bf-page-header"><div><p className="bf-eyebrow">Billing</p><h1 className="bf-title">Invoices</h1><p className="bf-subtitle">Every invoice, payment and due date. All in one place.</p></div><div className="flex flex-wrap items-center gap-2"><Link href="/invoices/new"><Button variant="outline">Detailed entry <ArrowUpRight className="h-3.5 w-3.5" /></Button></Link><Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" />New invoice</Button></div></div>
    <section aria-label="Invoice summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">{summaries.map(({ label, value, icon: Icon, color }) => <Card key={label} className="flex items-center gap-3.5 p-4 sm:p-5"><span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 ${color}`}><Icon className="h-[18px] w-[18px]" strokeWidth={1.7} /></span><div><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 text-[23px] font-semibold leading-none tracking-tight tabular-nums text-slate-900 dark:text-white">{value}</p></div></Card>)}</section>
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6"><div><h2 className="text-sm font-semibold text-slate-800 dark:text-white">Invoice history</h2><p className="mt-1 text-[11px] text-slate-400">Manage and track your billing records</p></div><div className="flex items-center gap-2"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input type="search" aria-label="Search invoices" placeholder="Search invoices…" value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 w-[160px] rounded-lg border border-border bg-white pl-9 pr-3 text-xs outline-none placeholder:text-slate-400 focus:border-slate-400 sm:w-[210px] dark:bg-slate-900" /></div><a href="/api/reports/csv" className="bf-icon-button border border-border" aria-label="Export all invoices as CSV" title="Export all invoices as CSV"><Download className="h-4 w-4" /></a></div></div>
      <div className="flex gap-5 overflow-x-auto border-b border-border px-5 sm:px-6" aria-label="Filter invoices by status">{filters.map((filter) => { const selected = statusFilter === filter.value; return <button key={filter.value} type="button" aria-pressed={selected} onClick={() => setStatusFilter(filter.value)} className={`flex shrink-0 items-center gap-2 border-b-2 py-3.5 text-xs font-medium transition-colors ${selected ? "border-slate-800 text-slate-900 dark:border-slate-200 dark:text-white" : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>{filter.label}<span className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${selected ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "text-slate-400"}`}>{filter.value === "ALL" ? invoices.length : counts[filter.value] || 0}</span></button>; })}</div>
      {filtered.length === 0 ? <div className="flex flex-col items-center px-6 py-20 text-center"><span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-slate-50 dark:bg-slate-800"><Receipt className="h-6 w-6 text-slate-400" strokeWidth={1.4} /></span><h3 className="text-base font-medium text-slate-800 dark:text-white">{search || statusFilter !== "ALL" ? "No matching invoices" : "Your first invoice starts here"}</h3><p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">{search || statusFilter !== "ALL" ? "Try another search or choose a different status." : "Add an invoice to keep your billing and payments organized."}</p>{search || statusFilter !== "ALL" ? <Button variant="outline" className="mt-6" onClick={() => { setSearch(""); setStatusFilter("ALL"); }}>Clear filters</Button> : <Button className="mt-6" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" />New invoice</Button>}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50/70 dark:bg-slate-800/40"><tr><th className="px-6">Invoice</th><th className="px-5">Client</th><th className="px-5">Due date</th><th className="px-5 text-right">Amount</th><th className="px-5">Status</th><th className="px-5"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-border">{filtered.map((invoice) => {
        const status = invoiceStatus(invoice); const appearance = statusStyles[status as keyof typeof statusStyles] || statusStyles.Draft;
        const initials = invoice.client.companyName.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
        return <tr key={invoice.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"><td className="px-6"><div className="flex items-center gap-3"><span className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-slate-400"><FileText className="h-[17px] w-[17px]" strokeWidth={1.5} /></span><div><Link href={`/invoices/${invoice.id}`} className="font-medium text-slate-800 hover:underline dark:text-white">{invoice.invoiceNumber}</Link><p className="mt-1 text-[11px] text-slate-400">Issued {format(new Date(invoice.issueDate), "dd MMM yyyy")}</p></div></div></td><td className="px-5"><div className="flex items-center gap-2.5"><span className="bf-avatar h-7 w-7 text-[9px]">{initials}</span><div><Link href={`/clients/${invoice.clientId}`} className="whitespace-nowrap text-xs font-medium text-slate-700 hover:underline dark:text-slate-200">{invoice.client.companyName}</Link>{invoice.contract && <Link href={`/contracts/${invoice.contract.id}`} className="mt-1 block max-w-[165px] truncate text-[10px] text-slate-400 hover:text-slate-600">{invoice.contract.title}</Link>}</div></div></td><td className={`whitespace-nowrap px-5 text-xs ${status === "Overdue" ? "text-rose-600" : "text-slate-500"}`}>{format(new Date(invoice.dueDate), "dd MMM yyyy")}</td><td className="whitespace-nowrap px-5 text-right"><p className="text-[13px] font-medium tabular-nums text-slate-800 dark:text-white">{formatCurrency(invoice.total, invoice.currency)}</p><p className="mt-1 text-[10px] tabular-nums text-slate-400">{formatCurrency(invoice.amountPaid, invoice.currency)} paid</p></td><td className="px-5"><Badge variant={appearance.variant}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />{appearance.label}</Badge></td><td className="px-5"><div className="flex items-center justify-end gap-1">{invoice.pdfUrl && <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer" className="bf-icon-button" aria-label={`View PDF for ${invoice.invoiceNumber}`}><FileText className="h-4 w-4" /></a>}<Link href={`/invoices/${invoice.id}`} className="bf-icon-button" aria-label={`View ${invoice.invoiceNumber}`}><ArrowRight className="h-4 w-4" /></Link></div></td></tr>;
      })}</tbody></table></div>}
      <div className="border-t border-border px-6 py-4 text-[11px] text-slate-400" aria-live="polite">Showing {filtered.length} of {invoices.length} invoices</div>
    </Card>
    <InvoiceFormDialog open={dialogOpen} onOpenChange={setDialogOpen} clients={clients} contracts={contracts} onSuccess={(invoice) => setInvoices((current) => [invoice, ...current.filter((item) => item.id !== invoice.id)])} />
  </div>;
}
