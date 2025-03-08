/**
 * Secure API Design & Validation
 * Enforces OpenAPI standards, request/response validation, and API security patterns
 */

import { z } from 'zod';

interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  authRequired: boolean;
  rateLimit: number; // requests per minute
  deprecated?: boolean;
  experimental?: boolean;
}

interface APISecurityPolicy {
  requireHTTPS: boolean;
  requireAuth: boolean;
  allowedMethods: string[];
  maxPayloadSize: number; // bytes
  requiredHeaders: string[];
  allowedContentTypes: string[];
  rateLimit: number;
  timeout: number; // milliseconds
}

interface APIValidationSchema {
  request: z.ZodSchema;
  response: z.ZodSchema;
  errors?: Record<number, string>;
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  requestId?: string;
}

const DEFAULT_API_SECURITY_POLICY: APISecurityPolicy = {
  requireHTTPS: true,
  requireAuth: true,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  maxPayloadSize: 10 * 1024 * 1024, // 10MB
  requiredHeaders: ['content-type', 'user-agent', 'authorization'],
  allowedContentTypes: ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'],
  rateLimit: 100, // per minute
  timeout: 30000, // 30 seconds
};

class SecureAPIValidator {
  private static instance: SecureAPIValidator;
  private endpoints: Map<string, APIEndpoint> = new Map();
  private schemas: Map<string, APIValidationSchema> = new Map();
  private policy: APISecurityPolicy;

  private constructor() {
    this.policy = DEFAULT_API_SECURITY_POLICY;
  }

  static getInstance(): SecureAPIValidator {
    if (!SecureAPIValidator.instance) {
      SecureAPIValidator.instance = new SecureAPIValidator();
    }
    return SecureAPIValidator.instance;
  }

  /**
   * Register API endpoint for validation
   */
  registerEndpoint(endpoint: APIEndpoint, schema: APIValidationSchema): void {
    const key = `${endpoint.method}:${endpoint.path}`;

    if (this.endpoints.has(key)) {
      console.warn(`Endpoint ${key} already registered, overwriting`);
    }

    this.endpoints.set(key, endpoint);
    this.schemas.set(key, schema);
  }

  /**
   * Get registered endpoint
   */
  getEndpoint(method: string, path: string): APIEndpoint | undefined {
    return this.endpoints.get(`${method}:${path}`);
  }

  /**
   * Get validation schema for endpoint
   */
  getSchema(method: string, path: string): APIValidationSchema | undefined {
    return this.schemas.get(`${method}:${path}`);
  }

  /**
   * Validate request against schema
   */
  async validateRequest(
    method: string,
    path: string,
    data: unknown
  ): Promise<{
    valid: boolean;
    data?: unknown;
    error?: {
      message: string;
      issues?: Array<{ path: string; message: string }>;
    };
  }> {
    const schema = this.getSchema(method, path);

    if (!schema) {
      return {
        valid: false,
        error: {
          message: `No validation schema found for ${method} ${path}`,
        },
      };
    }

    try {
      const validatedData = await schema.request.parseAsync(data);
      return {
        valid: true,
        data: validatedData,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          error: {
            message: 'Request validation failed',
            issues: error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
        };
      }

      return {
        valid: false,
        error: {
          message: 'Unknown validation error',
        },
      };
    }
  }

  /**
   * Validate response against schema
   */
  async validateResponse(
    method: string,
    path: string,
    data: unknown
  ): Promise<{
    valid: boolean;
    data?: unknown;
    error?: string;
  }> {
    const schema = this.getSchema(method, path);

    if (!schema) {
      return {
        valid: false,
        error: `No validation schema found for ${method} ${path}`,
      };
    }

    try {
      const validatedData = await schema.response.parseAsync(data);
      return {
        valid: true,
        data: validatedData,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Response validation failed',
      };
    }
  }

