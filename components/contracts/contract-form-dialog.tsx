"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createContractAction } from "@/actions/contract.actions";
import { useToast } from "@/components/ui/toast";
import { ClientDTO } from "@/types";

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients?: ClientDTO[];
  preselectedClientId?: string;
}

export function ContractFormDialog({
  open,
  onOpenChange,
  clients = [],
  preselectedClientId,
}: ContractFormDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [clientId, setClientId] = React.useState(preselectedClientId || "");
  const [title, setTitle] = React.useState("");
  const [contractNumber, setContractNumber] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = React.useState("");
  const [renewalDate, setRenewalDate] = React.useState("");
  const [amount, setAmount] = React.useState<number | string>(1500);
  const [currency, setCurrency] = React.useState("EUR");
  const [billingFrequency, setBillingFrequency] = React.useState<"One-time" | "Monthly" | "Quarterly" | "Yearly">("Monthly");
  const [paymentTerms, setPaymentTerms] = React.useState<number>(30);
  const [status, setStatus] = React.useState<"Draft" | "Active" | "ExpiringSoon" | "Expired" | "Terminated">("Active");
  const [autoSetupRecurring, setAutoSetupRecurring] = React.useState(true);
  const [notes, setNotes] = React.useState("");
  const [contractFile, setContractFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    if (preselectedClientId) {
      setClientId(preselectedClientId);
    } else if (clients.length > 0 && !clientId) {
      setClientId(clients[0].id);
    }
  }, [preselectedClientId, clients, clientId]);

  // Suggest default contract number
  React.useEffect(() => {
    if (open && !contractNumber) {
      const year = new Date().getFullYear();
      const rand = Math.floor(100 + Math.random() * 900);
      setContractNumber(`CTR-${year}-${rand}`);
    }
  }, [open, contractNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    if (contractFile) {
      formData.append("file", contractFile);
    }
    formData.append("clientId", clientId);
    formData.append("title", title);
    formData.append("contractNumber", contractNumber);
    if (description) formData.append("description", description);
    formData.append("startDate", startDate);
    if (endDate) formData.append("endDate", endDate);
    if (renewalDate) formData.append("renewalDate", renewalDate);
    formData.append("amount", String(amount));
    formData.append("currency", currency);
    formData.append("billingFrequency", billingFrequency);
    formData.append("paymentTerms", String(paymentTerms));
    formData.append("status", status);
    formData.append("autoSetupRecurring", String(autoSetupRecurring));
    if (notes) formData.append("notes", notes);

    try {
      const res = await createContractAction(formData);
      if (res.success) {
        toast({ title: "Contract Saved", description: `${title} has been recorded.`, type: "success" });
        onOpenChange(false);
        router.refresh();
      } else {
        setError(res.error || "Failed to create contract");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>New Contract</DialogTitle>
        <DialogDescription>
          Create a new client contract with billing parameters and terms
        </DialogDescription>
      </DialogHeader>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Client select */}
          {!preselectedClientId && (
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Client *</label>
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              >
                <option value="">Select a client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Contract Title *</label>
            <Input
              required
              placeholder="e.g. Full-Stack Web Development Retainer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Contract Number */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Contract Number *</label>
            <Input
              required
              placeholder="CTR-2026-001"
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
            />
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Amount (HT) *</label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Billing Frequency *</label>
            <select
              value={billingFrequency}
              onChange={(e) => setBillingFrequency(e.target.value as any)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
              <option value="One-time">One-time</option>
            </select>
          </div>

          {/* Payment terms */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Terms (Days)</label>
            <Input
              type="number"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(Number(e.target.value))}
            />
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Start Date *</label>
            <Input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">End Date (Optional)</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Renewal Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Renewal Notice Date</label>
            <Input
              type="date"
              value={renewalDate}
              onChange={(e) => setRenewalDate(e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Initial Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
            >
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="ExpiringSoon">Expiring Soon</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>

          {/* Recurring Billing Toggle */}
          {billingFrequency !== "One-time" && (
            <div className="sm:col-span-2 flex items-center gap-2 p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
              <input
                type="checkbox"
                id="autoRecurring"
                checked={autoSetupRecurring}
                onChange={(e) => setAutoSetupRecurring(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="autoRecurring" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <strong>Automatically configure recurring billing schedule</strong> ({billingFrequency} invoices)
              </label>
            </div>
          )}

          {/* Description */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Scope / Description</label>
            <Input
              placeholder="e.g. 40 hours monthly engineering retainer"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Attach Signed Contract Document */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Attach Contract Document (PDF - Optional)
            </label>
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setContractFile(e.target.files[0]);
                }
              }}
              className="text-xs"
            />
            <p className="text-[11px] text-slate-400">
              Upload your signed contract PDF to preserve it in your local document vault.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Contract
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
