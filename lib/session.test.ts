import { describe, expect, it } from "vitest";

import {
  ADMIN_SESSION,
  ADMIN_SUBJECT,
  createSessionToken,
  patientSubject,
  safeEqual,
  verifySessionToken,
} from "./session";

const secret = "test-secret-with-enough-entropy";
const { maxAge } = ADMIN_SESSION;
const adminToken = (now?: number) =>
  createSessionToken(ADMIN_SUBJECT, secret, maxAge, now);

describe("session token", () => {
  it("verifies a token it issued", async () => {
    expect(
      await verifySessionToken(await adminToken(), ADMIN_SUBJECT, secret)
    ).toBe(true);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken(ADMIN_SUBJECT, "other", maxAge);

    expect(await verifySessionToken(token, ADMIN_SUBJECT, secret)).toBe(false);
  });

  it("rejects an expired token", async () => {
    const token = await adminToken(Date.now() - (maxAge + 1) * 1000);

    expect(await verifySessionToken(token, ADMIN_SUBJECT, secret)).toBe(false);
  });

  it("rejects a token whose expiry was extended", async () => {
    const [expiresAt, signature] = (await adminToken()).split(".");
    const forged = `${Number(expiresAt) + 86_400_000}.${signature}`;

    expect(await verifySessionToken(forged, ADMIN_SUBJECT, secret)).toBe(false);
  });

  it("binds the token to its subject", async () => {
    const patientToken = await createSessionToken(
      patientSubject("user-a"),
      secret,
      maxAge
    );

    expect(
      await verifySessionToken(patientToken, patientSubject("user-a"), secret)
    ).toBe(true);
    expect(
      await verifySessionToken(patientToken, patientSubject("user-b"), secret)
    ).toBe(false);
    expect(await verifySessionToken(patientToken, ADMIN_SUBJECT, secret)).toBe(
      false
    );
  });

  it("rejects missing or malformed input", async () => {
    expect(await verifySessionToken(undefined, ADMIN_SUBJECT, secret)).toBe(
      false
    );
    expect(await verifySessionToken("admin", ADMIN_SUBJECT, secret)).toBe(false);
    expect(await verifySessionToken("123.abc", ADMIN_SUBJECT, secret)).toBe(
      false
    );
    expect(
      await verifySessionToken(await adminToken(), ADMIN_SUBJECT, undefined)
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
