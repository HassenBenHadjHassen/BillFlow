"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { renewContractAction } from "@/actions/contract.actions";
import { useToast } from "@/components/ui/toast";
import { ContractDTO } from "@/types";
import { addYears, format } from "date-fns";

interface RenewContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractDTO;
}

export function RenewContractDialog({ open, onOpenChange, contract }: RenewContractDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState(contract.title);
  const [contractNumber, setContractNumber] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [renewalDate, setRenewalDate] = React.useState("");
  const [amount, setAmount] = React.useState(contract.amount);
  const [billingFrequency, setBillingFrequency] = React.useState(contract.billingFrequency);
  const [paymentTerms, setPaymentTerms] = React.useState(contract.paymentTerms);
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (contract && open) {
      setTitle(contract.title);
      const nextNum = `${contract.contractNumber}-R${new Date().getFullYear()}`;
      setContractNumber(nextNum);

      // Start date is day after previous end date or today
      const prevEnd = contract.endDate ? new Date(contract.endDate) : new Date();
      const newStart = prevEnd;
      const newEnd = addYears(newStart, 1);

      setStartDate(format(newStart, "yyyy-MM-dd"));
      setEndDate(format(newEnd, "yyyy-MM-dd"));
      setAmount(contract.amount);
      setBillingFrequency(contract.billingFrequency);
      setPaymentTerms(contract.paymentTerms);
      setNotes(`Renewed from previous agreement #${contract.contractNumber}`);
    }
  }, [contract, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload = {
      contractId: contract.id,
      title,
      contractNumber,
      startDate,
      endDate: endDate || null,
      renewalDate: renewalDate || null,
      amount: Number(amount),
      billingFrequency,
      paymentTerms: Number(paymentTerms),
      notes: notes || null,
    };

    try {
      const res = await renewContractAction(payload);
      if (res.success && res.contract) {
        toast({
          title: "Contract Renewed",
          description: `New active version ${contractNumber} created. Historical contract preserved.`,
          type: "success",
        });
        onOpenChange(false);
        router.push(`/contracts/${res.contract.id}`);
        router.refresh();
      } else {
        setError(res.error || "Failed to renew contract");
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
        <DialogTitle>Renew Contract</DialogTitle>
        <DialogDescription>
          Preserve the existing contract in historical records and issue a new active contract agreement.
        </DialogDescription>
      </DialogHeader>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Renewed Title *</label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Contract Number *</label>
            <Input required value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Amount ({contract.currency}) *</label>
            <Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Start Date *</label>
            <Input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">New End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Frequency</label>
            <select
              value={billingFrequency}
              onChange={(e) => setBillingFrequency(e.target.value as any)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
              <option value="One-time">One-time</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Terms</label>
            <Input type="number" value={paymentTerms} onChange={(e) => setPaymentTerms(Number(e.target.value))} />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Renewal Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Confirm Renewal</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
