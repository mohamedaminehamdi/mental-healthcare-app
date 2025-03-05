/**
 * Database query security and parameter validation
 */

/**
 * Validate and sanitize query parameters
 */
export function validateQueryParams(
  params: Record<string, any>,
  allowedFields: string[]
): Record<string, any> {
  const validated: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    // Only allow whitelisted fields
    if (!allowedFields.includes(key)) {
      continue;
    }

    // Validate value type and content
    validated[key] = sanitizeQueryValue(value);
  }

  return validated;
}

/**
 * Sanitize individual query parameter values
 */
export function sanitizeQueryValue(value: any): any {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    // Remove dangerous characters and operators
    let sanitized = value.trim();

    // Prevent NoSQL injection
    if (sanitized.includes("{") || sanitized.includes("$")) {
      return null;
    }

    // Prevent SQL injection patterns
    if (
      /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i.test(
        sanitized
      )
    ) {
      return null;
    }

    return sanitized;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeQueryValue(v)).filter((v) => v !== null);
  }

  if (typeof value === "object") {
    // Prevent prototype pollution
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (["__proto__", "constructor", "prototype"].includes(k)) {
        continue;
      }
      sanitized[k] = sanitizeQueryValue(v);
    }
    return sanitized;
  }

  return null;
}

/**
 * Build safe query filters
 */
export function buildSafeQueryFilter(
  filters: Record<string, any>,
  allowedFields: string[]
): Record<string, any> {
  const safeFilter: Record<string, any> = {};

  for (const [field, value] of Object.entries(filters)) {
    // Only allow whitelisted fields
    if (!allowedFields.includes(field)) {
      continue;
    }

    // Sanitize the value
    const sanitizedValue = sanitizeQueryValue(value);

    if (sanitizedValue !== null && sanitizedValue !== undefined) {
      safeFilter[field] = sanitizedValue;
    }
  }

  return safeFilter;
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
  limit?: any,
  offset?: any
): { limit: number; offset: number } {
  let validLimit = parseInt(limit, 10);
  let validOffset = parseInt(offset, 10);

  // Set bounds
  const MAX_LIMIT = 100;
  const MIN_LIMIT = 1;

  if (!Number.isFinite(validLimit) || validLimit < MIN_LIMIT) {
    validLimit = 10;
  } else if (validLimit > MAX_LIMIT) {
    validLimit = MAX_LIMIT;
  }

  if (!Number.isFinite(validOffset) || validOffset < 0) {
    validOffset = 0;
  }

  return { limit: validLimit, offset: validOffset };
}

/**
 * Validate sort parameters
 */
export function validateSortParams(
  sortBy?: string,
  sortOrder?: string,
  allowedFields?: string[]
): { sortBy: string; sortOrder: "asc" | "desc" } {
  const validSortOrder = sortOrder?.toLowerCase() === "desc" ? "desc" : "asc";

  // If allowedFields provided, validate sortBy
  if (allowedFields && !allowedFields.includes(sortBy || "")) {
    return { sortBy: "_createdAt", sortOrder: "desc" };
  }

  // Default to createdAt if not specified
  const validSortBy = sortBy || "_createdAt";

  return { sortBy: validSortBy, sortOrder: validSortOrder };
}

/**
 * Build safe MongoDB query operators
 */
export function buildMongoScopes(filter: Record<string, any>): Record<string, any> {
  const query: Record<string, any> = {};

  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined) {
      continue;
    }

    // Allow simple equality
    query[key] = value;
  }

  return query;
}

/**
 * Prevent NoSQL injection
 */
export function isCleanQuery(obj: any): boolean {
  if (!obj || typeof obj !== "object") {
    return true;
  }

  for (const [key, value] of Object.entries(obj)) {
    // Check for prototype pollution
    if (["__proto__", "constructor", "prototype"].includes(key)) {
      return false;
    }

    // Check for NoSQL injection operators
    if (key.startsWith("$")) {
      return false;
    }

    // Recursively check nested objects
    if (typeof value === "object" && value !== null) {
      if (!isCleanQuery(value)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Validate document ID format
 */
export function isValidDocumentId(id: string): boolean {
  // MongoDB ObjectId pattern
  const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
  // Appwrite pattern
  const appwriteIdRegex = /^[a-zA-Z0-9_-]+$/;

  return mongoIdRegex.test(id) || appwriteIdRegex.test(id);
}
