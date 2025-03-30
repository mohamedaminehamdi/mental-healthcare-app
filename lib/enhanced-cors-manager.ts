/**
 * Enhanced CORS & Origin Validation
 * ==================================
 * Day 4: Address CORS bypass vulnerabilities from audit
 */

import { logger } from './logger';

export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  allowCredentials: boolean;
  maxAge: number;
  exposedHeaders: string[];
}

export class EnhancedCORSManager {
  private allowedOrigins: Set<string> = new Set();
  private originPatterns: RegExp[] = [];
  private blockedOrigins: Set<string> = new Set();
  private corsViolations: Map<string, number> = new Map();

  constructor(config: CORSConfig) {
    this.initializeOrigins(config.allowedOrigins);
  }

  private initializeOrigins(origins: string[]): void {
    origins.forEach(origin => {
      if (origin.includes('*')) {
        // Convert glob patterns to regex
        const pattern = origin
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*');
        this.originPatterns.push(new RegExp(`^${pattern}$`));
      } else {
        try {
          const url = new URL(origin);
          this.allowedOrigins.add(url.origin);
        } catch {
          logger.error('Invalid origin in CORS config', { origin });
        }
      }
    });
  }

  /**
   * Validate origin against whitelist
   */
  public isOriginAllowed(origin: string): boolean {
    // Check exact match
    if (this.allowedOrigins.has(origin)) {
      return true;
    }

    // Check pattern match
    for (const pattern of this.originPatterns) {
      if (pattern.test(origin)) {
        return true;
      }
    }

    // Log violation
    this.recordCORSViolation(origin);
    return false;
  }

  private recordCORSViolation(origin: string): void {
    const count = (this.corsViolations.get(origin) || 0) + 1;
    this.corsViolations.set(origin, count);

    if (count > 10) {
      this.blockedOrigins.add(origin);
      logger.error('Origin blocked after repeated violations', {
        origin,
        violationCount: count
      });
    } else {
      logger.warn('CORS violation attempt', {
        origin,
        violationCount: count
      });
    }
  }

  /**
   * Generate CORS headers for response
   */
  public getHeaders(origin: string, requestHeaders?: string): {
    [key: string]: string;
  } {
    if (!this.isOriginAllowed(origin)) {
      return {}; // No CORS headers if origin not allowed
    }

    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods':
        'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers':
        requestHeaders || 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Expose-Headers': 'Content-Length, X-JSON-Response-Size'
    };
  }

  /**
   * Validate preflight request
   */
  public validatePreflight(
    origin: string,
    method: string,
    requestHeaders?: string
  ): boolean {
    // Origin check
    if (!this.isOriginAllowed(origin)) {
      logger.error('Preflight rejected: disallowed origin', { origin });
      return false;
    }

    // Method check
    const allowedMethods = [
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
      'OPTIONS'
    ];
    if (!allowedMethods.includes(method.toUpperCase())) {
      logger.error('Preflight rejected: disallowed method', { method });
      return false;
    }

    // Header check
    if (requestHeaders) {
      const requestHeadersList = requestHeaders
        .split(',')
        .map(h => h.trim().toLowerCase());
      const allowedHeaders = [
        'content-type',
        'authorization',
        'accept',
        'x-requested-with'
      ];

      const invalidHeaders = requestHeadersList.filter(
        h => !allowedHeaders.includes(h)
      );
      if (invalidHeaders.length > 0) {
        logger.warn('Preflight warning: unusual headers requested', {
          headers: invalidHeaders
        });
      }
    }

    return true;
  }

  /**
   * Get statistics on CORS violations
   */
  public getViolationStats(): {
    totalViolations: number;
    blockedOrigins: string[];
    topViolators: Array<{ origin: string; count: number }>;
  } {
    const violations = Array.from(this.corsViolations.entries());
    const topViolators = violations
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([origin, count]) => ({ origin, count }));

    return {
      totalViolations: violations.reduce((sum, [_, count]) => sum + count, 0),
      blockedOrigins: Array.from(this.blockedOrigins),
      topViolators
    };
  }
}

/**
 * Middleware factory for Express/Next.js
 */
export function createCORSMiddleware(config: CORSConfig) {
  const corsManager = new EnhancedCORSManager(config);

  return (req: any, res: any, next: any) => {
    const origin = req.headers.origin;

    if (!origin) {
      // Non-CORS request
      return next();
    }

    if (
      req.method === 'OPTIONS' ||
      req.method === 'options'
    ) {
      // Preflight request
      const requestHeaders = req.headers['access-control-request-headers'];
      const requestMethod = req.headers[
        'access-control-request-method'
      ] as string;

      if (
        !corsManager.validatePreflight(origin, requestMethod, requestHeaders)
      ) {
        return res.status(403).end();
      }
    }

    if (!corsManager.isOriginAllowed(origin)) {
      logger.error('CORS request rejected for origin', { origin });
      return res.status(403).end();
    }

    // Set CORS headers
    const headers = corsManager.getHeaders(
      origin,
      req.headers['access-control-request-headers']
    );
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    next();
  };
}
