"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recordPaymentAction } from "@/actions/payment.actions";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  defaultAmount: number;
  currency?: string;
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  defaultAmount,
  currency = "EUR",
}: PaymentFormDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [amount, setAmount] = React.useState<number | string>(defaultAmount);
  const [paymentDate, setPaymentDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = React.useState<"BankTransfer" | "Cash" | "Card" | "PayPal" | "Other">("BankTransfer");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setAmount(defaultAmount);
      setPaymentDate(format(new Date(), "yyyy-MM-dd"));
      setError(null);
    }
  }, [open, defaultAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload = {
      invoiceId,
      amount: Number(amount),
      paymentDate,
      paymentMethod,
      reference: reference || null,
      notes: notes || null,
    };

    try {
      const res = await recordPaymentAction(payload);
      if (res.success) {
        toast({
          title: "Payment Recorded",
          description: `Payment of ${amount} ${currency} applied to ${invoiceNumber}.`,
          type: "success",
        });
        onOpenChange(false);
        router.refresh();
      } else {
        setError(res.error || "Failed to record payment");
      }
    } catch {
      setError("An unexpected error occurred while recording payment.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogDescription>
          Apply a full or partial payment to Invoice #{invoiceNumber}
        </DialogDescription>
      </DialogHeader>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Amount Received ({currency}) *
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Date *</label>
            <Input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
            >
              <option value="BankTransfer">Bank Transfer</option>
              <option value="Card">Credit Card</option>
              <option value="PayPal">PayPal</option>
              <option value="Cash">Cash</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Reference / Transaction ID</label>
            <Input
              placeholder="e.g. WIRE-849204"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Notes</label>
            <Input
              placeholder="Optional notes or receipt references"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Record Payment
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
