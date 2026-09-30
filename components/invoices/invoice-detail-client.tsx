"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Download,
  RotateCw,
  CreditCard,
  Building2,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  FileText,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaymentFormDialog } from "@/components/payments/payment-form-dialog";
import { updateInvoiceStatusAction, regeneratePdfAction } from "@/actions/invoice.actions";
import { deletePaymentAction } from "@/actions/payment.actions";
import { formatCurrency } from "@/lib/financial";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export function InvoiceDetailClient({ invoice }: { invoice: any }) {
  const router = useRouter();
  const { toast } = useToast();
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [isRegenerating, setIsRegenerating] = React.useState(false);

  const handleStatusChange = async (newStatus: string) => {
    const res = await updateInvoiceStatusAction(invoice.id, newStatus);
    if (res.success) {
      toast({ title: "Status Updated", description: `Invoice is now ${newStatus}.`, type: "success" });
      router.refresh();
    } else {
      toast({ title: "Error", description: res.error, type: "error" });
    }
  };

  const handleRegeneratePdf = async () => {
    setIsRegenerating(true);
    try {
      const res = await regeneratePdfAction(invoice.id);
      if (res.success) {
        toast({ title: "PDF Regenerated", description: "Invoice PDF has been regenerated.", type: "success" });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error, type: "error" });
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to remove this payment record? The invoice status will be recalculated.")) {
      return;
    }
    const res = await deletePaymentAction(paymentId, invoice.id);
    if (res.success) {
      toast({ title: "Payment Removed", description: "Invoice balance has been recalculated.", type: "info" });
      router.refresh();
    } else {
      toast({ title: "Error", description: res.error, type: "error" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge variant="success">Paid</Badge>;
      case "Sent":
        return <Badge variant="indigo">Sent</Badge>;
      case "PartiallyPaid":
        return <Badge variant="warning">Partially Paid</Badge>;
      case "Overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "Cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/invoices">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 font-semibold">{invoice.invoiceNumber}</span>
              {getStatusBadge(invoice.computedStatus || invoice.status)}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
              Invoice #{invoice.invoiceNumber}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {invoice.computedStatus !== "Paid" && invoice.status !== "Cancelled" && (
            <Button
              onClick={() => setPaymentDialogOpen(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <CreditCard className="h-4 w-4" /> Record Payment
            </Button>
          )}

          {invoice.pdfUrl && (
            <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Download PDF
              </Button>
            </a>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRegeneratePdf}
            isLoading={isRegenerating}
            className="gap-1.5"
          >
            <RotateCw className="h-3.5 w-3.5" /> Regenerate PDF
          </Button>

          {invoice.status === "Draft" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleStatusChange("Sent")}
              className="text-xs"
            >
              Mark as Sent
            </Button>
          )}

          {invoice.status !== "Cancelled" && invoice.status !== "Paid" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleStatusChange("Cancelled")}
              className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(invoice.total, invoice.currency)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Includes {invoice.taxRate}% VAT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount Paid</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(invoice.amountPaid || 0, invoice.currency)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {invoice.payments.length} payment{invoice.payments.length === 1 ? "" : "s"} applied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining Balance</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className={`text-xl font-bold ${invoice.remainingBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
              {formatCurrency(invoice.remainingBalance || 0, invoice.currency)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {invoice.remainingBalance === 0 ? "Paid in full" : `Due by ${format(new Date(invoice.dueDate), "dd MMM yyyy")}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Invoice Card (Paper Document Look) */}
      <Card className="p-6 sm:p-8 space-y-6">
        {/* Invoice Header: Client & Meta Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider mb-2">Billed To</span>
            <Link href={`/clients/${invoice.clientId}`} className="text-base font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5">
              <Building2 className="h-4 w-4" /> {invoice.client.companyName}
            </Link>
            {invoice.client.contactName && (
              <p className="text-xs text-slate-500 mt-1">Attn: {invoice.client.contactName}</p>
            )}
            <p className="text-xs text-slate-500 mt-0.5">{invoice.client.email}</p>
            {invoice.client.address && (
              <p className="text-xs text-slate-500 mt-0.5">
                {[invoice.client.address, invoice.client.city, invoice.client.country].filter(Boolean).join(", ")}
              </p>
            )}
            {invoice.client.vatNumber && (
              <p className="text-xs text-slate-400 mt-1 font-mono">VAT: {invoice.client.vatNumber}</p>
            )}
          </div>

          <div className="sm:text-right space-y-1.5 text-xs text-slate-500">
            <div>
              <span className="text-slate-400 uppercase font-semibold text-[10px] block">Issue Date</span>
              <span className="font-semibold text-slate-900 dark:text-white text-sm">
                {format(new Date(invoice.issueDate), "dd MMMM yyyy")}
              </span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold text-[10px] block">Due Date</span>
              <span className="font-semibold text-slate-900 dark:text-white text-sm">
                {format(new Date(invoice.dueDate), "dd MMMM yyyy")}
              </span>
            </div>
            {invoice.contract && (
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Contract Reference</span>
                <Link href={`/contracts/${invoice.contract.id}`} className="font-semibold text-indigo-600 hover:underline">
                  {invoice.contract.contractNumber} - {invoice.contract.title}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5">Description</th>
                <th className="py-2.5 text-right">Quantity</th>
                <th className="py-2.5 text-right">Unit Price</th>
                <th className="py-2.5 text-right">Tax</th>
                <th className="py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoice.items.map((item: any) => (
                <tr key={item.id}>
                  <td className="py-3 font-medium text-slate-900 dark:text-white">{item.description}</td>
                  <td className="py-3 text-right text-slate-600 dark:text-slate-400">{item.quantity}</td>
                  <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                    {formatCurrency(item.unitPrice, invoice.currency)}
                  </td>
                  <td className="py-3 text-right text-slate-500">{item.taxRate}%</td>
                  <td className="py-3 text-right font-bold text-slate-900 dark:text-white">
                    {formatCurrency(item.total, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal (HT):</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatCurrency(invoice.subtotal, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>VAT ({invoice.taxRate}%):</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatCurrency(invoice.taxAmount, invoice.currency)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-base font-bold text-slate-900 dark:text-white">
              <span>Total (TTC):</span>
              <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-semibold pt-1">
              <span>Amount Paid:</span>
              <span>{formatCurrency(invoice.amountPaid || 0, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-amber-600 font-bold">
              <span>Balance Due:</span>
              <span>{formatCurrency(invoice.remainingBalance || 0, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {/* Invoice Notes */}
        {invoice.notes && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">Notes / Terms</span>
            <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </Card>

      {/* Payment History Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Payment History</CardTitle>
            <CardDescription>All payments recorded against this invoice</CardDescription>
          </div>
          {invoice.remainingBalance > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPaymentDialogOpen(true)}
              className="gap-1.5 text-xs"
            >
              <CreditCard className="h-3.5 w-3.5" /> Add Payment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {invoice.payments.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No payments recorded yet for this invoice.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoice.payments.map((p: any) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        +{formatCurrency(p.amount, invoice.currency)}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{p.paymentMethod}</Badge>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {format(new Date(p.paymentDate), "dd MMM yyyy")}
                      {p.reference && ` &bull; Ref: ${p.reference}`}
                      {p.notes && ` &bull; ${p.notes}`}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeletePayment(p.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Remove Payment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <PaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        defaultAmount={invoice.remainingBalance || invoice.total}
        currency={invoice.currency}
      />
    </div>
  );
}
