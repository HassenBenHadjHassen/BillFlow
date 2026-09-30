"use client";

import * as React from "react";
import Link from "next/link";
import { Receipt, Plus, Search, Filter, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InvoiceFormDialog } from "@/components/invoices/invoice-form-dialog";
import { formatCurrency } from "@/lib/financial";
import { format } from "date-fns";
import { ClientDTO } from "@/types";

export function InvoicesClient({
  initialInvoices,
  clients = [],
  contracts = [],
}: {
  initialInvoices: any[];
  clients?: ClientDTO[];
  contracts?: any[];
}) {
  const [invoices, setInvoices] = React.useState<any[]>(initialInvoices);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Keep state synchronized with server revalidation
  React.useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.client?.companyName?.toLowerCase().includes(q) ||
      (inv.contract && inv.contract.title?.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === "ALL" ||
      inv.status === statusFilter ||
      inv.computedStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge variant="success">Paid</Badge>;
      case "Sent":
        return <Badge variant="indigo">Sent</Badge>;
      case "PartiallyPaid":
        return <Badge variant="warning">Partially Paid</Badge>;
      case "Overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "Cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Invoices ({invoices.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage billing records, sequential invoices, payment tracking, and PDF documents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setDialogOpen(true)}
            className="gap-2 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="h-4 w-4" />
            <span>Record Invoice</span>
          </Button>
          <Link href="/invoices/new">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex text-xs">
              Full Page
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice #, client, or contract..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 shadow-xs"
          />
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { label: "All", value: "ALL" },
            { label: "Paid", value: "Paid" },
            { label: "Sent / Pending", value: "Sent" },
            { label: "Partially Paid", value: "PartiallyPaid" },
            { label: "Overdue", value: "Overdue" },
            { label: "Draft", value: "Draft" },
          ].map((pill) => (
            <button
              key={pill.value}
              onClick={() => setStatusFilter(pill.value)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === pill.value
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Receipt className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">No invoices found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search || statusFilter !== "ALL"
              ? "Try adjusting your search criteria or status filter."
              : "Record your first client invoice or upload a signed PDF to begin tracking billing."}
          </p>
          {!search && statusFilter === "ALL" && (
            <Button onClick={() => setDialogOpen(true)} className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Record Invoice</span>
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Contract</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">PDF</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                      <Link href={`/invoices/${inv.id}`} className="hover:text-indigo-600">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {inv.client ? (
                        <Link href={`/clients/${inv.client.id}`} className="hover:text-indigo-600 hover:underline">
                          {inv.client.companyName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {inv.contract ? (
                        <Link href={`/contracts/${inv.contract.id}`} className="hover:text-indigo-600 hover:underline truncate max-w-[150px] block">
                          {inv.contract.title}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {format(new Date(inv.issueDate), "dd MMM yyyy")}
                    </td>
                    <td className="py-3 px-4">
                      {format(new Date(inv.dueDate), "dd MMM yyyy")}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(inv.total, inv.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(inv.amountPaid ?? (inv.status === "Paid" ? inv.total : 0), inv.currency)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(inv.computedStatus || inv.status)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {inv.pdfUrl ? (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                          title="View PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/invoices/${inv.id}`}>
                        <Button size="sm" variant="ghost" className="gap-1 text-xs">
                          <span>View</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Instant Record Invoice Dialog */}
      <InvoiceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clients={clients}
        contracts={contracts}
        onSuccess={(newInv) => {
          setInvoices((prev) => [newInv, ...prev.filter((i) => i.id !== newInv.id)]);
        }}
      />
    </div>
  );
}
