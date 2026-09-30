"use server";

import { requireAuth } from "@/lib/auth";
import { ContractSchema, RenewContractSchema } from "@/schemas";
import { ContractService } from "@/services/contract.service";
import { revalidatePath } from "next/cache";

export async function createContractAction(formData: unknown) {
  await requireAuth();

  let fileInfo: { buffer: Buffer; fileName: string; mimeType: string } | null = null;
  let rawData: Record<string, any> = {};

  if (formData instanceof FormData) {
    for (const [key, value] of formData.entries()) {
      if (key === "file" && value instanceof File && value.size > 0) {
        const arrayBuf = await value.arrayBuffer();
        fileInfo = {
          buffer: Buffer.from(arrayBuf),
          fileName: value.name,
          mimeType: value.type || "application/pdf",
        };
      } else if (key === "autoSetupRecurring") {
        rawData[key] = String(value) === "true";
      } else {
        rawData[key] = value;
      }
    }
  } else if (typeof formData === "object" && formData !== null) {
    rawData = formData as Record<string, any>;
  }

  const parse = ContractSchema.safeParse(rawData);
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const contract = await ContractService.createContract(parse.data, fileInfo);
    revalidatePath("/contracts");
    revalidatePath(`/clients/${contract.clientId}`);
    revalidatePath("/dashboard");
    revalidatePath("/recurring");
    return { success: true, contract };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function attachContractDocumentAction(contractId: string, formData: FormData) {
  await requireAuth();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Please select a contract document (PDF) to upload" };
  }

  try {
    const arrayBuf = await file.arrayBuffer();
    const fileUrl = await ContractService.attachContractDocument(contractId, {
      buffer: Buffer.from(arrayBuf),
      fileName: file.name,
      mimeType: file.type || "application/pdf",
    });
    revalidatePath(`/contracts/${contractId}`);
    revalidatePath("/contracts");
    revalidatePath("/documents");
    return { success: true, fileUrl };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateContractAction(id: string, formData: unknown) {
  await requireAuth();
  const parse = ContractSchema.partial().safeParse(formData);
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const contract = await ContractService.updateContract(id, parse.data);
    revalidatePath(`/contracts/${id}`);
    revalidatePath("/contracts");
    revalidatePath("/dashboard");
    return { success: true, contract };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function renewContractAction(formData: unknown) {
  await requireAuth();
  const parse = RenewContractSchema.safeParse(formData);
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const newContract = await ContractService.renewContract(parse.data);
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${newContract.id}`);
    revalidatePath(`/contracts/${parse.data.contractId}`);
    revalidatePath("/dashboard");
    revalidatePath("/recurring");
    return { success: true, contract: newContract };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function archiveContractAction(id: string) {
  await requireAuth();
  try {
    await ContractService.archiveContract(id);
    revalidatePath("/contracts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
