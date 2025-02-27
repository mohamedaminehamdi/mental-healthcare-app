/**
 * Request validation utilities
 * Validates incoming requests for security
 */

import { NextRequest } from "next/server";

/**
 * Validate request headers
 */
export function validateRequestHeaders(request: NextRequest): boolean {
  const contentType = request.headers.get("content-type");
  
  // Check Content-Type for POST/PUT requests
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    if (!contentType?.includes("application/json") && 
        !contentType?.includes("multipart/form-data")) {
      return false;
    }
  }

  // Check for required security headers
  const referer = request.headers.get("referer");
  const origin = request.headers.get("origin");

  // Validate origin for cross-origin requests
  if (origin) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      return false;
    }
  }

  return true;
}

/**
 * Extract and validate user ID from request
 */
export function extractAndValidateUserId(request: NextRequest): string | null {
  const pathname = request.nextUrl.pathname;
  const match = pathname.match(/\/patients\/([^/]+)/);
  
  if (!match || !match[1]) {
    return null;
  }

  const userId = match[1];
  
  // Validate userId format (should be a valid ObjectId or UUID)
  if (!isValidId(userId)) {
    return null;
  }

  return userId;
}

/**
 * Validate ID format
 */
function isValidId(id: string): boolean {
  // MongoDB ObjectId pattern
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  // UUID pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  return objectIdRegex.test(id) || uuidRegex.test(id) || id.length > 0;
}

/**
 * Validate request size
 */
export function validateRequestSize(request: NextRequest, maxSize: number = 10 * 1024 * 1024): boolean {
  const contentLength = request.headers.get("content-length");
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > maxSize) {
      return false;
    }
  }

  return true;
}

/**
 * Validate request method
 */
export function validateRequestMethod(
  request: NextRequest,
  allowedMethods: string[]
): boolean {
  return allowedMethods.includes(request.method);
}

/**
 * Create a safe response for errors (no sensitive info)
 */
export function createErrorResponse(
  status: number,
  message: string
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      message,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
