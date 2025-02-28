/**
 * CSRF Token generation and validation
 * Protects against Cross-Site Request Forgery attacks
 */

import crypto from "crypto";

const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/**
 * Create a CSRF token with expiry metadata
 */
export function createCsrfToken(): { token: string; expiresAt: number } {
  const token = generateCsrfToken();
  const expiresAt = Date.now() + CSRF_TOKEN_EXPIRY;

  return {
    token,
    expiresAt,
  };
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(
  token: string,
  storedToken: string,
  expiresAt: number
): boolean {
  // Check expiry
  if (Date.now() > expiresAt) {
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  return constantTimeCompare(token, storedToken);
}

/**
 * Constant-time string comparison to prevent timing attacks
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
 * Extract CSRF token from request
 */
export function extractCsrfToken(
  request: Request | FormData
): string | null {
  if (request instanceof Request) {
    // Check headers
    const headerToken = request.headers.get("x-csrf-token");
    if (headerToken) {
      return headerToken;
    }
  }

  return null;
}
