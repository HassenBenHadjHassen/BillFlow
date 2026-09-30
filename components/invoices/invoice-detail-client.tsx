"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Download,
  UploadCloud,
  CreditCard,
  Building2,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  FileText,
  Clock,
  ExternalLink,
  FileCheck,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PaymentFormDialog } from "@/components/payments/payment-form-dialog";
import {
  updateInvoiceStatusAction,
  attachInvoicePdfAction,
  regeneratePdfAction,
  attachInvoiceToContractAction,
  updateInvoicePaymentDateAction,
} from "@/actions/invoice.actions";
import { deletePaymentAction, updatePaymentDateAction } from "@/actions/payment.actions";
import { formatCurrency } from "@/lib/financial";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export function InvoiceDetailClient({
  invoice,
  availableContracts = [],
}: {
  invoice: any;
  availableContracts?: any[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [invoiceData, setInvoiceData] = React.useState(invoice);
  React.useEffect(() => {
    setInvoiceData(invoice);
  }, [invoice]);

  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = React.useState(false);
  const [isRegenerating, setIsRegenerating] = React.useState(false);

  const [attachContractDialogOpen, setAttachContractDialogOpen] = React.useState(false);
  const [selectedContractId, setSelectedContractId] = React.useState(invoiceData.contractId || "");
  const [isAttachingContract, setIsAttachingContract] = React.useState(false);

  const [editPaymentDateDialogOpen, setEditPaymentDateDialogOpen] = React.useState(false);
  const [editPaymentDateValue, setEditPaymentDateValue] = React.useState(
    invoiceData.paymentDate
      ? format(new Date(invoiceData.paymentDate), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd")
  );
  const [editingPaymentId, setEditingPaymentId] = React.useState<string | null>(null);
  const [isUpdatingPaymentDate, setIsUpdatingPaymentDate] = React.useState(false);

  React.useEffect(() => {
    setSelectedContractId(invoiceData.contractId || "");
  }, [invoiceData.contractId]);

  const handleSavePaymentDate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPaymentDate(true);
    try {
      if (editingPaymentId) {
        const res = await updatePaymentDateAction(editingPaymentId, editPaymentDateValue, invoiceData.id);
        if (res.success) {
          toast({
            title: "Payment Date Updated",
            description: `Payment date set to ${format(new Date(editPaymentDateValue), "dd MMMM yyyy")}.`,
            type: "success",
          });
          setEditPaymentDateDialogOpen(false);
          router.refresh();
        } else {
          toast({ title: "Error", description: res.error || "Failed to update payment date", type: "error" });
        }
      } else {
        const res = await updateInvoicePaymentDateAction(invoiceData.id, editPaymentDateValue);
        if (res.success && res.invoice) {
          toast({
            title: "Got Paid Date Updated",
            description: `Invoice marked as paid on ${format(new Date(editPaymentDateValue), "dd MMMM yyyy")}.`,
            type: "success",
          });
          setInvoiceData(res.invoice);
          setEditPaymentDateDialogOpen(false);
          router.refresh();
        } else {
          toast({ title: "Error", description: res.error || "Failed to update payment date", type: "error" });
        }
      }
    } catch {
      toast({ title: "Error", description: "Failed to update payment date", type: "error" });
    } finally {
      setIsUpdatingPaymentDate(false);
    }
  };

  const handleAttachContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAttachingContract(true);
    try {
      const res = await attachInvoiceToContractAction(
        invoiceData.id,
        selectedContractId ? selectedContractId : null
      );
      if (res.success && res.invoice) {
        toast({
          title: selectedContractId ? "Contract Attached" : "Contract Unlinked",
          description: selectedContractId
            ? `Invoice linked to ${res.invoice.contract?.contractNumber || "contract"}.`
            : "Invoice is now standalone.",
          type: "success",
        });
        setInvoiceData(res.invoice);
        setAttachContractDialogOpen(false);
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error || "Failed to attach contract", type: "error" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update contract linkage", type: "error" });
    } finally {
      setIsAttachingContract(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const res = await updateInvoiceStatusAction(invoiceData.id, newStatus);
    if (res.success && res.invoice) {
      toast({ title: "Status Updated", description: `Invoice is now ${newStatus}.`, type: "success" });
      setInvoiceData(res.invoice);
      router.refresh();
    } else {
      toast({ title: "Error", description: res.error, type: "error" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Invalid File", description: "Please select a PDF document file.", type: "error" });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "PDF file cannot exceed 25MB.", type: "error" });
      return;
    }

    setIsUploadingPdf(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await attachInvoicePdfAction(invoice.id, formData);
      if (res.success) {
        toast({
          title: "PDF Document Attached",
          description: "Invoice document has been uploaded and stored in your secure vault.",
          type: "success",
        });
        router.refresh();
      } else {
        toast({ title: "Upload Failed", description: res.error, type: "error" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to upload invoice PDF.", type: "error" });
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleRegeneratePdf = async () => {
    setIsRegenerating(true);
    try {
      const res = await regeneratePdfAction(invoice.id);
      if (res.success) {
        toast({ title: "PDF Generated", description: "Invoice PDF has been generated.", type: "success" });
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
      {/* Hidden file input for attaching/replacing PDF */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileUpload}
      />

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

          {(invoiceData.status === "Paid" || invoiceData.paymentDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingPaymentId(null);
                setEditPaymentDateValue(
                  invoiceData.paymentDate
                    ? format(new Date(invoiceData.paymentDate), "yyyy-MM-dd")
                    : format(new Date(), "yyyy-MM-dd")
                );
                setEditPaymentDateDialogOpen(true);
              }}
              className="gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
            >
              <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                Got Paid: {invoiceData.paymentDate ? format(new Date(invoiceData.paymentDate), "dd MMM yyyy") : "Set Date"}
              </span>
            </Button>
          )}

          {invoice.pdfUrl ? (
            <>
              <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Open / Download PDF
                </Button>
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                isLoading={isUploadingPdf}
                className="gap-1.5"
              >
                <UploadCloud className="h-3.5 w-3.5" /> Replace PDF
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploadingPdf}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <UploadCloud className="h-3.5 w-3.5" /> Attach Invoice PDF
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAttachContractDialogOpen(true)}
            className="gap-1.5"
          >
            <FileCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{invoiceData.contract ? "Change Contract" : "Attach to Contract"}</span>
          </Button>

          {invoiceData.status === "Draft" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleStatusChange("Sent")}
              className="text-xs"
            >
              Mark as Sent
            </Button>
          )}

          {invoiceData.status !== "Cancelled" && invoiceData.status !== "Paid" && (
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
              {invoice.payments?.length || 0} payment{(invoice.payments?.length || 0) === 1 ? "" : "s"} applied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining Balance</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className={`text-xl font-bold ${(invoice.remainingBalance || 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
              {formatCurrency(invoice.remainingBalance || 0, invoice.currency)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {(invoice.remainingBalance || 0) === 0 ? "Paid in full" : `Due by ${format(new Date(invoice.dueDate), "dd MMM yyyy")}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attached PDF Preview Card */}
      {invoice.pdfUrl ? (
        <Card className="overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 py-3.5 px-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <CardTitle className="text-sm font-semibold">Attached Invoice PDF</CardTitle>
                <CardDescription className="text-xs">Stored in private in-project vault</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" /> Fullscreen
                </Button>
              </a>
              <a href={invoice.pdfUrl} download={`Invoice_${invoice.invoiceNumber}.pdf`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
              </a>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <iframe
              src={invoice.pdfUrl}
              className="w-full h-[550px] border-none"
              title={`Invoice ${invoice.invoiceNumber}`}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="p-6 border-dashed border-2 text-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="max-w-md mx-auto space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No PDF Document Attached Yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Attach your invoice PDF to preserve the original document in your local vault and view it here anytime.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploadingPdf}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <UploadCloud className="h-4 w-4 mr-1.5" /> Upload Invoice PDF
            </Button>
          </div>
        </Card>
      )}

      {/* Main Invoice Information Card */}
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
            <div>
              <span className="text-slate-400 uppercase font-semibold text-[10px] block">Got Paid At</span>
              {(invoiceData.paymentDate || invoiceData.status === "Paid") ? (
                <div className="flex items-center sm:justify-end gap-1.5 mt-0.5">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {invoiceData.paymentDate
                      ? format(new Date(invoiceData.paymentDate), "dd MMMM yyyy")
                      : "Paid"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingPaymentId(null);
                      setEditPaymentDateValue(
                        invoiceData.paymentDate
                          ? format(new Date(invoiceData.paymentDate), "yyyy-MM-dd")
                          : format(new Date(), "yyyy-MM-dd")
                      );
                      setEditPaymentDateDialogOpen(true);
                    }}
                    className="h-5 px-1.5 text-[10px] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-medium"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="flex items-center sm:justify-end gap-1.5 mt-0.5">
                  <span className="text-slate-400 italic">Not paid yet</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingPaymentId(null);
                      setEditPaymentDateValue(format(new Date(), "yyyy-MM-dd"));
                      setEditPaymentDateDialogOpen(true);
                    }}
                    className="h-5 px-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-medium"
                  >
                    Set Date
                  </Button>
                </div>
              )}
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold text-[10px] block">Contract Reference</span>
              {invoiceData.contract ? (
                <div className="flex items-center sm:justify-end gap-2">
                  <Link href={`/contracts/${invoiceData.contract.id}`} className="font-semibold text-indigo-600 hover:underline">
                    {invoiceData.contract.contractNumber} &bull; {invoiceData.contract.title}
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] text-slate-400 hover:text-indigo-600"
                    onClick={() => setAttachContractDialogOpen(true)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="flex items-center sm:justify-end gap-2 mt-0.5">
                  <span className="text-slate-400 italic">No contract linked</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                    onClick={() => setAttachContractDialogOpen(true)}
                  >
                    <FileCheck className="h-3 w-3" /> Attach to Contract
                  </Button>
                </div>
              )}
            </div>
            {invoice.billingPeriodStart && invoice.billingPeriodEnd && (
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Billing Period</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {format(new Date(invoice.billingPeriodStart), "dd MMM yyyy")} — {format(new Date(invoice.billingPeriodEnd), "dd MMM yyyy")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* If line items exist, display line items table */}
        {invoice.items && invoice.items.length > 0 && (
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
        )}

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
            <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">Notes / Description</span>
            <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </Card>

      {/* Payment History Card */}
      <Card>
        <CardHeader className="p-6 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Payment Ledger &amp; Remittance ({invoice.payments?.length || 0})
            </CardTitle>
            <CardDescription className="text-xs">
              Every applied payment transaction and payment method.
            </CardDescription>
          </div>
          {invoice.computedStatus !== "Paid" && invoice.status !== "Cancelled" && (
            <Button
              size="sm"
              onClick={() => setPaymentDialogOpen(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              <CreditCard className="h-3.5 w-3.5" /> Record Payment
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {!invoice.payments || invoice.payments.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No payments recorded yet for this invoice.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Method</th>
                    <th className="py-2.5">Reference</th>
                    <th className="py-2.5 text-right">Amount</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoice.payments.map((p: any) => (
                    <tr key={p.id}>
                      <td className="py-3 font-medium text-slate-900 dark:text-white">
                        {format(new Date(p.paymentDate), "dd MMM yyyy")}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {p.paymentMethod}
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-500 font-mono text-xs">{p.reference || "—"}</td>
                      <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(p.amount, invoice.currency)}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Change Payment Date (Got Paid At)"
                            onClick={() => {
                              setEditingPaymentId(p.id);
                              setEditPaymentDateValue(format(new Date(p.paymentDate), "yyyy-MM-dd"));
                              setEditPaymentDateDialogOpen(true);
                            }}
                            className="h-7 w-7 text-slate-400 hover:text-emerald-600"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePayment(p.id)}
                            className="h-7 w-7 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <PaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoiceId={invoiceData.id}
        invoiceNumber={invoiceData.invoiceNumber}
        defaultAmount={invoiceData.remainingBalance || invoiceData.total}
        currency={invoiceData.currency}
      />

      {/* Attach to Contract Modal */}
      <Dialog open={attachContractDialogOpen} onOpenChange={setAttachContractDialogOpen}>
        <DialogHeader>
          <DialogTitle>Attach to Client Contract</DialogTitle>
          <DialogDescription>
            Link Invoice #{invoiceData.invoiceNumber} to an existing contract agreement for {invoiceData.client?.companyName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAttachContract} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Contract Agreement
            </label>
            {availableContracts.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
                <FileCheck className="h-6 w-6 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  No active contracts found for <strong>{invoiceData.client?.companyName}</strong>.
                </p>
                <Link
                  href="/contracts"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-block"
                >
                  Create a new contract under Contracts &rarr;
                </Link>
              </div>
            ) : (
              <select
                value={selectedContractId}
                onChange={(e) => setSelectedContractId(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              >
                <option value="">No contract (Standalone Invoice)</option>
                {availableContracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contractNumber} &bull; {c.title} ({formatCurrency(c.amount, c.currency)} / {c.billingFrequency})
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-400">
              Linking updates contract revenue tracking, lifetime billing history, and contract attachments.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setAttachContractDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isAttachingContract}
              disabled={availableContracts.length === 0 && !selectedContractId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {selectedContractId ? "Attach to Contract" : "Unlink Contract"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Payment Date (Got Paid At) Dialog */}
      <Dialog open={editPaymentDateDialogOpen} onOpenChange={setEditPaymentDateDialogOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {editingPaymentId ? "Change Payment Date" : "Set Got Paid At Date"}
          </DialogTitle>
          <DialogDescription>
            {editingPaymentId
              ? "Update the date this specific payment was received. This affects revenue reports and cash flow."
              : "Set the exact date you received this payment. Useful when the invoice was sent at month end but paid at the start of the next month."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSavePaymentDate} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Got Paid At (Payment Date) *
            </label>
            <input
              type="date"
              required
              value={editPaymentDateValue}
              onChange={(e) => setEditPaymentDateValue(e.target.value)}
              className="w-full h-10 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400">
              Example: Invoice issued 30th September → payment arrives 2nd October → set "2 October" here.
              Reports and revenue will correctly reflect the actual cash receipt date.
            </p>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-[11px] text-emerald-800 dark:text-emerald-200">
              {editingPaymentId
                ? "This will update the payment record date and sync the invoice payment date."
                : "This will mark the invoice as Paid and set the payment date accordingly."}
            </p>
          </div>

          <DialogFooter className="pt-1">
            <button
              type="button"
              onClick={() => setEditPaymentDateDialogOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              isLoading={isUpdatingPaymentDate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Save Date
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
