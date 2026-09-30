"use server";

import { requireAuth } from "@/lib/auth";
import { InvoiceSchema } from "@/schemas";
import { InvoiceService } from "@/services/invoice.service";
import { revalidatePath } from "next/cache";

export async function createInvoiceAction(formData: unknown, options?: { autoSend?: boolean }) {
  await requireAuth();
  const parse = InvoiceSchema.safeParse(formData);
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const invoice = await InvoiceService.createInvoice(parse.data, options);
    revalidatePath("/invoices");
    revalidatePath(`/clients/${invoice.clientId}`);
    if (invoice.contractId) revalidatePath(`/contracts/${invoice.contractId}`);
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true, invoice };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateInvoiceStatusAction(id: string, newStatus: string) {
  await requireAuth();
  try {
    const invoice = await InvoiceService.updateInvoiceStatus(id, newStatus);
    revalidatePath(`/invoices/${id}`);
    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    return { success: true, invoice };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function regeneratePdfAction(invoiceId: string) {
  await requireAuth();
  try {
    const pdfUrl = await InvoiceService.regeneratePdf(invoiceId);
    revalidatePath(`/invoices/${invoiceId}`);
    return { success: true, pdfUrl };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function archiveInvoiceAction(id: string) {
  await requireAuth();
  try {
    await InvoiceService.archiveInvoice(id);
    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
