"use server";

import { requireAuth } from "@/lib/auth";
import { CompanySettingsSchema } from "@/schemas";
import { SettingsService } from "@/services/settings.service";
import { revalidatePath } from "next/cache";

export async function updateCompanySettingsAction(formData: unknown) {
  await requireAuth();
  const parse = CompanySettingsSchema.safeParse(formData);
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const settings = await SettingsService.updateCompanySettings(parse.data);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true, settings };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
