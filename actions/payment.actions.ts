"use server";

import { requireAuth } from "@/lib/auth";
import { PaymentSchema, UpdatePaymentDateSchema } from "@/schemas";
import { PaymentService } from "@/services/payment.service";
import { revalidatePath } from "next/cache";

export async function recordPaymentAction(formData: unknown) {
  await requireAuth();
  const parse = PaymentSchema.safeParse(formData);
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const payment = await PaymentService.recordPayment(parse.data);
    revalidatePath(`/invoices/${parse.data.invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true, payment };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updatePaymentDateAction(paymentId: string, paymentDate: string, invoiceId?: string) {
  await requireAuth();
  const parse = UpdatePaymentDateSchema.safeParse({ paymentId, paymentDate });
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const payment = await PaymentService.updatePaymentDate(parse.data.paymentId, parse.data.paymentDate);
    if (invoiceId) revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true, payment };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deletePaymentAction(paymentId: string, invoiceId: string) {
  await requireAuth();
  try {
    await PaymentService.deletePayment(paymentId);
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
