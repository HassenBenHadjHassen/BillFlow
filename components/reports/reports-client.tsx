"use client";

import * as React from "react";
import { BarChart3, Download, Calendar, TrendingUp, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/financial";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function ReportsClient({ initialData }: { initialData: any }) {
  const { balances, contracted, revenueByMonth, revenueByYear, revenueByClient } = initialData;

  const handleExportCsv = () => {
    window.location.href = "/api/reports/csv";
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Financial Reports &amp; Statements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real database audit queries, monthly/annual revenue aggregations, and CSV bookkeeping export.
          </p>
        </div>

        <Button onClick={handleExportCsv} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
          <Download className="h-4 w-4" />
          <span>Export Invoices CSV</span>
        </Button>
      </div>

      {/* 5 Financial Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(balances.totalInvoiced)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Gross billing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collected</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(balances.totalPaid)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Settled payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Balance</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(balances.outstanding)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Pending payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contracted MRR</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(contracted.monthly)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Normalized Monthly Revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contracted ARR</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(contracted.yearly)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Annualized run-rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Month Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Collections by Month</CardTitle>
          <CardDescription>Actual cash receipts grouped by calendar month</CardDescription>
        </CardHeader>
        <CardContent>
          {revenueByMonth.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No revenue recorded yet
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(val) => `€${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-md text-xs">
                            <span className="font-semibold text-slate-900 dark:text-white">{label}: </span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(Number(payload[0]?.value) || 0)}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two Columns: Revenue by Year & Revenue by Client */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Year */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Revenue by Year</CardTitle>
            <CardDescription>Annual comparison of collected payments</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueByYear.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No annual data yet</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {revenueByYear.map((item: any) => (
                  <div key={item.year} className="py-3 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">{item.year}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Client Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Client Revenue &amp; Balances</CardTitle>
            <CardDescription>Total billed, paid, and outstanding by client</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueByClient.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No clients billed yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-2">Client</th>
                      <th className="py-2 text-right">Invoiced</th>
                      <th className="py-2 text-right">Collected</th>
                      <th className="py-2 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {revenueByClient.map((c: any) => (
                      <tr key={c.clientName}>
                        <td className="py-2.5 font-semibold text-slate-900 dark:text-white">{c.clientName}</td>
                        <td className="py-2.5 text-right font-medium text-slate-600 dark:text-slate-400">
                          {formatCurrency(c.totalInvoiced)}
                        </td>
                        <td className="py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(c.totalPaid)}
                        </td>
                        <td className="py-2.5 text-right font-bold">
                          <span className={c.outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}>
                            {formatCurrency(c.outstanding)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
