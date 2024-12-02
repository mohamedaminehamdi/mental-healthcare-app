"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { endAdminSession, startAdminSession } from "../auth";
import { checkRateLimit } from "../rate-limit";
import { safeEqual } from "../session";

// ponytail: in-memory limit is per server instance; use a shared store (Redis) if you scale out
const PASSKEY_RATE_LIMIT = { windowMs: 15 * 60 * 1000, maxRequests: 10 };

// VERIFY ADMIN PASSKEY
export const verifyAdminPasskey = async (
  passkey: string
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const expected = process.env.ADMIN_PASSKEY;

  if (!expected || !process.env.SESSION_SECRET) {
    console.error("ADMIN_PASSKEY and SESSION_SECRET must both be set");
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

  await startAdminSession();
  return { ok: true };
};

// SIGN OUT
export const signOutAdmin = async () => {
  await endAdminSession();
  redirect("/");
};
