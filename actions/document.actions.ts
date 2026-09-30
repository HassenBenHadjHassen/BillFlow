"use server";

import { requireAuth } from "@/lib/auth";
import { DocumentService } from "@/services/document.service";
import { revalidatePath } from "next/cache";

export async function uploadDocumentAction(formData: FormData) {
  await requireAuth();

  try {
    const file = formData.get("file") as File;
    if (!file || !file.name) {
      return { success: false, error: "Please select a file to upload" };
    }

    const type = (formData.get("type") as string) || "Other";
    const clientId = (formData.get("clientId") as string) || null;
    const contractId = (formData.get("contractId") as string) || null;
    const invoiceId = (formData.get("invoiceId") as string) || null;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const doc = await DocumentService.uploadDocument(
      buffer,
      file.name,
      file.type || "application/octet-stream",
      type,
      { clientId, contractId, invoiceId }
    );

    revalidatePath("/documents");
    if (clientId) revalidatePath(`/clients/${clientId}`);
    if (contractId) revalidatePath(`/contracts/${contractId}`);
    if (invoiceId) revalidatePath(`/invoices/${invoiceId}`);

    return { success: true, document: doc };
  } catch (err: unknown) {
    console.error("Document upload error:", err);
    return { success: false, error: (err as Error).message || "Upload failed" };
  }
}

export async function deleteDocumentAction(id: string) {
  await requireAuth();

  try {
    await DocumentService.deleteDocument(id);
    revalidatePath("/documents");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
