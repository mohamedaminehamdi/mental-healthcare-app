/**
 * Rate limiting utilities
 * Protects against brute force and DoS attacks
 */

// In-memory rate limit store (should use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiter configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (request: Request) => string;
}

/**
 * Default rate limit config
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
};

/**
 * Generate rate limit key from request
 */
function generateRateLimitKey(request: Request): string {
  const ip = request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return ip;
}

/**
 * Check if request is rate limited
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetTime: number } {
  const key = config.keyGenerator?.(request) || generateRateLimitKey(request);
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Initialize or reset if window expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Increment count
  entry.count++;

  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(
  remaining: number,
  resetTime: number
): Record<string, string> {
  return {
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(resetTime / 1000).toString(),
  };
}

/**
 * Create rate limited error response
 */
export function createRateLimitedResponse(
  resetTime: number
): Response {
  const resetDate = new Date(resetTime).toISOString();
  
  return new Response(
    JSON.stringify({
      success: false,
      message: "Too many requests, please try again later",
      resetAt: resetDate,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": Math.ceil((resetTime - Date.now()) / 1000).toString(),
        "X-RateLimit-Reset": Math.ceil(resetTime / 1000).toString(),
      },
    }
  );
}

/**
 * Clean up expired entries from rate limit store
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every hour
if (typeof global !== "undefined") {
  setInterval(cleanupRateLimitStore, 60 * 60 * 1000);
}
