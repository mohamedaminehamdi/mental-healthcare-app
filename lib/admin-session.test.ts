import { describe, expect, it } from "vitest";

import {
  ADMIN_SESSION_MAX_AGE,
  createAdminSessionToken,
  safeEqual,
  verifyAdminSessionToken,
} from "./admin-session";

const secret = "test-secret-with-enough-entropy";

describe("admin session token", () => {
  it("verifies a token it issued", async () => {
    const token = await createAdminSessionToken(secret);

    expect(await verifyAdminSessionToken(token, secret)).toBe(true);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createAdminSessionToken("another-secret");

    expect(await verifyAdminSessionToken(token, secret)).toBe(false);
  });

  it("rejects an expired token", async () => {
    const issuedAt = Date.now() - (ADMIN_SESSION_MAX_AGE + 1) * 1000;
    const token = await createAdminSessionToken(secret, issuedAt);

    expect(await verifyAdminSessionToken(token, secret)).toBe(false);
  });

  it("rejects a token whose expiry was extended", async () => {
    const token = await createAdminSessionToken(secret);
    const [expiresAt, signature] = token.split(".");
    const forged = `${Number(expiresAt) + 86_400_000}.${signature}`;

    expect(await verifyAdminSessionToken(forged, secret)).toBe(false);
  });

  it("rejects missing or malformed input", async () => {
    expect(await verifyAdminSessionToken(undefined, secret)).toBe(false);
    expect(await verifyAdminSessionToken("admin", secret)).toBe(false);
    expect(await verifyAdminSessionToken("123.abc", secret)).toBe(false);
    expect(
      await verifyAdminSessionToken(await createAdminSessionToken(secret), undefined)
    ).toBe(false);
  });
});

describe("safeEqual", () => {
  it("compares strings", async () => {
    expect(await safeEqual("123456", "123456")).toBe(true);
    expect(await safeEqual("123456", "123457")).toBe(false);
    expect(await safeEqual("123456", "")).toBe(false);
  });
});
