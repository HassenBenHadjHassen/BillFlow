"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarSync, Play, Sparkles, AlertCircle, CheckCircle2, Clock, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateRecurringInvoiceAction, generateAllDueInvoicesAction } from "@/actions/recurring.actions";
import { formatCurrency } from "@/lib/financial";
import { useToast } from "@/components/ui/toast";
import { differenceInCalendarDays, format } from "date-fns";

export function RecurringClient({ configs }: { configs: any[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isGeneratingAll, setIsGeneratingAll] = React.useState(false);
  const [generatingId, setGeneratingId] = React.useState<string | null>(null);
  const [lastReport, setLastReport] = React.useState<any | null>(null);

  const handleGenerateSingle = async (id: string, force: boolean = false) => {
    setGeneratingId(id);
    try {
      const res = await generateRecurringInvoiceAction(id, force);
      if (res.success && res.result) {
        if (res.result.generated) {
          toast({
            title: "Recurring Invoice Generated",
            description: `Invoice ${res.result.invoiceNumber} created and schedule updated.`,
            type: "success",
          });
        } else {
          toast({
            title: "Idempotent Check Passed",
            description: res.result.reason || "Invoice already exists for this billing period.",
            type: "info",
          });
        }
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error, type: "error" });
      }
    } finally {
      setGeneratingId(null);
    }
  };

  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    setLastReport(null);
    try {
      const res = await generateAllDueInvoicesAction();
      if (res.success && res.report) {
        setLastReport(res.report);
        if (res.report.generated > 0) {
          toast({
            title: "Due Invoices Processed",
            description: `Generated ${res.report.generated} invoice(s). Skipped ${res.report.skipped} already generated or not due.`,
            type: "success",
          });
        } else {
          toast({
            title: "All Invoices Up-to-Date",
            description: `0 invoices due. All ${res.report.skipped} period checks were idempotent.`,
            type: "info",
          });
        }
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error, type: "error" });
      }
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const today = new Date();

  return (
    <div className="space-y-6">
      {/* Top Header & Batch Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarSync className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Recurring Billing Schedules ({configs.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Idempotent automated monthly retainer generation and subscription schedules.
          </p>
        </div>

        <Button
          onClick={handleGenerateAll}
          isLoading={isGeneratingAll}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          <Play className="h-4 w-4" />
          <span>Generate All Due Invoices</span>
        </Button>
      </div>

      {/* Idempotency Protection Info Banner */}
      <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/40 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-sm">Guaranteed Idempotent Generation</p>
          <p className="text-indigo-700 dark:text-indigo-300">
            Billflow checks each contract against its exact billing period window (<code>billingPeriodStart</code> &amp; <code>billingPeriodEnd</code>). You can safely click &ldquo;Generate All Due Invoices&rdquo; at any time; duplicate invoices will never be generated for the same contract cycle.
          </p>
        </div>
      </div>

      {/* Last Run Report Banner (if just executed) */}
      {lastReport && (
        <Card className="p-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span>Batch Run Summary</span>
          </div>
          <div className="text-slate-700 dark:text-slate-300">
            Processed <strong>{lastReport.processed}</strong> schedules: <strong>{lastReport.generated}</strong> new invoice(s) generated, <strong>{lastReport.skipped}</strong> skipped (idempotent / up to date).
          </div>
          {lastReport.results?.length > 0 && (
            <div className="divide-y divide-emerald-200/60 dark:divide-emerald-800/40 pt-1">
              {lastReport.results.map((r: any, idx: number) => (
                <div key={idx} className="py-1 flex items-center justify-between">
                  <span>{r.contractTitle}</span>
                  <Badge variant={r.result.generated ? "success" : "secondary"} className="text-[10px]">
                    {r.result.generated ? `Generated ${r.result.invoiceNumber}` : (r.result.reason || "Skipped")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Recurring Schedules Table */}
      {configs.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarSync className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No recurring billing configurations</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Recurring schedules are automatically created when you check &ldquo;Automatically configure recurring billing schedule&rdquo; upon creating a contract.
          </p>
          <Link href="/contracts" className="inline-block mt-4">
            <Button size="sm">Go to Contracts</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map((config) => {
            const daysToDue = differenceInCalendarDays(new Date(config.nextInvoiceDate), today);
            const isDue = daysToDue <= 0;
            const isGenerating = generatingId === config.id;

            return (
              <Card key={config.id} className="flex flex-col justify-between hover:border-indigo-300 transition-colors">
                <CardContent className="p-5 space-y-4">
                  {/* Client & Contract */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                        {config.contract.client.companyName}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {config.contract.title}
                      </h3>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                        {config.contract.contractNumber}
                      </span>
                    </div>
                    <Badge variant={config.active ? "success" : "secondary"} className="text-[10px]">
                      {config.active ? "Active Schedule" : "Inactive"}
                    </Badge>
                  </div>

                  {/* Rate & Frequency */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Billing Fee</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {formatCurrency(config.amount, config.currency)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Cadence</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{config.frequency}</span>
                    </div>
                  </div>

                  {/* Next Invoice & Status */}
                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" /> Next Invoice Date:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {format(new Date(config.nextInvoiceDate), "dd MMM yyyy")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" /> Last Generated:
                      </span>
                      <span>
                        {config.lastInvoiceDate ? format(new Date(config.lastInvoiceDate), "dd MMM yyyy") : "None yet"}
                      </span>
                    </div>
                  </div>

                  {/* Due Status Pill */}
                  <div className={`p-2 rounded-lg text-xs font-semibold flex items-center justify-between ${
                    isDue
                      ? "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
                  }`}>
                    <span>{isDue ? "Invoice is due now" : `Due in ${daysToDue} day${daysToDue === 1 ? "" : "s"}`}</span>
                    {isDue && <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />}
                  </div>
                </CardContent>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl flex items-center justify-between gap-2">
                  <Link href={`/contracts/${config.contractId}`} className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1">
                    Contract <ArrowRight className="h-3 w-3" />
                  </Link>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => handleGenerateSingle(config.id, isDue ? false : true)}
                      isLoading={isGenerating}
                      className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Play className="h-3 w-3" />
                      <span>{isDue ? "Generate Invoice" : "Force Generate"}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
