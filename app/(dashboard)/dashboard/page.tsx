import Link from "next/link";
import { format } from "date-fns";
import { DashboardService } from "@/services/dashboard.service";
import { formatCurrency } from "@/lib/financial";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatusDonutChart } from "@/components/dashboard/status-donut-chart";
import { UpcomingEventsList } from "@/components/dashboard/upcoming-events-list";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Clock3, Plus, Repeat2, type LucideIcon } from "lucide-react";

export const dynamic = "force-dynamic";

function MetricCard({ label, value, note, icon: Icon, emphasis = false }: { label: string; value: string; note: string; icon: LucideIcon; emphasis?: boolean }) {
  return <Card className={emphasis ? "border-slate-900 bg-slate-900 text-white dark:border-slate-700 dark:bg-slate-800" : ""}>
    <div className="p-5 sm:p-6"><div className="flex items-center justify-between gap-2"><p className={emphasis ? "text-xs text-slate-300" : "text-xs text-slate-500"}>{label}</p><Icon className={emphasis ? "h-4 w-4 text-slate-400" : "h-4 w-4 text-slate-400"} strokeWidth={1.6} /></div><p className="mt-5 whitespace-nowrap text-[27px] font-semibold leading-none tracking-[-0.045em] tabular-nums">{value}</p><p className={emphasis ? "mt-3 text-[11px] text-slate-400" : "mt-3 text-[11px] text-slate-400"}>{note}</p></div>
  </Card>;
}

export default async function DashboardPage() {
  const { metrics, monthlyTrend, statusBreakdown, revenueByClient, upcomingEvents } = await DashboardService.getDashboardData();
  return (
    <div className="bf-page">
      <div className="bf-page-header">
        <div><p className="bf-eyebrow">Your workspace</p><h1 className="bf-title">Overview</h1><p className="bf-subtitle">A clear view of your income and what’s next.</p></div>
        <div className="flex flex-wrap items-center gap-3"><span className="mr-1 hidden items-center gap-2 text-xs text-slate-400 xl:flex"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(), "dd MMM yyyy")}</span><Link href="/invoices/new"><Button><Plus className="h-4 w-4" /> New invoice</Button></Link></div>
      </div>
      <section aria-label="Financial overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Collected this month" value={formatCurrency(metrics.revenueThisMonth)} note="Payments received this calendar month" icon={ArrowDownLeft} emphasis />
        <MetricCard label="Outstanding" value={formatCurrency(metrics.outstandingRevenue)} note="Balance remaining across your invoices" icon={Clock3} />
        <MetricCard label="Overdue" value={formatCurrency(metrics.overdueRevenue)} note={`${metrics.overdueCount} invoice${metrics.overdueCount === 1 ? " needs" : "s need"} your attention`} icon={ArrowUpRight} />
        <MetricCard label="Monthly recurring" value={formatCurrency(metrics.monthlyContractedRevenue)} note="Monthly value of active contracts" icon={Repeat2} />
      </section>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle>Income overview</CardTitle><CardDescription className="mt-1.5">Collected and invoiced over the last 12 months</CardDescription></div><div className="flex items-center gap-4 pt-1 text-[11px] text-slate-500"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#4e74cc]" />Collected</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#aebdce]" />Invoiced</span></div></div></CardHeader>
          <CardContent><RevenueChart data={monthlyTrend} /><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><p className="text-xs text-slate-500">Collected this year <span className="ml-2 font-semibold tabular-nums text-slate-900 dark:text-white">{formatCurrency(metrics.revenueThisYear)}</span></p><Link href="/reports" className="bf-link">View reports <ArrowUpRight className="h-3.5 w-3.5" /></Link></div></CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Invoice activity</CardTitle><CardDescription>Where your invoices stand</CardDescription></CardHeader><CardContent><StatusDonutChart data={statusBreakdown} /><Link href="/invoices" className="mt-5 flex w-full items-center justify-center gap-2 border-t border-border pt-5 text-xs font-medium text-slate-600 dark:text-slate-300">Manage invoices <ArrowUpRight className="h-3.5 w-3.5" /></Link></CardContent></Card>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Coming up</CardTitle><CardDescription className="mt-1.5">Due dates, renewals and recurring billing</CardDescription></div><Link href="/recurring" className="bf-link">View all <ArrowUpRight className="h-3.5 w-3.5" /></Link></div></CardHeader><CardContent><UpcomingEventsList events={upcomingEvents} /></CardContent></Card>
        <Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Your top clients</CardTitle><CardDescription className="mt-1.5">Ranked by collected revenue</CardDescription></div><Link href="/clients" className="bf-link">All clients <ArrowUpRight className="h-3.5 w-3.5" /></Link></div></CardHeader><CardContent>
          {revenueByClient.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">Your client revenue will appear here.</p> : <div className="space-y-5">{revenueByClient.map((client, index) => <div key={client.name} className="flex items-center gap-3"><span className="bf-avatar h-9 w-9 rounded-lg text-xs">{client.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">{client.name}</span><span className="text-xs font-medium tabular-nums text-slate-800 dark:text-white">{formatCurrency(client.revenue)}</span></div><div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-slate-400" style={{ width: `${Math.max(2, (client.revenue / (revenueByClient[0]?.revenue || 1)) * 100)}%`, opacity: 1 - index * 0.1 }} /></div></div></div>)}</div>}
          <p className="mt-6 border-t border-border pt-4 text-[11px] text-slate-400">{metrics.activeContractsCount} active contract{metrics.activeContractsCount === 1 ? "" : "s"} in your workspace</p>
        </CardContent></Card>
      </div>
    </div>
  );
}
