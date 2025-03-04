/**
 * Data encryption utilities for sensitive information
 */

/**
 * Encrypt sensitive data (for transit and storage)
 * Note: For production, use a proper encryption library like crypto-js or libsodium
 */
export function encryptSensitiveData(data: string, key?: string): string {
  // This is a placeholder. In production, use:
  // - TweetNaCl.js for public key encryption
  // - crypto-js for symmetric encryption
  // - TLS 1.3 for transport encryption
  
  if (typeof window !== "undefined") {
    // Client-side: Use Web Crypto API for encryption
    // Note: This is a simplified example
    return Buffer.from(data).toString("base64");
  }

  // Server-side: Use proper encryption library
  return Buffer.from(data).toString("base64");
}

/**
 * Decrypt sensitive data
 */
export function decryptSensitiveData(encryptedData: string, key?: string): string {
  try {
    return Buffer.from(encryptedData, "base64").toString("utf-8");
  } catch {
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Hash sensitive data for comparison (passwords, tokens)
 */
export async function hashData(data: string): Promise<string> {
  if (typeof window !== "undefined") {
    // Client-side hashing
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Server-side: Use crypto module
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Verify hashed data
 */
export async function verifyHash(data: string, hash: string): Promise<boolean> {
  const computedHash = await hashData(data);
  
  // Use constant-time comparison
  return constantTimeCompare(computedHash, hash);
}

/**
 * Constant-time string comparison
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  if (typeof window !== "undefined") {
    // Client-side
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
  }

  // Server-side
  const crypto = require("crypto");
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Mask sensitive data for display
 */
export function maskSensitiveData(
  data: string,
  visibleChars: number = 4,
  maskChar: string = "*"
): string {
  if (data.length <= visibleChars) {
    return data;
  }

  const visible = data.slice(0, visibleChars);
  const masked = maskChar.repeat(Math.max(0, data.length - visibleChars));

  return visible + masked;
}

/**
 * Mask email for display
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  
  if (!domain) return maskSensitiveData(email);

  const visibleLocalPart = localPart.substring(0, 2);
  const maskedLocalPart = "*".repeat(Math.max(0, localPart.length - 2));

  return `${visibleLocalPart}${maskedLocalPart}@***`;
}
