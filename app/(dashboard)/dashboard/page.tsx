import Link from "next/link";
import { DashboardService } from "@/services/dashboard.service";
import { formatCurrency } from "@/lib/financial";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatusDonutChart } from "@/components/dashboard/status-donut-chart";
import { UpcomingEventsList } from "@/components/dashboard/upcoming-events-list";
import {
  TrendingUp,
  Receipt,
  FileCheck,
  AlertTriangle,
  Clock,
  Plus,
  ArrowUpRight,
  Sparkles,
  CalendarSync,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await DashboardService.getDashboardData();
  const { metrics, monthlyTrend, statusBreakdown, revenueByClient, upcomingEvents } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Operations Dashboard
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              Live
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time financial status, contracted revenue, and billing operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/invoices/new">
            <Button size="sm" className="gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>Create Invoice</span>
            </Button>
          </Link>
          <Link href="/recurring">
            <Button size="sm" variant="outline" className="gap-1.5">
              <CalendarSync className="h-4 w-4 text-indigo-500" />
              <span>Recurring Billing</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Metric 1: Revenue This Month */}
        <Card className="hover:border-indigo-300 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue (Month)</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(metrics.revenueThisMonth)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Paid this calendar month</p>
          </CardContent>
        </Card>

        {/* Metric 2: Revenue This Year */}
        <Card className="hover:border-indigo-300 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue (Year)</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
              <Sparkles className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(metrics.revenueThisYear)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Total collected YTD</p>
          </CardContent>
        </Card>

        {/* Metric 3: Outstanding */}
        <Card className="hover:border-indigo-300 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(metrics.outstandingRevenue)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Unpaid sent invoices</p>
          </CardContent>
        </Card>

        {/* Metric 4: Overdue */}
        <Card className="hover:border-rose-300 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(metrics.overdueRevenue)}
            </div>
            <p className="text-[11px] text-rose-500/90 mt-1">
              {metrics.overdueCount} overdue invoice{metrics.overdueCount === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        {/* Metric 5: Active Contracts */}
        <Card className="hover:border-indigo-300 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Contracts</span>
            <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600">
              <FileCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {metrics.activeContractsCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Current signed clients</p>
          </CardContent>
        </Card>

        {/* Metric 6: Monthly Contracted Revenue (MRR) */}
        <Card className="hover:border-indigo-300 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contracted MRR</span>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(metrics.monthlyContractedRevenue)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Normalized monthly run-rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section: 12-Month Revenue & Status Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revenue & Invoicing Trend</CardTitle>
                <CardDescription>Collected payments vs total invoiced over the past 12 months</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> Collected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Invoiced
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={monthlyTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Status</CardTitle>
            <CardDescription>Breakdown across all active invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDonutChart data={statusBreakdown} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Upcoming Events & Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines & Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Deadlines & Events</CardTitle>
              <CardDescription>Invoices due, recurring runs, and expiring contracts</CardDescription>
            </div>
            <Link href="/recurring" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <UpcomingEventsList events={upcomingEvents} />
          </CardContent>
        </Card>

        {/* Top Clients by Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue by Client</CardTitle>
              <CardDescription>Top revenue contributors</CardDescription>
            </div>
            <Link href="/clients" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              All clients <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {revenueByClient.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No client revenue recorded yet</div>
            ) : (
              <div className="space-y-4">
                {revenueByClient.map((c, index) => {
                  const maxRev = revenueByClient[0]?.revenue || 1;
                  const pct = Math.min(100, Math.round((c.revenue / maxRev) * 100));

                  return (
                    <div key={c.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="text-slate-400 font-normal">#{index + 1}</span>
                          {c.name}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(c.revenue)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
