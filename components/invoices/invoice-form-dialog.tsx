"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveInvoiceAction } from "@/actions/invoice.actions";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, roundMoney } from "@/lib/financial";
import { ClientDTO } from "@/types";
import { UploadCloud, FileText, CheckCircle2, X } from "lucide-react";

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients?: ClientDTO[];
  contracts?: any[];
  preselectedClientId?: string;
  preselectedContractId?: string;
  onSuccess?: (invoice: any) => void;
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  clients = [],
  contracts = [],
  preselectedClientId,
  preselectedContractId,
  onSuccess,
}: InvoiceFormDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [clientId, setClientId] = React.useState(preselectedClientId || "");
  const [contractId, setContractId] = React.useState(preselectedContractId || "");
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [issueDate, setIssueDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [currency, setCurrency] = React.useState("EUR");
  const [subtotal, setSubtotal] = React.useState<number | string>(1000);
  const [taxRate, setTaxRate] = React.useState<number | string>(20);
  const [taxAmount, setTaxAmount] = React.useState<number | string>(200);
  const [total, setTotal] = React.useState<number | string>(1200);
  const [status, setStatus] = React.useState<"Paid" | "Sent" | "Draft">("Sent");
  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = React.useState("BankTransfer");
  const [notes, setNotes] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  // Sync client
  React.useEffect(() => {
    if (preselectedClientId) {
      setClientId(preselectedClientId);
    } else if (clients.length > 0 && !clientId) {
      setClientId(clients[0].id);
    }
  }, [preselectedClientId, clients, clientId]);

  // Sync contract
  React.useEffect(() => {
    if (preselectedContractId) {
      setContractId(preselectedContractId);
    }
  }, [preselectedContractId]);

  // Suggest default invoice number when opened
  React.useEffect(() => {
    if (open && !invoiceNumber) {
      const year = new Date().getFullYear();
      const rand = Math.floor(100 + Math.random() * 900);
      setInvoiceNumber(`INV-${year}-${rand}`);
    }
  }, [open, invoiceNumber]);

  // Recalculate taxes
  const handleSubtotalChange = (val: string) => {
    setSubtotal(val);
    const sub = parseFloat(val) || 0;
    const rate = parseFloat(String(taxRate)) || 0;
    const tax = roundMoney(sub * (rate / 100));
    setTaxAmount(tax);
    setTotal(roundMoney(sub + tax));
  };

  const handleTaxRateChange = (val: string) => {
    setTaxRate(val);
    const sub = parseFloat(String(subtotal)) || 0;
    const rate = parseFloat(val) || 0;
    const tax = roundMoney(sub * (rate / 100));
    setTaxAmount(tax);
    setTotal(roundMoney(sub + tax));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError("Please select a client.");
      return;
    }
    if (!invoiceNumber.trim()) {
      setError("Please specify an invoice number.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    if (selectedFile) {
      formData.append("file", selectedFile);
    }
    formData.append("invoiceNumber", invoiceNumber.trim());
    formData.append("clientId", clientId);
    if (contractId) formData.append("contractId", contractId);
    formData.append("issueDate", issueDate);
    formData.append("dueDate", dueDate);
    formData.append("currency", currency);
    formData.append("subtotal", String(subtotal));
    formData.append("taxRate", String(taxRate));
    formData.append("taxAmount", String(taxAmount));
    formData.append("total", String(total));
    formData.append("status", status);
    if (notes) formData.append("notes", notes);
    if (status === "Paid") {
      formData.append("paymentDate", paymentDate);
      formData.append("paymentMethod", paymentMethod);
    }

    try {
      const res = await saveInvoiceAction(formData);
      if (res.success && res.invoice) {
        toast({
          title: "Invoice Recorded",
          description: `Invoice ${res.invoice.invoiceNumber} recorded successfully.`,
          type: "success",
        });
        onSuccess?.(res.invoice);
        onOpenChange(false);
        router.refresh();
      } else {
        setError(res.error || "Failed to record invoice.");
      }
    } catch {
      setError("An unexpected error occurred while saving invoice.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Record Invoice</DialogTitle>
        <DialogDescription>
          Save and track an existing invoice, store its PDF document, and record payment ledger entries.
        </DialogDescription>
      </DialogHeader>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* PDF File Upload */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Invoice PDF Document (Optional)
          </label>
          {selectedFile ? (
            <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                <FileText className="h-4 w-4" />
                <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSelectedFile(null)}
                className="h-6 w-6 text-slate-400 hover:text-rose-600"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center bg-slate-50/50 dark:bg-slate-900/50">
              <input
                type="file"
                accept="application/pdf"
                id="invoice-dialog-file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="invoice-dialog-file"
                className="cursor-pointer flex items-center justify-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                <UploadCloud className="h-4 w-4" />
                <span>Upload Invoice PDF</span>
              </label>
              <p className="text-[10px] text-slate-400 mt-1">Saved securely to local private storage</p>
            </div>
          )}
        </div>

        {/* Client & Invoice Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Client *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
            >
              <option value="" disabled>Select Client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Invoice Number *</label>
            <Input
              required
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="INV-2026-001"
              className="font-mono text-sm"
            />
          </div>
        </div>

        {/* Linked Contract (Optional) */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Linked Contract (Optional)
          </label>
          <select
            value={contractId}
            onChange={(e) => {
              const val = e.target.value;
              setContractId(val);
              if (val) {
                const found = contracts.find((c) => c.id === val);
                if (found) {
                  handleSubtotalChange(String(found.amount));
                  setCurrency(found.currency || "EUR");
                }
              }
            }}
            className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
          >
            <option value="">No linked contract (Standalone Invoice)</option>
            {contracts
              .filter((c) => !clientId || c.clientId === clientId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.contractNumber} &bull; {c.title} ({formatCurrency(c.amount, c.currency)} / {c.billingFrequency})
                </option>
              ))}
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Issue Date *</label>
            <Input
              type="date"
              required
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Due Date *</label>
            <Input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Subtotal *</label>
            <Input
              type="number"
              step="0.01"
              required
              value={subtotal}
              onChange={(e) => handleSubtotalChange(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">VAT (%)</label>
            <Input
              type="number"
              step="0.1"
              value={taxRate}
              onChange={(e) => handleTaxRateChange(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Total (EUR) *</label>
            <Input
              type="number"
              step="0.01"
              required
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="text-sm font-bold text-indigo-600 dark:text-indigo-400"
            />
          </div>
        </div>

        {/* Status Selection */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Status *</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "Sent", label: "Sent / Pending" },
              { id: "Paid", label: "Paid" },
              { id: "Draft", label: "Draft" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatus(opt.id as any)}
                className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  status === opt.id
                    ? "bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-400 dark:text-indigo-200"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Paid details */}
        {status === "Paid" && (
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  Got Paid At (Payment Date) *
                </label>
                <Input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="text-sm h-8 bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-8 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="BankTransfer">Bank Transfer (SEPA / Wire)</option>
                  <option value="CreditCard">Credit / Debit Card</option>
                  <option value="Stripe">Stripe Checkout</option>
                  <option value="Check">Bank Check</option>
                  <option value="Cash">Cash Settlement</option>
                  <option value="Other">Other Method</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Set the exact date the money arrived in your account (e.g. invoice issued end of month, paid at start of next month).
            </p>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Save Invoice
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
