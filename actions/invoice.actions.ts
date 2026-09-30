"use server";

import { requireAuth } from "@/lib/auth";
import { InvoiceSchema, SaveInvoiceSchema, UpdateInvoicePaymentDateSchema } from "@/schemas";
import { InvoiceService } from "@/services/invoice.service";
import { revalidatePath } from "next/cache";

export async function saveInvoiceAction(input: unknown) {
  await requireAuth();

  let fileInfo: { buffer: Buffer; fileName: string; mimeType: string } | null = null;
  let rawData: Record<string, any> = {};

  if (input instanceof FormData) {
    for (const [key, value] of input.entries()) {
      if (key === "file" && value instanceof File && value.size > 0) {
        const arrayBuf = await value.arrayBuffer();
        fileInfo = {
          buffer: Buffer.from(arrayBuf),
          fileName: value.name,
          mimeType: value.type || "application/pdf",
        };
      } else {
        rawData[key] = value;
      }
    }
  } else if (typeof input === "object" && input !== null) {
    rawData = input as Record<string, any>;
  }

  const parse = SaveInvoiceSchema.safeParse(rawData);
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || "Validation failed" };
  }

  const paymentDate = parse.data.paymentDate || (rawData.paymentDate as string) || undefined;
  const paymentMethod = parse.data.paymentMethod || (rawData.paymentMethod as string) || undefined;

  try {
    const invoice = await InvoiceService.saveInvoiceWithFile(
      parse.data,
      fileInfo,
      {
        markAsPaid: parse.data.status === "Paid",
        paymentDate: paymentDate || parse.data.issueDate,
        paymentMethod: paymentMethod || "BankTransfer",
      }
    );
    revalidatePath("/invoices");
    revalidatePath(`/clients/${invoice.clientId}`);
    if (invoice.contractId) revalidatePath(`/contracts/${invoice.contractId}`);
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    revalidatePath("/recurring");
    return { success: true, invoice };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function attachInvoicePdfAction(invoiceId: string, formData: FormData) {
  await requireAuth();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Please select a PDF file to upload" };
  }

  try {
    const arrayBuf = await file.arrayBuffer();
    const pdfUrl = await InvoiceService.attachInvoicePdf(invoiceId, {
      buffer: Buffer.from(arrayBuf),
      fileName: file.name,
      mimeType: file.type || "application/pdf",
    });
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/documents");
    return { success: true, pdfUrl };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

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

export async function attachInvoiceToContractAction(invoiceId: string, contractId: string | null) {
  await requireAuth();
  try {
    const invoice = await InvoiceService.attachToContract(invoiceId, contractId);
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices");
    if (contractId) revalidatePath(`/contracts/${contractId}`);
    revalidatePath(`/clients/${invoice.clientId}`);
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true, invoice };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateInvoicePaymentDateAction(invoiceId: string, paymentDate: string) {
  await requireAuth();
  const parse = UpdateInvoicePaymentDateSchema.safeParse({ invoiceId, paymentDate });
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const invoice = await InvoiceService.updatePaymentDate(parse.data.invoiceId, parse.data.paymentDate);
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    revalidatePath(`/clients/${invoice.clientId}`);
    if (invoice.contractId) revalidatePath(`/contracts/${invoice.contractId}`);
    return { success: true, invoice };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
