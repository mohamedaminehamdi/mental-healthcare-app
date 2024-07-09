"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSessionToken,
  safeEqual,
  verifyAdminSessionToken,
} from "../admin-session";
import { checkRateLimit } from "../rate-limit";

// ponytail: in-memory limit is per server instance; use a shared store (Redis) if you scale out
const PASSKEY_RATE_LIMIT = { windowMs: 15 * 60 * 1000, maxRequests: 10 };

// VERIFY ADMIN PASSKEY
export const verifyAdminPasskey = async (
  passkey: string
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const expected = process.env.ADMIN_PASSKEY;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!expected || !secret) {
    console.error("ADMIN_PASSKEY and ADMIN_SESSION_SECRET must both be set");
    return { ok: false, error: "Admin access is not configured." };
  }

  const request = new Request("http://internal", { headers: await headers() });
  if (!checkRateLimit(request, PASSKEY_RATE_LIMIT).allowed) {
    return {
      ok: false,
      error: "Too many attempts. Please wait a few minutes and try again.",
    };
  }

  if (!(await safeEqual(passkey, expected))) {
    return { ok: false, error: "Invalid passkey. Please try again." };
  }

  (await cookies()).set(
    ADMIN_SESSION_COOKIE,
    await createAdminSessionToken(secret),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE,
    }
  );

  return { ok: true };
};

// CHECK ADMIN SESSION
export const hasAdminSession = async () =>
  verifyAdminSessionToken(
    (await cookies()).get(ADMIN_SESSION_COOKIE)?.value,
    process.env.ADMIN_SESSION_SECRET
  );

// SIGN OUT
export const signOutAdmin = async () => {
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
  redirect("/");
};
