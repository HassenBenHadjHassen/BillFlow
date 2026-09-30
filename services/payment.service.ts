import db from "@/lib/db";
import { PaymentInput } from "@/schemas";
import { calculateInvoicePaymentStatus, roundMoney } from "@/lib/financial";

export class PaymentService {
  /**
   * Records a payment against an invoice and updates invoice status accordingly
   */
  static async recordPayment(data: PaymentInput) {
    const paymentAmount = roundMoney(data.amount);
    const paymentDate = new Date(data.paymentDate);

    return db.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
        include: { payments: true },
      });

      if (!invoice) throw new Error("Invoice not found");

      // Calculate existing paid amount
      const existingPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      const newTotalPaid = roundMoney(existingPaid + paymentAmount);

      // Create payment
      const payment = await tx.payment.create({
        data: {
          invoiceId: data.invoiceId,
          amount: paymentAmount,
          paymentDate,
          paymentMethod: data.paymentMethod,
          reference: data.reference || null,
          notes: data.notes || null,
        },
      });

      // Recalculate status
      const paymentStatus = calculateInvoicePaymentStatus(
        invoice.total,
        newTotalPaid,
        invoice.dueDate,
        invoice.status
      );

      // Update invoice status and paymentDate if fully paid
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: paymentStatus.status,
          paymentDate: paymentStatus.status === "Paid" ? paymentDate : invoice.paymentDate,
        },
      });

      return payment;
    });
  }

  static async deletePayment(paymentId: string) {
    return db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { invoice: { include: { payments: true } } },
      });

      if (!payment) throw new Error("Payment not found");

      // Delete payment
      await tx.payment.delete({
        where: { id: paymentId },
      });

      // Recalculate remaining payments
      const remainingPayments = payment.invoice.payments.filter((p) => p.id !== paymentId);
      const newPaidTotal = roundMoney(remainingPayments.reduce((sum, p) => sum + p.amount, 0));

      const newStatus = calculateInvoicePaymentStatus(
        payment.invoice.total,
        newPaidTotal,
        payment.invoice.dueDate,
        payment.invoice.status
      );

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: newStatus.status,
          paymentDate: newStatus.status === "Paid" ? payment.invoice.paymentDate : null,
        },
      });

      return { success: true };
    });
  }

  static async getPayments(invoiceId?: string) {
    return db.payment.findMany({
      where: invoiceId ? { invoiceId } : undefined,
      orderBy: { paymentDate: "desc" },
      include: {
        invoice: {
          include: { client: true },
        },
      },
    });
  }
}
