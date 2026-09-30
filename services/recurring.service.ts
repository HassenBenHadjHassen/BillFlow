import db from "@/lib/db";
import { addMonths, addYears, subDays, startOfDay, endOfDay } from "date-fns";
import { InvoiceService } from "./invoice.service";

export interface RecurringGenerationResult {
  generated: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  reason?: string;
}

export class RecurringBillingService {
  /**
   * Calculates the billing period start, end, and next date based on frequency
   */
  static calculatePeriod(currentDate: Date, frequency: string): {
    periodStart: Date;
    periodEnd: Date;
    nextDate: Date;
  } {
    const periodStart = startOfDay(new Date(currentDate));
    let nextDate: Date;
    let periodEnd: Date;

    if (frequency === "Quarterly") {
      nextDate = startOfDay(addMonths(periodStart, 3));
      periodEnd = endOfDay(subDays(nextDate, 1));
    } else if (frequency === "Yearly") {
      nextDate = startOfDay(addYears(periodStart, 1));
      periodEnd = endOfDay(subDays(nextDate, 1));
    } else {
      // Default: Monthly
      nextDate = startOfDay(addMonths(periodStart, 1));
      periodEnd = endOfDay(subDays(nextDate, 1));
    }

    return { periodStart, periodEnd, nextDate };
  }

  static async getRecurringConfigs() {
    return db.recurringBilling.findMany({
      orderBy: { nextInvoiceDate: "asc" },
      include: {
        contract: {
          include: {
            client: true,
          },
        },
      },
    });
  }

  /**
   * Idempotently generates an invoice for a specific recurring billing configuration
   */
  static async generateInvoice(recurringId: string, force: boolean = false): Promise<RecurringGenerationResult> {
    const config = await db.recurringBilling.findUnique({
      where: { id: recurringId },
      include: { contract: { include: { client: true } } },
    });

    if (!config) {
      return { generated: false, reason: "Recurring billing configuration not found" };
    }

    if (!config.active) {
      return { generated: false, reason: "Recurring configuration is inactive" };
    }

    const contract = config.contract;
    if (contract.status !== "Active") {
      return { generated: false, reason: `Contract is not Active (current status: ${contract.status})` };
    }

    const now = new Date();
    // Verify due date unless forced
    if (!force && new Date(config.nextInvoiceDate) > now) {
      return { generated: false, reason: "Invoice is not yet due" };
    }

    const { periodStart, periodEnd, nextDate } = this.calculatePeriod(
      config.nextInvoiceDate,
      config.frequency
    );

    // Check if contract has ended
    if (contract.endDate && periodStart > new Date(contract.endDate)) {
      await db.recurringBilling.update({
        where: { id: config.id },
        data: { active: false },
      });
      return { generated: false, reason: "Contract end date has passed. Recurring billing deactivated." };
    }

    // IDEMPOTENCY CHECK:
    // Check whether an invoice already exists for this contract and billing period
    const existingInvoice = await db.invoice.findFirst({
      where: {
        contractId: contract.id,
        billingPeriodStart: {
          gte: startOfDay(periodStart),
          lte: endOfDay(periodStart),
        },
        billingPeriodEnd: {
          gte: startOfDay(periodEnd),
          lte: endOfDay(periodEnd),
        },
      },
    });

    if (existingInvoice) {
      // Advance nextInvoiceDate if stuck to avoid repeated warnings
      if (new Date(config.nextInvoiceDate) <= now) {
        await db.recurringBilling.update({
          where: { id: config.id },
          data: {
            lastInvoiceDate: existingInvoice.issueDate,
            nextInvoiceDate: nextDate,
          },
        });
      }
      return {
        generated: false,
        invoiceId: existingInvoice.id,
        invoiceNumber: existingInvoice.invoiceNumber,
        reason: `Invoice already exists for period (${existingInvoice.invoiceNumber})`,
      };
    }

    // Calculate due date based on payment terms
    const dueDate = addMonths(periodStart, 1);

    // Create the invoice
    const invoice = await InvoiceService.createInvoice({
      clientId: contract.clientId,
      contractId: contract.id,
      issueDate: periodStart.toISOString(),
      dueDate: dueDate.toISOString(),
      currency: config.currency,
      billingPeriodStart: periodStart.toISOString(),
      billingPeriodEnd: periodEnd.toISOString(),
      notes: `Recurring billing for ${config.frequency.toLowerCase()} period: ${contract.title}`,
      items: [
        {
          description: `${contract.title} - ${config.frequency} fee`,
          quantity: 1,
          unitPrice: config.amount,
          taxRate: 20,
        },
      ],
    }, { autoSend: true });

    // Advance nextInvoiceDate and record lastInvoiceDate
    await db.recurringBilling.update({
      where: { id: config.id },
      data: {
        lastInvoiceDate: periodStart,
        nextInvoiceDate: nextDate,
      },
    });

    return {
      generated: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
    };
  }

  /**
   * Generates all invoices currently due across all active contracts
   * Strictly idempotent: executing multiple times will never create duplicates
   */
  static async generateAllDueInvoices(): Promise<{
    processed: number;
    generated: number;
    skipped: number;
    results: Array<{ contractTitle: string; result: RecurringGenerationResult }>;
  }> {
    const now = new Date();
    const dueConfigs = await db.recurringBilling.findMany({
      where: {
        active: true,
        nextInvoiceDate: {
          lte: endOfDay(now),
        },
        contract: {
          status: "Active",
          isArchived: false,
        },
      },
      include: {
        contract: true,
      },
    });

    const results: Array<{ contractTitle: string; result: RecurringGenerationResult }> = [];
    let generatedCount = 0;
    let skippedCount = 0;

    for (const config of dueConfigs) {
      const res = await this.generateInvoice(config.id, false);
      results.push({
        contractTitle: config.contract.title,
        result: res,
      });

      if (res.generated) {
        generatedCount++;
      } else {
        skippedCount++;
      }
    }

    return {
      processed: dueConfigs.length,
      generated: generatedCount,
      skipped: skippedCount,
      results,
    };
  }
}
