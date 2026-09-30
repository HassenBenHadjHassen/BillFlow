"use server";

import { requireAuth } from "@/lib/auth";
import { ClientSchema } from "@/schemas";
import { ClientService } from "@/services/client.service";
import { revalidatePath } from "next/cache";

export async function createClientAction(formData: unknown) {
  await requireAuth();
  const parse = ClientSchema.safeParse(formData);
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const client = await ClientService.createClient(parse.data);
    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { success: true, client };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateClientAction(id: string, formData: unknown) {
  await requireAuth();
  const parse = ClientSchema.safeParse(formData);
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const client = await ClientService.updateClient(id, parse.data);
    revalidatePath(`/clients/${id}`);
    revalidatePath("/clients");
    return { success: true, client };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function archiveClientAction(id: string) {
  await requireAuth();
  try {
    await ClientService.archiveClient(id);
    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
