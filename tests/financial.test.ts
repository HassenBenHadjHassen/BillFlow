import { describe, it, expect } from "vitest";
import {
  roundMoney,
  calculateItemTotal,
  calculateInvoiceTotals,
  calculateInvoicePaymentStatus,
} from "@/lib/financial";
import { addDays, subDays } from "date-fns";

describe("Financial Calculations", () => {
  it("should round money accurately without floating point precision issues", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1234.567)).toBe(1234.57);
    expect(roundMoney(1234.564)).toBe(1234.56);
  });

  it("should calculate item total correctly", () => {
    expect(calculateItemTotal(3, 100.5)).toBe(301.5);
    expect(calculateItemTotal(1.5, 45.33)).toBe(68);
  });

  it("should calculate invoice totals with multiple items and tax rates", () => {
    const items = [
      { quantity: 2, unitPrice: 500, taxRate: 20 }, // 1000 + 200 tax
      { quantity: 1, unitPrice: 250, taxRate: 10 }, // 250 + 25 tax
    ];

    const totals = calculateInvoiceTotals(items);
    expect(totals.subtotal).toBe(1250);
    expect(totals.taxAmount).toBe(225);
    expect(totals.total).toBe(1475);
  });

  it("should correctly determine invoice status: Unpaid / Sent", () => {
    const status = calculateInvoicePaymentStatus(
      1000,
      0,
      addDays(new Date(), 10),
      "Sent"
    );
    expect(status.status).toBe("Sent");
    expect(status.amountPaid).toBe(0);
    expect(status.remainingBalance).toBe(1000);
  });

  it("should correctly determine invoice status: Partially Paid", () => {
    const status = calculateInvoicePaymentStatus(
      1000,
      400,
      addDays(new Date(), 10),
      "Sent"
    );
    expect(status.status).toBe("PartiallyPaid");
    expect(status.amountPaid).toBe(400);
    expect(status.remainingBalance).toBe(600);
  });

  it("should correctly determine invoice status: Paid in Full", () => {
    const status = calculateInvoicePaymentStatus(
      1000,
      1000,
      addDays(new Date(), 10),
      "Sent"
    );
    expect(status.status).toBe("Paid");
    expect(status.amountPaid).toBe(1000);
    expect(status.remainingBalance).toBe(0);
  });

  it("should correctly determine invoice status: Overdue if past due date and remaining balance > 0", () => {
    const status = calculateInvoicePaymentStatus(
      1000,
      300,
      subDays(new Date(), 5),
      "Sent"
    );
    expect(status.status).toBe("Overdue");
    expect(status.amountPaid).toBe(300);
    expect(status.remainingBalance).toBe(700);
  });

  it("should preserve Cancelled status regardless of balance", () => {
    const status = calculateInvoicePaymentStatus(
      1000,
      0,
      addDays(new Date(), 10),
      "Cancelled"
    );
    expect(status.status).toBe("Cancelled");
  });
});
