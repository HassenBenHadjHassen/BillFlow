import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth";

describe("Authentication & Security", () => {
  it("should hash and verify passwords correctly with bcrypt", async () => {
    const raw = "SuperSecretPassword123!";
    const hashed = await hashPassword(raw);

    expect(hashed).not.toBe(raw);
    expect(hashed.startsWith("$2")).toBe(true);

    const isMatch = await verifyPassword(raw, hashed);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword("WrongPassword", hashed);
    expect(isWrong).toBe(false);
  }, 15000);

  it("should create and verify signed JWT session tokens", async () => {
    const userPayload = {
      id: "usr_12345",
      name: "Owner Alexandre",
      email: "alexandre@billflow.io",
    };

    const token = await createSessionToken(userPayload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = await verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(userPayload.id);
    expect(decoded?.email).toBe(userPayload.email);
    expect(decoded?.name).toBe(userPayload.name);
  });

  it("should reject tampered or invalid JWT session tokens", async () => {
    const invalidToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature";
    const decoded = await verifySessionToken(invalidToken);
    expect(decoded).toBeNull();
  });
});
