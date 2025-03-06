/**
 * Session security and token management
 */

export interface SessionConfig {
  sessionTimeout: number; // milliseconds
  refreshTokenExpiry: number;
  accessTokenExpiry: number;
  maxActiveSessions: number;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  refreshTokenExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
  accessTokenExpiry: 15 * 60 * 1000, // 15 minutes
  maxActiveSessions: 5,
};

/**
 * Validate session token
 */
export function validateSessionToken(
  token: string,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): { valid: boolean; expired?: boolean } {
  if (!token || typeof token !== "string") {
    return { valid: false };
  }

  try {
    // In real implementation, verify JWT signature and expiry
    const decoded = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    
    const now = Date.now();
    const expiresAt = decoded.exp * 1000;

    if (now > expiresAt) {
      return { valid: false, expired: true };
    }

    return { valid: true };
  } catch {
    return { valid: false };
  }
}

/**
 * Check session timeout
 */
export function checkSessionTimeout(
  lastActivity: number,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): boolean {
  const now = Date.now();
  return now - lastActivity > config.sessionTimeout;
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create secure session cookie options
 */
export function getSecureSessionCookieOptions() {
  return {
    httpOnly: true, // Prevent JavaScript access
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict" as const, // CSRF protection
    path: "/",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  };
}

/**
 * Validate request originatin for session attacks
 */
export function validateSessionOrigin(
  requestOrigin: string | null,
  sessionOrigin: string | null
): boolean {
  if (!sessionOrigin) {
    return true; // First request, set origin
  }

  // Session must originate from same origin
  return requestOrigin === sessionOrigin;
}

/**
 * Check session fixation attempts
 */
export function detectSessionFixation(
  sessionId: string,
  previousSessionId: string | null
): boolean {
  // Session ID should change after authentication
  return previousSessionId === sessionId;
}
