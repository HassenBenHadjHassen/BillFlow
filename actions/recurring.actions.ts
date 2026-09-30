"use server";

import { requireAuth } from "@/lib/auth";
import { RecurringBillingService } from "@/services/recurring.service";
import { revalidatePath } from "next/cache";

export async function generateRecurringInvoiceAction(recurringId: string, force: boolean = false) {
  await requireAuth();
  try {
    const result = await RecurringBillingService.generateInvoice(recurringId, force);
    revalidatePath("/recurring");
    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    return { success: true, result };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function generateAllDueInvoicesAction() {
  await requireAuth();
  try {
    const report = await RecurringBillingService.generateAllDueInvoices();
    revalidatePath("/recurring");
    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    return { success: true, report };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function advanceRecurringScheduleAction(recurringId: string) {
  await requireAuth();
  try {
    const updated = await RecurringBillingService.advanceSchedule(recurringId);
    revalidatePath("/recurring");
    revalidatePath("/dashboard");
    return { success: true, updated };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

