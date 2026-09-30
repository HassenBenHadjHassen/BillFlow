"use server";

import { requireAuth } from "@/lib/auth";
import { ContractSchema, RenewContractSchema } from "@/schemas";
import { ContractService } from "@/services/contract.service";
import { revalidatePath } from "next/cache";

export async function createContractAction(formData: unknown) {
  await requireAuth();
  const parse = ContractSchema.safeParse(formData);
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const contract = await ContractService.createContract(parse.data);
    revalidatePath("/contracts");
    revalidatePath(`/clients/${contract.clientId}`);
    revalidatePath("/dashboard");
    revalidatePath("/recurring");
    return { success: true, contract };
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
