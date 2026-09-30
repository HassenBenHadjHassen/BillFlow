"use client";

import * as React from "react";
import Link from "next/link";
import { CreditCard, Search, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/financial";
import { format } from "date-fns";

export function PaymentsClient({ payments }: { payments: any[] }) {
  const [search, setSearch] = React.useState("");

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.invoice.invoiceNumber.toLowerCase().includes(q) ||
      p.invoice.client.companyName.toLowerCase().includes(q) ||
      p.paymentMethod.toLowerCase().includes(q) ||
      (p.reference && p.reference.toLowerCase().includes(q))
    );
  });

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Payments Ledger ({payments.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Audit log of all client remittances, bank wires, and card settlements.
          </p>
        </div>

        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-right">
          <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">
            Lifetime Collections
          </span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalCollected)}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter by invoice #, client, reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 shadow-xs"
        />
      </div>

      {/* Payments Table */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No payments recorded</h3>
          <p className="text-xs text-slate-500 mt-1">
            Payments are recorded against specific invoices from the invoice view.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4 text-right">Invoice Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      {format(new Date(p.paymentDate), "dd MMM yyyy")}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      +{formatCurrency(p.amount, p.invoice.currency)}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <Link href={`/clients/${p.invoice.clientId}`} className="hover:underline">
                        {p.invoice.client.companyName}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {p.invoice.invoiceNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-[10px]">
                        {p.paymentMethod}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-xs">
                      {p.reference || "—"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/invoices/${p.invoiceId}`}>
                        <Button size="sm" variant="ghost" className="gap-1 text-xs">
                          <span>Invoice</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
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
