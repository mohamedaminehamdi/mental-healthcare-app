/**
 * Advanced Input Validation & Injection Prevention
 * ================================================
 * Day 2-3: Enhanced protection against OWASP A03:2021
 */

import { z } from 'zod';
import { logger } from './logger';

interface ValidationRule {
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  allowedChars?: string;
  customValidator?: (value: string) => boolean;
}

interface InjectionThreat {
  type: string;
  pattern: RegExp;
  severity: 'HIGH' | 'CRITICAL';
  description: string;
}

export class EnhancedInputValidator {
  // SQL injection patterns
  private sqlInjectionPatterns: InjectionThreat[] = [
    {
      type: 'SQL_UNION',
      pattern: /(\bUNION\b.*\bSELECT\b|\bSELECT\b.*\bUNION\b)/i,
      severity: 'CRITICAL',
      description: 'UNION-based SQL injection'
    },
    {
      type: 'SQL_COMMENT',
      pattern: /(--|#|\/\*|\*\/)/,
      severity: 'HIGH',
      description: 'SQL comment sequences'
    },
    {
      type: 'SQL_STACKED',
      pattern: /;\s*\w+\s*(\(|=)/,
      severity: 'CRITICAL',
      description: 'Stacked query injection'
    },
    {
      type: 'NOQL_OPERATOR',
      pattern: /(\$|\.\.\.{3})/,
      severity: 'HIGH',
      description: 'NoSQL operator injection'
    }
  ];

  // XSS patterns
  private xssPatterns: RegExp[] = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:\s*/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi
  ];

  /**
   * Validate input against multiple threat patterns
   */
  public validateInput(
    input: string,
    fieldName: string,
    rule?: ValidationRule
  ): { isValid: boolean; threats: InjectionThreat[] } {
    const threats: InjectionThreat[] = [];

    // Check basic rules
    if (rule?.minLength && input.length < rule.minLength) {
      logger.warn('Input validation failed: too short', { fieldName });
      return { isValid: false, threats };
    }

    if (rule?.maxLength && input.length > rule.maxLength) {
      logger.warn('Input validation failed: too long', { fieldName });
      return { isValid: false, threats };
    }

    if (rule?.allowedChars) {
      const allowedRegex = new RegExp(`^[${rule.allowedChars}]*$`);
      if (!allowedRegex.test(input)) {
        logger.warn('Input validation failed: invalid characters', {
          fieldName
        });
        return { isValid: false, threats };
      }
    }

    // Check injection patterns
    for (const threat of this.sqlInjectionPatterns) {
      if (threat.pattern.test(input)) {
        threats.push(threat);
        logger.error('Injection threat detected', {
          fieldName,
          threatType: threat.type,
          severity: threat.severity
        });
      }
    }

    // Check XSS patterns
    for (const pattern of this.xssPatterns) {
      if (pattern.test(input)) {
        threats.push({
          type: 'XSS',
          pattern: pattern,
          severity: 'HIGH',
          description: 'HTML/JavaScript injection detected'
        });
        logger.error('XSS threat detected', { fieldName });
      }
    }

    // Custom validator
    if (
      rule?.customValidator &&
      !rule.customValidator(input)
    ) {
      logger.warn('Custom validation failed', { fieldName });
      return { isValid: false, threats };
    }

    return {
      isValid: threats.length === 0,
      threats
    };
  }

  /**
   * Sanitize input by removing/escaping dangerous characters
   */
  public sanitizeInput(input: string, type: 'sql' | 'html' | 'url'): string {
    switch (type) {
      case 'sql':
        return this.sanitizeSQL(input);
      case 'html':
        return this.sanitizeHTML(input);
      case 'url':
        return this.sanitizeURL(input);
      default:
        return input;
    }
  }

  private sanitizeSQL(input: string): string {
    // Escape single quotes and backslashes
    return input
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "''")
      .replace(/"/g, '\\"');
  }

  private sanitizeHTML(input: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return input.replace(/[&<>"']/g, char => map[char]);
  }

  private sanitizeURL(input: string): string {
    try {
      const url = new URL(input);
      // Only allow http and https
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }
      return url.toString();
    } catch {
      return '';
    }
  }

  /**
   * Database parameter schema validation
   */
  public createParamSchema(
    fields: { [key: string]: ValidationRule }
  ) {
    const schemaObj: { [key: string]: z.ZodTypeAny } = {};

    for (const [field, rule] of Object.entries(fields)) {
      let schema = z.string();

      if (rule.minLength) {
        schema = schema.min(rule.minLength);
      }
      if (rule.maxLength) {
        schema = schema.max(rule.maxLength);
      }
      if (rule.pattern) {
        schema = schema.regex(rule.pattern);
      }

      schemaObj[field] = schema;
    }

    return z.object(schemaObj);
  }
}

// Export singleton
export const enhancedInputValidator = new EnhancedInputValidator();

// Zod preset for healthcare data
export const HealthcareInputSchemas = {
  email: z.string().email().toLowerCase(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{10,}$/, 'Invalid phone format'),
  medicalId: z.string().regex(/^[A-Z0-9\-]{10,20}$/, 'Invalid medical ID'),
  prescription: z
    .string()
    .min(10)
    .max(500)
    .regex(/^[a-zA-Z0-9\s\-(),./]*$/, 'Invalid characters in prescription'),
  diagnosis: z
    .string()
    .min(5)
    .max(1000)
    .regex(/^[a-zA-Z0-9\s\-(),./]*$/, 'Invalid characters in diagnosis'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
};