  /**
   * Validate HTTP headers for security
   */
  validateHeaders(headers: Record<string, string>): {
    valid: boolean;
    missing: string[];
    invalid: string[];
  } {
    const missing: string[] = [];
    const invalid: string[] = [];

    // Check required headers
    for (const required of this.policy.requiredHeaders) {
      if (!headers[required.toLowerCase()]) {
        missing.push(required);
      }
    }

    // Validate header values
    const headersLower = Object.keys(headers).map((h) => h.toLowerCase());

    if (headersLower.includes('content-type')) {
      const contentType = headers['content-type'] || '';
      const baseType = contentType.split(';')[0].trim();

      if (!this.policy.allowedContentTypes.includes(baseType)) {
        invalid.push(`Content-Type: ${contentType}`);
      }
    }

    return {
      valid: missing.length === 0 && invalid.length === 0,
      missing,
      invalid,
    };
  }

  /**
   * Validate HTTP method
   */
  validateMethod(method: string): boolean {
    return this.policy.allowedMethods.includes(method);
  }

  /**
   * Validate payload size
   */
  validatePayloadSize(size: number): boolean {
    return size <= this.policy.maxPayloadSize;
  }

  /**
   * Create safe API response
   */
  createResponse<T>(
    success: boolean,
    data?: T,
    error?: {
      code: string;
      message: string;
      details?: Record<string, unknown>;
    },
    requestId?: string
  ): APIResponse<T> {
    return {
      success,
      data,
      error,
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  /**
   * Get API documentation
   */
  getAPIDocs(): {
    endpoints: APIEndpoint[];
    securityPolicy: APISecurityPolicy;
    totalEndpoints: number;
  } {
    const endpoints = Array.from(this.endpoints.values());

    return {
      endpoints,
      securityPolicy: this.policy,
      totalEndpoints: endpoints.length,
    };
  }

  /**
   * Check if endpoint requires authentication
   */
  requiresAuth(method: string, path: string): boolean {
    const endpoint = this.getEndpoint(method, path);
    return endpoint?.authRequired ?? this.policy.requireAuth;
  }

  /**
   * Get rate limit for endpoint
   */
  getRateLimit(method: string, path: string): number {
    const endpoint = this.getEndpoint(method, path);
    return endpoint?.rateLimit ?? this.policy.rateLimit;
  }

  /**
   * Validate API versioning header
   */
  validateAPIVersion(version?: string): {
    valid: boolean;
    reason?: string;
  } {
    if (!version) {
      return {
        valid: false,
        reason: 'API version header not provided',
      };
    }

    const versionRegex = /^v\d+(\.\d+)*$/;
    if (!versionRegex.test(version)) {
      return {
        valid: false,
        reason: 'Invalid API version format. Expected format: v1, v1.0, v1.0.0, etc.',
      };
    }

    return { valid: true };
  }

  /**
   * Normalize API paths
   */
  normalizePath(path: string): string {
    // Remove trailing slashes
    let normalized = path.replace(/\/$/, '') || '/';

    // Lowercase path except parameters
    normalized = normalized.replace(/([^{}])/g, (match) =>
      /[a-z0-9/_-]/i.test(match) ? match.toLowerCase() : match
    );

    return normalized;
  }

  /**
   * Detect deprecated endpoints
   */
  getDeprecatedEndpoints(): APIEndpoint[] {
    return Array.from(this.endpoints.values()).filter((ep) => ep.deprecated);
  }

  /**
   * Detect experimental endpoints
   */
  getExperimentalEndpoints(): APIEndpoint[] {
    return Array.from(this.endpoints.values()).filter((ep) => ep.experimental);
  }

  /**
   * Set custom security policy
   */
  setSecurityPolicy(policy: Partial<APISecurityPolicy>): void {
    this.policy = {
      ...this.policy,
      ...policy,
    };
  }
}

export const apiValidator = SecureAPIValidator.getInstance();
export type {
  APIEndpoint,
  APISecurityPolicy,
  APIValidationSchema,
  APIResponse,
};
