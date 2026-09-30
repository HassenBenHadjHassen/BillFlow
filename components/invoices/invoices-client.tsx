"use client";

import * as React from "react";
import Link from "next/link";
import { Receipt, Plus, Search, Filter, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/financial";
import { format } from "date-fns";

export function InvoicesClient({ initialInvoices }: { initialInvoices: any[] }) {
  const [invoices] = React.useState<any[]>(initialInvoices);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.client.companyName.toLowerCase().includes(q) ||
      (inv.contract && inv.contract.title.toLowerCase().includes(q));

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

        <Link href="/invoices/new">
          <Button className="gap-2 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="h-4 w-4" />
            <span>Record Invoice</span>
          </Button>
        </Link>
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

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { label: "All", value: "ALL" },
            { label: "Paid", value: "Paid" },
            { label: "Sent", value: "Sent" },
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

      {/* Invoices List / Table */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No invoices found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {search ? "No invoices match your filter criteria." : "Create your first invoice to bill a client."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Paid / Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/invoices/${inv.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                          {inv.invoiceNumber}
                        </Link>
                        {inv.pdfUrl && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800" title="PDF Document Attached">
                            PDF
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{inv.client.companyName}</div>
                      {inv.contract && (
                        <div className="text-xs text-slate-400 truncate max-w-xs">{inv.contract.title}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      <div>Issued: {format(new Date(inv.issueDate), "dd/MM/yyyy")}</div>
                      <div className="text-xs">Due: {format(new Date(inv.dueDate), "dd/MM/yyyy")}</div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {formatCurrency(inv.total, inv.currency)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Paid: {formatCurrency(inv.amountPaid || 0, inv.currency)}
                      </div>
                      {inv.remainingBalance > 0 && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                          Due: {formatCurrency(inv.remainingBalance, inv.currency)}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(inv.computedStatus || inv.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
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
    </div>
  );
}
