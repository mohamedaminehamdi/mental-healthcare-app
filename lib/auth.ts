/**
 * Session cookie helpers for server components and server actions.
 * Not a "use server" module on purpose: nothing here may be callable from the browser.
 */

import { cookies } from "next/headers";

import {
  ADMIN_SESSION,
  ADMIN_SUBJECT,
  PATIENT_SESSION,
  createSessionToken,
  patientSubject,
  verifySessionToken,
} from "./session";

const sessionSecret = () => process.env.SESSION_SECRET;

export async function startAdminSession() {
  const secret = sessionSecret();
  if (!secret) throw new Error("SESSION_SECRET is not set");

  (await cookies()).set(
    ADMIN_SESSION.cookie,
    await createSessionToken(ADMIN_SUBJECT, secret, ADMIN_SESSION.maxAge),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION.maxAge,
    }
  );
}

export async function hasAdminSession() {
  return verifySessionToken(
    (await cookies()).get(ADMIN_SESSION.cookie)?.value,
    ADMIN_SUBJECT,
    sessionSecret()
  );
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_SESSION.cookie);
}

export async function startPatientSession(userId: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error("SESSION_SECRET is not set");

  (await cookies()).set(
    PATIENT_SESSION.cookie,
    await createSessionToken(
      patientSubject(userId),
      secret,
      PATIENT_SESSION.maxAge
    ),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // lax so the session survives following a link from an email or the forum
      sameSite: "lax",
      path: "/",
      maxAge: PATIENT_SESSION.maxAge,
    }
  );
}

export async function hasPatientSession(userId: string) {
  return verifySessionToken(
    (await cookies()).get(PATIENT_SESSION.cookie)?.value,
    patientSubject(userId),
    sessionSecret()
  );
}

export async function endPatientSession() {
  (await cookies()).delete(PATIENT_SESSION.cookie);
}

// Server actions are public endpoints that bypass middleware, so each one
// checks the caller itself with these.
export async function requireAdmin() {
  if (!(await hasAdminSession())) throw new Error("Admin session required");
}

export async function requirePatient(userId: string) {
  if (!(await hasPatientSession(userId))) {
    throw new Error("Patient session required");
  }
}

export async function requirePatientOrAdmin(userId: string) {
  if (!(await hasPatientSession(userId)) && !(await hasAdminSession())) {
    throw new Error("Patient or admin session required");
  }
}
