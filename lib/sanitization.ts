/**
 * Input validation and sanitization utilities
 * Prevents XSS, injection attacks, and malformed data
 */

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== "string") {
    return "";
  }

  // Trim whitespace
  let sanitized = input.trim().slice(0, maxLength);

  // Remove potentially dangerous characters and tags
  sanitized = sanitized
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ""); // Remove event handlers

  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeString(email, 254).toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error("Invalid email format");
  }

  return sanitized;
}

/**
 * Sanitize phone number
 */
export function sanitizePhoneNumber(phone: string): string {
  const sanitized = sanitizeString(phone, 20);
  
  // Allow only digits, +, -, (, ), and spaces
  const phoneRegex = /^[+\d\-\s()]+$/;
  if (!phoneRegex.test(sanitized)) {
    throw new Error("Invalid phone number format");
  }

  return sanitized;
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Only allow http and https
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      throw new Error("Invalid URL protocol");
    }

    return urlObj.toString();
  } catch {
    throw new Error("Invalid URL format");
  }
}

/**
 * Validate and sanitize date
 */
export function sanitizeDate(dateString: string): Date {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date format");
  }

  // Don't allow dates in the future (for birthDate, past medical history, etc.)
  if (date > new Date()) {
    throw new Error("Date cannot be in the future");
  }

  return date;
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(value: unknown, min?: number, max?: number): number {
  const num = Number(value);
  
  if (isNaN(num)) {
    throw new Error("Invalid number");
  }

  if (min !== undefined && num < min) {
    throw new Error(`Number must be at least ${min}`);
  }

  if (max !== undefined && num > max) {
    throw new Error(`Number must be at most ${max}`);
  }

  return num;
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  allowedKeys?: string[]
): T {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip prototype pollution attempts
    if (["__proto__", "constructor", "prototype"].includes(key)) {
      continue;
    }

    // Only include allowed keys if specified
    if (allowedKeys && !allowedKeys.includes(key)) {
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === "object" && value !== null && !(value instanceof Date)) {
      sanitized[key] = sanitizeObject(value, allowedKeys);
    } else if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize patient data
 */
export function sanitizePatientData(data: any): any {
  const allowedKeys = [
    "name",
    "email",
    "phone",
    "birthDate",
    "gender",
    "address",
    "occupation",
    "emergencyContactName",
    "emergencyContactNumber",
    "primaryPhysician",
    "insuranceProvider",
    "insurancePolicyNumber",
    "allergies",
    "currentMedication",
    "familyMedicalHistory",
    "pastMedicalHistory",
    "identificationType",
    "identificationNumber",
  ];

  const sanitized = sanitizeObject(data, allowedKeys);

  // Validate specific fields
  if (sanitized.email) {
    sanitized.email = sanitizeEmail(sanitized.email);
  }

  if (sanitized.phone) {
    sanitized.phone = sanitizePhoneNumber(sanitized.phone);
  }

  if (sanitized.birthDate) {
    sanitized.birthDate = sanitizeDate(sanitized.birthDate);
  }

  // Ensure gender is one of allowed values
  if (sanitized.gender && !["Male", "Female", "Other"].includes(sanitized.gender)) {
    throw new Error("Invalid gender value");
  }

  return sanitized;
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
