"use server";

import db from "@/lib/db";
import { LoginSchema, ChangePasswordSchema, UpdateProfileSchema } from "@/schemas";
import { verifyPassword, createSessionToken, setSessionCookie, clearSessionCookie, requireAuth } from "@/lib/auth";
import { SettingsService } from "@/services/settings.service";
import { revalidatePath } from "next/cache";

export async function loginAction(formData: unknown) {
  try {
    const parse = LoginSchema.safeParse(formData);
    if (!parse.success) {
      return { success: false, error: "Invalid email or password" };
    }

    const { email, password } = parse.data;

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      // Do not reveal whether account exists
      return { success: false, error: "Invalid email or password" };
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: "Invalid email or password" };
    }

    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    await setSessionCookie(token);

    return { success: true };
  } catch (err) {
    console.error("Login error:", err);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function logoutAction() {
  await clearSessionCookie();
  return { success: true };
}

export async function updateProfileAction(formData: unknown) {
  const session = await requireAuth();
  const parse = UpdateProfileSchema.safeParse(formData);
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || "Validation error" };
  }

  try {
    await SettingsService.updateProfile(session.id, parse.data);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function changePasswordAction(formData: unknown) {
  const session = await requireAuth();
  const parse = ChangePasswordSchema.safeParse(formData);
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || "Validation error" };
  }

  try {
    await SettingsService.changePassword(session.id, parse.data);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
