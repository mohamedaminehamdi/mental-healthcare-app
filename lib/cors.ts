/**
 * CORS and security headers configuration
 */

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

/**
 * Default CORS configuration (restrictive)
 */
export const defaultCorsConfig: CorsConfig = {
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
    process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",
  ],
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-CSRF-Token",
  ],
  exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Validate CORS request
 */
export function validateCorsRequest(
  requestOrigin: string | null,
  config: CorsConfig = defaultCorsConfig
): boolean {
  if (!requestOrigin) {
    return true; // Same-origin requests are always allowed
  }

  if (config.allowedOrigins.includes("*")) {
    return true; // Wildcard allows all origins
  }

  return config.allowedOrigins.includes(requestOrigin);
}

/**
 * Apply CORS headers to response
 */
export function applyCorsHeaders(
  response: Response,
  requestOrigin: string | null,
  config: CorsConfig = defaultCorsConfig
): Response {
  if (!validateCorsRequest(requestOrigin, config)) {
    return response;
  }

  const headers = new Headers(response.headers);

  // Set CORS headers
  if (requestOrigin && config.allowedOrigins.includes(requestOrigin)) {
    headers.set("Access-Control-Allow-Origin", requestOrigin);
  } else if (config.allowedOrigins.includes("*")) {
    headers.set("Access-Control-Allow-Origin", "*");
  }

  headers.set(
    "Access-Control-Allow-Methods",
    config.allowedMethods.join(", ")
  );
  headers.set(
    "Access-Control-Allow-Headers",
    config.allowedHeaders.join(", ")
  );
  headers.set(
    "Access-Control-Expose-Headers",
    config.exposedHeaders.join(", ")
  );

  if (config.credentials) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  headers.set("Access-Control-Max-Age", config.maxAge.toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Additional security headers
 */
export const SECURITY_HEADERS: Record<string, string> = {
  // Prevent clickjacking
  "X-Frame-Options": "DENY",
  
  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  
  // Enable XSS protection
  "X-XSS-Protection": "1; mode=block",
  
  // Control referrer information
  "Referrer-Policy": "strict-origin-when-cross-origin",
  
  // Restrict browser APIs
  "Permissions-Policy":
    "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
  
  // Enforce HTTPS
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  
  // Control resource loading
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ].join("; "),
};

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreFlight(
  request: Request,
  config: CorsConfig = defaultCorsConfig
): Response | null {
  if (request.method !== "OPTIONS") {
    return null;
  }

  const origin = request.headers.get("origin");

  if (!validateCorsRequest(origin, config)) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": config.allowedMethods.join(", "),
      "Access-Control-Allow-Headers": config.allowedHeaders.join(", "),
      "Access-Control-Max-Age": config.maxAge.toString(),
    },
  });
}
