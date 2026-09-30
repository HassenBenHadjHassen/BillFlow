"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarSync,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Building2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { advanceRecurringScheduleAction } from "@/actions/recurring.actions";
import { formatCurrency } from "@/lib/financial";
import { useToast } from "@/components/ui/toast";
import { differenceInCalendarDays, format } from "date-fns";

export function RecurringClient({ configs }: { configs: any[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [advancingId, setAdvancingId] = React.useState<string | null>(null);

  const today = new Date();

  // Metrics
  const activeConfigs = configs.filter((c) => c.active);
  const totalMRR = activeConfigs.reduce((sum, c) => {
    let monthly = c.amount;
    if (c.frequency === "Quarterly") monthly = c.amount / 3;
    if (c.frequency === "Yearly") monthly = c.amount / 12;
    return sum + monthly;
  }, 0);

  const dueCount = activeConfigs.filter((c) => {
    const next = new Date(c.nextInvoiceDate);
    return differenceInCalendarDays(next, today) <= 0;
  }).length;

  const handleAdvance = async (id: string, clientName: string) => {
    if (!confirm(`Mark this billing cycle as invoiced for ${clientName}? This will advance the schedule to the next period.`)) {
      return;
    }
    setAdvancingId(id);
    try {
      const res = await advanceRecurringScheduleAction(id);
      if (res.success) {
        toast({
          title: "Schedule Advanced",
          description: "Billing period marked as invoiced. Next billing date updated.",
          type: "success",
        });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error, type: "error" });
      }
    } finally {
      setAdvancingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarSync className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Recurring Billing Schedules &amp; Alerts ({configs.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track retainer contracts and receive timely alerts to log and attach monthly invoices.
          </p>
        </div>

        <Link href="/contracts">
          <Button variant="outline" className="gap-2 shadow-xs">
            <span>Manage Contracts</span>
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Monthly Recurring Revenue
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <TrendingUp className="h-5 w-5" />
              {formatCurrency(totalMRR, "EUR")}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Normalized monthly contract volume</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Schedules
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {activeConfigs.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Ongoing retainer contracts</p>
          </CardContent>
        </Card>

        <Card className={dueCount > 0 ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/20" : ""}>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Invoices Due to Log
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className={`text-2xl font-bold ${dueCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {dueCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {dueCount > 0 ? "Schedules ready for this month's invoice" : "All schedules up to date"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Schedules List */}
      {configs.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarSync className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No Recurring Schedules</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Recurring schedules are automatically created when you create a contract with Monthly, Quarterly, or Yearly frequency.
          </p>
          <div className="mt-4">
            <Link href="/contracts">
              <Button size="sm">View Contracts</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {configs.map((cfg) => {
            const nextDate = new Date(cfg.nextInvoiceDate);
            const daysRemaining = differenceInCalendarDays(nextDate, today);
            const isDue = daysRemaining <= 0;
            const isDueSoon = daysRemaining > 0 && daysRemaining <= 7;

            return (
              <Card
                key={cfg.id}
                className={`transition-all ${
                  isDue
                    ? "border-amber-300 dark:border-amber-800/60 bg-amber-50/10 dark:bg-amber-950/10 shadow-xs"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/clients/${cfg.contract.clientId}`}
                        className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 text-sm"
                      >
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {cfg.contract.client.companyName}
                      </Link>

                      <Badge variant="outline" className="text-[11px] font-normal">
                        {cfg.frequency}
                      </Badge>

                      {isDue ? (
                        <Badge variant="warning" className="gap-1 text-xs">
                          <AlertCircle className="h-3 w-3" /> Invoice Due Now
                        </Badge>
                      ) : isDueSoon ? (
                        <Badge variant="warning" className="text-xs">
                          Due in {daysRemaining} day{daysRemaining === 1 ? "" : "s"}
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-xs">
                          Active ({daysRemaining} days left)
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <Link
                        href={`/contracts/${cfg.contractId}`}
                        className="hover:underline text-indigo-600 dark:text-indigo-400 font-medium"
                      >
                        {cfg.contract.title}
                      </Link>
                      <span>•</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(cfg.amount, cfg.currency)} / {cfg.frequency.toLowerCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Next billing date: <strong>{format(nextDate, "dd MMMM yyyy")}</strong></span>
                      </div>
                      {cfg.lastInvoiceDate && (
                        <div>
                          Last invoiced: {format(new Date(cfg.lastInvoiceDate), "dd MMM yyyy")}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for this recurring schedule */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/invoices/new?clientId=${cfg.contract.clientId}&contractId=${cfg.contract.id}&amount=${cfg.amount}`}
                    >
                      <Button
                        size="sm"
                        className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                      >
                        <UploadCloud className="h-3.5 w-3.5" />
                        <span>Record &amp; Attach Invoice</span>
                      </Button>
                    </Link>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAdvance(cfg.id, cfg.contract.client.companyName)}
                      isLoading={advancingId === cfg.id}
                      className="text-xs text-slate-600 dark:text-slate-400"
                      title="Advance billing date without uploading an invoice right now"
                    >
                      Mark as Invoiced
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
