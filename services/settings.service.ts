import db from "@/lib/db";
import { CompanySettingsInput, UpdateProfileInput, ChangePasswordInput } from "@/schemas";
import { hashPassword, verifyPassword } from "@/lib/auth";

export class SettingsService {
  /**
   * Retrieves company settings or initializes default settings
   */
  static async getCompanySettings() {
    let settings = await db.companySettings.findFirst();

    if (!settings) {
      settings = await db.companySettings.create({
        data: {
          companyName: "Acme Consulting",
          country: "France",
          defaultCurrency: "EUR",
          defaultTaxRate: 20,
          defaultPaymentTerms: 30,
          invoicePrefix: "INV",
          invoiceNotes: "Payment is due within 30 days from invoice issue date. Thank you for your business!",
        },
      });
    }

    return settings;
  }

  static async updateCompanySettings(data: CompanySettingsInput) {
    const existing = await this.getCompanySettings();

    return db.companySettings.update({
      where: { id: existing.id },
      data: {
        companyName: data.companyName,
        logo: data.logo || null,
        address: data.address || null,
        city: data.city || null,
        postalCode: data.postalCode || null,
        country: data.country || "France",
        email: data.email || null,
        phone: data.phone || null,
        website: data.website || null,
        siret: data.siret || null,
        vatNumber: data.vatNumber || null,
        iban: data.iban || null,
        bic: data.bic || null,
        defaultCurrency: data.defaultCurrency || "EUR",
        defaultTaxRate: data.defaultTaxRate,
        defaultPaymentTerms: data.defaultPaymentTerms,
        invoicePrefix: data.invoicePrefix || "INV",
        invoiceNotes: data.invoiceNotes || null,
      },
    });
  }

  static async getUserProfile(userId: string) {
    return db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true },
    });
  }

  static async updateProfile(userId: string, data: UpdateProfileInput) {
    return db.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
      },
    });
  }

  static async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new Error("User not found");

    const validCurrent = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!validCurrent) {
      throw new Error("Current password is incorrect");
    }

    const newHash = await hashPassword(data.newPassword);
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true };
  }
}
