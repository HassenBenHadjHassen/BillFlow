"use client";

import * as React from "react";
import Link from "next/link";
import { FileCheck, Plus, Search, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContractFormDialog } from "@/components/contracts/contract-form-dialog";
import { formatCurrency } from "@/lib/financial";
import { format } from "date-fns";
import { ClientDTO } from "@/types";

export function ContractsClient({
  initialContracts,
  clients,
}: {
  initialContracts: any[];
  clients: ClientDTO[];
}) {
  const [contracts, setContracts] = React.useState<any[]>(initialContracts);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setContracts(initialContracts);
  }, [initialContracts]);

  const filtered = contracts.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.title.toLowerCase().includes(q) ||
      c.contractNumber.toLowerCase().includes(q) ||
      c.client.companyName.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "Active" && c.status === "Active") ||
      (statusFilter === "ExpiringSoon" && c.expiration.isExpiringSoon) ||
      (statusFilter === "Expired" && (c.status === "Expired" || c.expiration.isExpired)) ||
      (statusFilter === "Draft" && c.status === "Draft");

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (contract: any) => {
    if (contract.status === "Terminated") return <Badge variant="destructive">Terminated</Badge>;
    if (contract.status === "Draft") return <Badge variant="secondary">Draft</Badge>;
    if (contract.expiration.isExpired) return <Badge variant="destructive">Expired</Badge>;
    if (contract.expiration.isExpiringSoon) return <Badge variant="warning">Expiring Soon</Badge>;
    return <Badge variant="success">Active</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Contracts ({contracts.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Active agreements, monthly retainer commitments, and historical renewals.
          </p>
        </div>

        <Button onClick={() => setDialogOpen(true)} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          <span>New Contract</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, number, or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 shadow-xs"
          />
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { label: "All", value: "ALL" },
            { label: "Active", value: "Active" },
            { label: "Expiring Soon", value: "ExpiringSoon" },
            { label: "Expired", value: "Expired" },
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

      {/* Contracts Table/List */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No contracts found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {search ? "Try adjusting your search or filters." : "Create your first client contract to configure recurring billing."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((con) => (
            <Card key={con.id} className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                      {con.contractNumber}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mt-0.5">
                      {con.title}
                    </h3>
                    <Link
                      href={`/clients/${con.clientId}`}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold block mt-0.5 truncate"
                    >
                      {con.client.companyName}
                    </Link>
                  </div>
                  {getStatusBadge(con)}
                </div>

                {/* Expiration Banner */}
                <div className={`mt-3 px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 ${
                  con.expiration.isExpired
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                    : con.expiration.isExpiringSoon
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                    : "bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400"
                }`}>
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{con.expiration.label}</span>
                </div>

                {/* Details */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Frequency:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{con.billingFrequency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Duration:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {format(new Date(con.startDate), "dd/MM/yyyy")} &rarr; {con.endDate ? format(new Date(con.endDate), "dd/MM/yyyy") : "Open"}
                    </span>
                  </div>
                </div>

                {/* Amount Box */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Rate</span>
                    <span className="font-bold text-slate-900 dark:text-white text-base">
                      {formatCurrency(con.amount, con.currency)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Invoiced</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(con.totalInvoiced, con.currency)}
                    </span>
                  </div>
                </div>
              </CardContent>

              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl">
                <Link
                  href={`/contracts/${con.id}`}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                >
                  Manage Contract <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Contract Dialog */}
      <ContractFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clients={clients}
        onSuccess={(newContract) => {
          setContracts((prev) => [newContract, ...prev.filter((c) => c.id !== newContract.id)]);
        }}
      />
    </div>
  );
}
