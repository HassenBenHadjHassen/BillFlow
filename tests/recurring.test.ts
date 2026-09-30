import { describe, it, expect } from "vitest";
import { RecurringBillingService } from "@/services/recurring.service";
import { format } from "date-fns";

describe("Recurring Billing Period Logic", () => {
  it("should calculate Monthly billing period correctly", () => {
    const baseDate = new Date("2026-10-01T00:00:00.000Z");
    const { periodStart, periodEnd, nextDate } = RecurringBillingService.calculatePeriod(
      baseDate,
      "Monthly"
    );

    expect(format(periodStart, "yyyy-MM-dd")).toBe("2026-10-01");
    expect(format(periodEnd, "yyyy-MM-dd")).toBe("2026-10-31");
    expect(format(nextDate, "yyyy-MM-dd")).toBe("2026-11-01");
  });

  it("should calculate Quarterly billing period correctly", () => {
    const baseDate = new Date("2026-01-01T00:00:00.000Z");
    const { periodStart, periodEnd, nextDate } = RecurringBillingService.calculatePeriod(
      baseDate,
      "Quarterly"
    );

    expect(format(periodStart, "yyyy-MM-dd")).toBe("2026-01-01");
    expect(format(periodEnd, "yyyy-MM-dd")).toBe("2026-03-31");
    expect(format(nextDate, "yyyy-MM-dd")).toBe("2026-04-01");
  });

  it("should calculate Yearly billing period correctly", () => {
    const baseDate = new Date("2026-01-01T00:00:00.000Z");
    const { periodStart, periodEnd, nextDate } = RecurringBillingService.calculatePeriod(
      baseDate,
      "Yearly"
    );

    expect(format(periodStart, "yyyy-MM-dd")).toBe("2026-01-01");
    expect(format(periodEnd, "yyyy-MM-dd")).toBe("2026-12-31");
    expect(format(nextDate, "yyyy-MM-dd")).toBe("2027-01-01");
  });
});
