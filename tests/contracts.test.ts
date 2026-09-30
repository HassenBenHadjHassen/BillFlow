import { describe, it, expect } from "vitest";
import { ContractService } from "@/services/contract.service";
import { addDays, subDays } from "date-fns";

describe("Contract Expiration & Business Logic", () => {
  it("should calculate Expiring Soon status for contracts ending within 30 days", () => {
    const endDate = addDays(new Date(), 14);
    const info = ContractService.getExpirationInfo(endDate, "Active");

    expect(info.isExpiringSoon).toBe(true);
    expect(info.isExpired).toBe(false);
    expect(info.label).toMatch(/Expires in 14 days/);
  });

  it("should calculate Expired status for contracts whose end date is in the past", () => {
    const endDate = subDays(new Date(), 3);
    const info = ContractService.getExpirationInfo(endDate, "Active");

    expect(info.isExpired).toBe(true);
    expect(info.isExpiringSoon).toBe(false);
    expect(info.label).toMatch(/Expired 3 days ago/);
  });

  it("should handle contracts without end dates (indefinite)", () => {
    const info = ContractService.getExpirationInfo(null, "Active");

    expect(info.isExpired).toBe(false);
    expect(info.isExpiringSoon).toBe(false);
    expect(info.label).toBe("No expiration date");
  });

  it("should respect Terminated status", () => {
    const info = ContractService.getExpirationInfo(addDays(new Date(), 50), "Terminated");

    expect(info.label).toBe("Terminated");
  });
});
