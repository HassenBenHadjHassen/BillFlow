"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileCheck,
  Building2,
  Calendar,
  RotateCw,
  FolderOpen,
  Receipt,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RenewContractDialog } from "@/components/contracts/renew-contract-dialog";
import { archiveContractAction } from "@/actions/contract.actions";
import { formatCurrency } from "@/lib/financial";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export function ContractDetailClient({ contract }: { contract: any }) {
  const router = useRouter();
  const { toast } = useToast();
  const [renewDialogOpen, setRenewDialogOpen] = React.useState(false);

  const handleArchive = async () => {
    if (!confirm(`Are you sure you want to archive contract "${contract.title}"? Historical records will remain intact.`)) {
      return;
    }
    const res = await archiveContractAction(contract.id);
    if (res.success) {
      toast({ title: "Contract Archived", type: "info" });
      router.push("/contracts");
    } else {
      toast({ title: "Error", description: res.error, type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/contracts">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 font-semibold">{contract.contractNumber}</span>
              <Badge variant={contract.status === "Active" ? "success" : "secondary"}>
                {contract.status}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
              {contract.title}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setRenewDialogOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm">
            <RotateCw className="h-4 w-4" /> Renew Contract
          </Button>
          <Link href={`/invoices/new?clientId=${contract.clientId}&contractId=${contract.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Issue Invoice
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleArchive} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expiration Highlight Alert Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        contract.expiration.isExpired
          ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200"
          : contract.expiration.isExpiringSoon
          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200"
          : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200"
      }`}>
        <div className="flex items-center gap-3">
          {contract.expiration.isExpired ? (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          ) : contract.expiration.isExpiringSoon ? (
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          )}
          <div>
            <p className="text-sm font-bold">{contract.expiration.label}</p>
            <p className="text-xs opacity-90">
              Contract period: {format(new Date(contract.startDate), "dd MMM yyyy")} &bull;{" "}
              {contract.endDate ? format(new Date(contract.endDate), "dd MMM yyyy") : "Indefinite"}
              {contract.renewalDate && ` (Renewal target: ${format(new Date(contract.renewalDate), "dd MMM yyyy")})`}
            </p>
          </div>
        </div>

        {(contract.expiration.isExpiringSoon || contract.expiration.isExpired) && (
          <Button
            size="sm"
            onClick={() => setRenewDialogOpen(true)}
            className="shrink-0 bg-white text-slate-900 border border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-white"
          >
            Renew Agreement
          </Button>
        )}
      </div>

      {/* 3 Key Financial Stats for this Contract */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contract Value</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(contract.amount, contract.currency)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">per {contract.billingFrequency.toLowerCase()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(contract.totalInvoiced, contract.currency)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{contract.invoices.length} invoices generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Paid</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(contract.totalPaid, contract.currency)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Collected revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className={`text-xl font-bold ${contract.outstandingAmount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
              {formatCurrency(contract.outstandingAmount, contract.currency)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Pending receipt</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Details + Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Client & Contract Details */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Contract Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Client</span>
              <Link href={`/clients/${contract.clientId}`} className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-4 w-4" /> {contract.client.companyName}
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block font-medium">Frequency</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{contract.billingFrequency}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Payment Terms</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Net {contract.paymentTerms} Days</span>
              </div>
            </div>

            {contract.description && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block font-medium">Description</span>
                <p className="text-slate-600 dark:text-slate-400 mt-1">{contract.description}</p>
              </div>
            )}

            {contract.notes && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block font-medium">Notes & Terms</span>
                <p className="text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">{contract.notes}</p>
              </div>
            )}

            {/* Version / Renewal Linkage */}
            {(contract.previousContract || (contract.renewals && contract.renewals.length > 0)) && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-slate-400 block font-medium uppercase text-[10px]">Renewal Lineage</span>
                {contract.previousContract && (
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                    <span>Renewed from:</span>
                    <Link href={`/contracts/${contract.previousContract.id}`} className="font-semibold text-indigo-600 hover:underline">
                      {contract.previousContract.contractNumber}
                    </Link>
                  </div>
                )}
                {contract.renewals?.map((ren: any) => (
                  <div key={ren.id} className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-between text-emerald-900 dark:text-emerald-200">
                    <span>Succeeded by:</span>
                    <Link href={`/contracts/${ren.id}`} className="font-semibold text-emerald-700 hover:underline">
                      {ren.contractNumber} &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Columns: Invoices & Attached Documents */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="invoices">
            <TabsList>
              <TabsTrigger value="invoices" className="gap-1.5">
                <Receipt className="h-3.5 w-3.5" /> Related Invoices ({contract.invoices.length})
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" /> Documents ({contract.documents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invoices" className="space-y-3">
              {contract.invoices.length === 0 ? (
                <Card className="p-8 text-center text-xs text-slate-400">
                  No invoices created for this contract yet.
                </Card>
              ) : (
                contract.invoices.map((inv: any) => (
                  <Card key={inv.id} className="p-4 hover:border-indigo-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/invoices/${inv.id}`} className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 text-sm">
                            {inv.invoiceNumber}
                          </Link>
                          <Badge variant={inv.status === "Paid" ? "success" : inv.status === "Overdue" ? "destructive" : "indigo"}>
                            {inv.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                          <span>Issued: {format(new Date(inv.issueDate), "dd/MM/yyyy")}</span>
                          <span>&bull;</span>
                          <span>Due: {format(new Date(inv.dueDate), "dd/MM/yyyy")}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="font-bold text-slate-900 dark:text-white text-base">
                            {formatCurrency(inv.total, inv.currency)}
                          </span>
                          {inv.remainingBalance > 0 && (
                            <span className="text-[10px] text-amber-600 block">
                              Due: {formatCurrency(inv.remainingBalance, inv.currency)}
                            </span>
                          )}
                        </div>
                        <Link href={`/invoices/${inv.id}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-3">
              {contract.documents.length === 0 ? (
                <Card className="p-8 text-center text-xs text-slate-400">
                  No attachments or signed contracts uploaded for this contract.
                </Card>
              ) : (
                contract.documents.map((doc: any) => (
                  <Card key={doc.id} className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-4 w-4 text-indigo-500" />
                      <div>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-900 dark:text-white hover:underline text-xs">
                          {doc.name}
                        </a>
                        <div className="text-[11px] text-slate-400">
                          {doc.type} &bull; {format(new Date(doc.uploadedAt), "dd/MM/yyyy")}
                        </div>
                      </div>
                    </div>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">Download</Button>
                    </a>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Renew Contract Dialog */}
      <RenewContractDialog
        open={renewDialogOpen}
        onOpenChange={setRenewDialogOpen}
        contract={contract}
      />
    </div>
  );
}
