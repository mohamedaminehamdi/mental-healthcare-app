/**
 * Signed session cookies for admins and patients.
 * Uses Web Crypto so the same code runs in server actions and in middleware (edge).
 */

export const ADMIN_SESSION = { cookie: "admin_session", maxAge: 8 * 60 * 60 };
export const PATIENT_SESSION = {
  cookie: "patient_session",
  maxAge: 24 * 60 * 60,
};

// The subject is part of the signed message, so a patient token can't be
// replayed as an admin token or as another patient's token.
export const ADMIN_SUBJECT = "admin";
export const patientSubject = (userId: string) => `patient:${userId}`;

const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

const fromHex = (hex: string) =>
  new Uint8Array((hex.match(/.{2}/g) ?? []).map((byte) => parseInt(byte, 16)));

const hmacKey = (secret: string) =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

/** Token format: "<expiresAtMs>.<hex HMAC of '<subject>:<expiresAtMs>'>" */
export async function createSessionToken(
  subject: string,
  secret: string,
  maxAgeSeconds: number,
  now = Date.now()
): Promise<string> {
  const expiresAt = now + maxAgeSeconds * 1000;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    encoder.encode(`${subject}:${expiresAt}`)
  );
  return `${expiresAt}.${toHex(signature)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  subject: string,
  secret: string | undefined,
  now = Date.now()
): Promise<boolean> {
  if (!token || !secret) return false;

  const [expiresAt, signature] = token.split(".");
  if (!/^\d+$/.test(expiresAt ?? "") || !/^[0-9a-f]{64}$/.test(signature ?? "")) {
    return false;
  }
  if (Number(expiresAt) <= now) return false;

  // crypto.subtle.verify compares in constant time
  return crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    fromHex(signature),
    encoder.encode(`${subject}:${expiresAt}`)
  );
}

/** Constant-time comparison of two strings via their SHA-256 digests. */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const viewA = new Uint8Array(hashA);
  const viewB = new Uint8Array(hashB);

  let diff = 0;
  for (let i = 0; i < viewA.length; i++) diff |= viewA[i] ^ viewB[i];
  return diff === 0;
}
