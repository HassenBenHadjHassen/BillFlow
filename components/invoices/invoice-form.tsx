"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, Receipt, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createInvoiceAction } from "@/actions/invoice.actions";
import { calculateInvoiceTotals, formatCurrency } from "@/lib/financial";
import { useToast } from "@/components/ui/toast";
import { ClientDTO, ContractDTO } from "@/types";
import { addDays, format } from "date-fns";

interface InvoiceItemForm {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export function InvoiceForm({
  clients,
  contracts,
  initialClientId,
  initialContractId,
}: {
  clients: ClientDTO[];
  contracts: ContractDTO[];
  initialClientId?: string;
  initialContractId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [clientId, setClientId] = React.useState(initialClientId || (clients[0]?.id || ""));
  const [contractId, setContractId] = React.useState(initialContractId || "");
  const [issueDate, setIssueDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = React.useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [currency, setCurrency] = React.useState("EUR");
  const [notes, setNotes] = React.useState("Thank you for your business. Payment is due within 30 days.");

  const [items, setItems] = React.useState<InvoiceItemForm[]>([
    {
      description: "Consulting & Engineering Services",
      quantity: 1,
      unitPrice: 1500,
      taxRate: 20,
    },
  ]);

  // When a contract is selected, optionally populate items
  const handleContractChange = (newContractId: string) => {
    setContractId(newContractId);
    if (newContractId) {
      const selected = contracts.find((c) => c.id === newContractId);
      if (selected) {
        setCurrency(selected.currency || "EUR");
        setItems([
          {
            description: `${selected.title} (${selected.billingFrequency} fee)`,
            quantity: 1,
            unitPrice: selected.amount,
            taxRate: 20,
          },
        ]);
        if (selected.paymentTerms) {
          setDueDate(format(addDays(new Date(issueDate), selected.paymentTerms), "yyyy-MM-dd"));
        }
      }
    }
  };

  // Filter contracts for selected client
  const clientContracts = contracts.filter((c) => c.clientId === clientId);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unitPrice: 0, taxRate: 20 },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItemForm, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Real-time calculation
  const totals = calculateInvoiceTotals(items);

  const handleSubmit = async (autoSend: boolean = false) => {
    setIsLoading(true);
    setError(null);

    const payload = {
      clientId,
      contractId: contractId || null,
      issueDate,
      dueDate,
      currency,
      notes,
      items: items.map((it) => ({
        description: it.description,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        taxRate: Number(it.taxRate),
      })),
    };

    try {
      const res = await createInvoiceAction(payload, { autoSend });
      if (res.success && res.invoice) {
        toast({
          title: autoSend ? "Invoice Issued & Sent" : "Invoice Created as Draft",
          description: `Invoice ${res.invoice.invoiceNumber} generated with PDF.`,
          type: "success",
        });
        router.push(`/invoices/${res.invoice.id}`);
        router.refresh();
      } else {
        setError(res.error || "Failed to create invoice");
      }
    } catch {
      setError("An unexpected error occurred while saving invoice.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/invoices">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              Create Invoice
            </h1>
            <p className="text-xs text-slate-500">
              Generate a professional sequential invoice with automated PDF archiving
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit(false)}
            isLoading={isLoading}
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit(true)}
            isLoading={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            Save &amp; Mark as Sent
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Invoice Form Card */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Metadata Row: Client, Contract, Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Client *</label>
              <select
                required
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setContractId("");
                }}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Contract Reference</label>
              <select
                value={contractId}
                onChange={(e) => handleContractChange(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              >
                <option value="">None (Ad-hoc Invoice)</option>
                {clientContracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contractNumber} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Issue Date *</label>
              <Input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Due Date *</label>
              <Input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Line Items
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Row
              </Button>
            </div>

            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-12 gap-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2">
                <span className="col-span-5">Description</span>
                <span className="col-span-2">Quantity</span>
                <span className="col-span-2">Unit Price</span>
                <span className="col-span-1">Tax (%)</span>
                <span className="col-span-1 text-right">Total</span>
                <span className="col-span-1 text-center">Del</span>
              </div>

              {items.map((item, index) => {
                const lineTotal = item.quantity * item.unitPrice;

                return (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 p-3 sm:p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg items-center">
                    <div className="col-span-1 sm:col-span-5">
                      <Input
                        required
                        placeholder="Description of service or product"
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-1">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        value={item.taxRate}
                        onChange={(e) => updateItem(index, "taxRate", Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-1 text-right text-xs font-bold text-slate-900 dark:text-white">
                      {formatCurrency(lineTotal, currency)}
                    </div>
                    <div className="col-span-1 sm:col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length <= 1}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-Time Totals Box & Notes */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Invoice Notes / Payment Instructions</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal (HT):</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totals.subtotal, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>VAT / Tax Total:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totals.taxAmount, currency)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-base font-bold text-slate-900 dark:text-white">
                <span>Total Amount (TTC):</span>
                <span className="text-indigo-600 dark:text-indigo-400 text-lg">{formatCurrency(totals.total, currency)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
