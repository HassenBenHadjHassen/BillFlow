"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UploadCloud,
  FileCheck,
  FileText,
  X,
  ArrowLeft,
  Receipt,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { saveInvoiceAction } from "@/actions/invoice.actions";
import { formatCurrency, roundMoney } from "@/lib/financial";
import { useToast } from "@/components/ui/toast";
import { formatInvoiceNumber, INVOICE_TAX_RATE } from "@/lib/invoice";
import { ClientDTO, ContractDTO } from "@/types";
import { addDays, format } from "date-fns";

export function InvoiceForm({
  clients,
  contracts,
  initialClientId,
  initialContractId,
  initialAmount,
  initialPeriodStart,
  initialPeriodEnd,
}: {
  clients: ClientDTO[];
  contracts: ContractDTO[];
  initialClientId?: string;
  initialContractId?: string;
  initialAmount?: number;
  initialPeriodStart?: string;
  initialPeriodEnd?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form State
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const [invoiceNumberOverride, setInvoiceNumberOverride] = React.useState<string | null>(null);
  const [namingDate, setNamingDate] = React.useState(() => new Date());
  const [clientId, setClientId] = React.useState(initialClientId || contracts.find((contract) => contract.id === initialContractId)?.clientId || "");
  const selectedClient = clients.find((client) => client.id === clientId);
  const invoiceNumber = invoiceNumberOverride ?? (selectedClient ? formatInvoiceNumber(selectedClient.companyName, namingDate) : "");
  const [contractId, setContractId] = React.useState(initialContractId || "");
  const [issueDate, setIssueDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = React.useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [currency, setCurrency] = React.useState("EUR");

  // All invoices are tax-free; the total follows the entered amount.
  const [subtotal, setSubtotal] = React.useState<number | string>(initialAmount ?? "");
  const taxRate = INVOICE_TAX_RATE;
  const taxAmount = 0;
  const total = subtotal === "" ? "" : roundMoney(Number(subtotal) || 0);

  // Status & payment
  const [status, setStatus] = React.useState<string>("Sent");
  const [paymentDate, setPaymentDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = React.useState("BankTransfer");

  // Optional billing period & notes
  const [billingPeriodStart, setBillingPeriodStart] = React.useState(initialPeriodStart || "");
  const [billingPeriodEnd, setBillingPeriodEnd] = React.useState(initialPeriodEnd || "");
  const [notes, setNotes] = React.useState("");

  // Filter contracts for selected client
  const clientContracts = contracts.filter((c) => c.clientId === clientId);

  const handleContractChange = (newContractId: string) => {
    setContractId(newContractId);
    if (newContractId) {
      const selected = contracts.find((c) => c.id === newContractId);
      if (selected) {
        setCurrency(selected.currency || "EUR");
        if (selected.amount && !initialAmount) {
          setSubtotal(selected.amount);
        }
        if (selected.paymentTerms) {
          setDueDate(format(addDays(new Date(issueDate), selected.paymentTerms), "yyyy-MM-dd"));
        }
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF document file.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("File exceeds 25MB size limit.");
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleSubmit = async (overrideStatus?: string) => {
    if (!clientId || !invoiceNumber.trim()) {
      setError("Please select a client and enter an invoice number.");
      return;
    }
    if (subtotal === "" || !Number.isFinite(Number(subtotal)) || Number(subtotal) < 0) {
      setError("Please enter a valid invoice amount.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const activeStatus = overrideStatus || status;

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
    formData.append("status", activeStatus);
    if (notes) formData.append("notes", notes);
    if (billingPeriodStart) formData.append("billingPeriodStart", billingPeriodStart);
    if (billingPeriodEnd) formData.append("billingPeriodEnd", billingPeriodEnd);
    if (activeStatus === "Paid") {
      formData.append("paymentDate", paymentDate);
      formData.append("paymentMethod", paymentMethod);
    }

    try {
      const res = await saveInvoiceAction(formData);
      if (res.success && res.invoice) {
        toast({
          title: "Invoice Saved Successfully",
          description: `Invoice ${res.invoice.invoiceNumber} recorded in system.`,
          type: "success",
        });
        const destination = contractId ? `/contracts/${contractId}` : "/invoices";
        const now = new Date();
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setInvoiceNumberOverride(null);
        setNamingDate(now);
        setClientId("");
        setContractId("");
        setIssueDate(format(now, "yyyy-MM-dd"));
        setDueDate(format(addDays(now, 30), "yyyy-MM-dd"));
        setCurrency("EUR");
        setSubtotal("");
        setStatus("Sent");
        setPaymentDate(format(now, "yyyy-MM-dd"));
        setPaymentMethod("BankTransfer");
        setBillingPeriodStart("");
        setBillingPeriodEnd("");
        setNotes("");
        router.push(destination);
        router.refresh();
      } else {
        setError(res.error || "Failed to save invoice.");
      }
    } catch {
      setError("An unexpected error occurred while saving invoice.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bf-page max-w-5xl">
      {/* Top Header */}
      <div className="bf-page-header">
        <div className="flex items-center gap-3">
          <Link href="/invoices">
            <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Back to invoices">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="bf-title">

              New invoice
            </h1>
            <p className="bf-subtitle">
              Add the details and attach your invoice when you’re ready.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit("Draft")}
            isLoading={isLoading}
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit(status)}
            isLoading={isLoading}
            className=""
          >
            Save Invoice
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Left Upload Zone & Right Financial Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: PDF File Upload (5 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Invoice PDF Document
              </CardTitle>
              <CardDescription className="text-xs">
                Upload a PDF now, or add one later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
              />

              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30"
                      : "border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  }`}
                >
                  <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                    Click to browse or drop PDF here
                  </p>
                  <p className="text-xs text-slate-500">PDF documents up to 25MB</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedFile(null)}
                      className="h-8 w-8 text-slate-400 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <FileCheck className="h-4 w-4" />
                    <span>Attached and ready to save</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Summary Card */}
          <Card className="bg-slate-50/50 dark:bg-slate-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatCurrency(Number(subtotal) || 0, currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Tax ({taxRate}%):</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatCurrency(Number(taxAmount) || 0, currency)}
                </span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between font-bold text-base text-slate-900 dark:text-white">
                <span>Total Amount:</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(Number(total) || 0, currency)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Invoice Details & Financials (7 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Invoice Details</CardTitle>
              <CardDescription className="text-xs">
                Client, dates and amount for this invoice.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Row 1: Invoice Number & Client */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Invoice Number *
                  </label>
                  <Input
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumberOverride(e.target.value)}
                    placeholder="F20261103-ALIZEE"
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] text-slate-500">
                    Editable to match your existing document number.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Client *
                  </label>
                  <select
                    required
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      setContractId("");
                      setInvoiceNumberOverride(null);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 transition-colors shadow-xs"
                  >
                    <option value="" disabled>Select Client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Linked Contract & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Linked Contract (Optional)
                  </label>
                  <select
                    value={contractId}
                    onChange={(e) => handleContractChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 transition-colors shadow-xs"
                  >
                    <option value="">No linked contract</option>
                    {clientContracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({formatCurrency(c.amount, c.currency)} / {c.billingFrequency})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 transition-colors shadow-xs"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF (CHF)</option>
                    <option value="CAD">CAD (CA$)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Issue Date *
                  </label>
                  <Input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Due Date *
                  </label>
                  <Input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Financial Inputs: Subtotal, Tax Rate, Tax Amount, Total */}
              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Financial Amounts
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Subtotal (excl. VAT) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={subtotal}
                      onChange={(e) => setSubtotal(e.target.value)}
                      placeholder="1000.00"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Tax Rate (%)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={taxRate}
                      readOnly
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Tax Amount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={taxAmount}
                      readOnly
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Total Amount (incl. VAT) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={total}
                    readOnly
                    placeholder="0.00"
                    className="text-base font-bold text-indigo-600 dark:text-indigo-400"
                  />
                </div>
              </div>

              {/* Status & Payment Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Current Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 transition-colors shadow-xs"
                  >
                    <option value="Sent">Sent (Awaiting Payment)</option>
                    <option value="Paid">Paid (Already Received)</option>
                    <option value="Draft">Draft (Unsent)</option>
                    <option value="PartiallyPaid">Partially Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>

                {status === "Paid" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 transition-colors shadow-xs"
                    >
                      <option value="BankTransfer">Bank Wire / Transfer</option>
                      <option value="Card">Credit / Debit Card</option>
                      <option value="PayPal">PayPal</option>
                      <option value="Cash">Cash</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
              </div>

              {status === "Paid" && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                      Got Paid At (Payment Date) *
                    </label>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      Actual receipt date in bank account
                    </span>
                  </div>
                  <Input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700 text-sm"
                  />
                  <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400/90">
                    Useful when you sent the invoice at month end (e.g. 30th) but received the funds at the start of next month (e.g. 2nd).
                  </p>
                </div>
              )}

              {/* Optional Billing Period (for Retainers) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Service Period Start (Optional)
                  </label>
                  <Input
                    type="date"
                    value={billingPeriodStart}
                    onChange={(e) => setBillingPeriodStart(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Service Period End (Optional)
                  </label>
                  <Input
                    type="date"
                    value={billingPeriodEnd}
                    onChange={(e) => setBillingPeriodEnd(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Notes &amp; Description
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional internal remarks or invoice service description..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 shadow-xs"
                />
              </div>

              {/* Bottom Action Button */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => handleSubmit(status)}
                  isLoading={isLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Save &amp; Record Invoice in Ledger
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
