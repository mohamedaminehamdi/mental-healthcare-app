/**
 * Error handling and logging utilities
 * Logs security events without exposing sensitive information
 */

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  CRITICAL = "critical",
}

export enum SecurityEvent {
  AUTH_FAILED = "AUTH_FAILED",
  UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
  VALIDATION_FAILED = "VALIDATION_FAILED",
  FILE_UPLOAD_FAILED = "FILE_UPLOAD_FAILED",
  DATA_ACCESS = "DATA_ACCESS",
  DATA_MODIFICATION = "DATA_MODIFICATION",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: SecurityEvent | string;
  userId?: string;
  ipAddress?: string;
  details?: Record<string, any>;
  userAgent?: string;
}

/**
 * Safe logger that doesn't expose sensitive information
 */
class SecurityLogger {
  private static instance: SecurityLogger;

  private constructor() {}

  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    level: LogLevel,
    event: SecurityEvent,
    userId?: string,
    ipAddress?: string,
    details?: Record<string, any>
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      userId,
      ipAddress,
      details: this.sanitizeDetails(details),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };

    this.writeLog(logEntry);

    // Send critical events to monitoring service
    if (level === LogLevel.CRITICAL || level === LogLevel.ERROR) {
      this.notifySecurityTeam(logEntry);
    }
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeDetails(details?: Record<string, any>): Record<string, any> {
    if (!details) return {};

    const sanitized: Record<string, any> = {};
    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "key",
      "api_key",
      "authorization",
      "creditcard",
      "ssn",
    ];

    for (const [key, value] of Object.entries(details)) {
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Write log entry
   */
  private writeLog(entry: LogEntry): void {
    if (process.env.NODE_ENV === "production") {
      // Send to logging service (CloudWatch, ELK, Datadog, etc.)
      // console.log(JSON.stringify(entry));
    } else {
      console.log(`[${entry.level.toUpperCase()}] ${entry.event}`, entry);
    }
  }

  /**
   * Notify security team of critical events
   */
  private notifySecurityTeam(entry: LogEntry): void {
    // Send alert to security team
    // This could be an email, Slack message, or security monitoring service
    if (process.env.SECURITY_ALERT_WEBHOOK) {
      // fetch(process.env.SECURITY_ALERT_WEBHOOK, {
      //   method: "POST",
      //   body: JSON.stringify(entry),
      // }).catch(console.error);
    }
  }

  /**
   * Log authentication failure
   */
  logAuthFailure(userId: string, ipAddress?: string, reason?: string): void {
    this.logSecurityEvent(
      LogLevel.WARN,
      SecurityEvent.AUTH_FAILED,
      userId,
      ipAddress,
      { reason }
    );
  }

  /**
   * Log unauthorized access attempt
   */
  logUnauthorizedAccess(
    userId: string,
    resource: string,
    ipAddress?: string
  ): void {
    this.logSecurityEvent(
      LogLevel.ERROR,
      SecurityEvent.UNAUTHORIZED_ACCESS,
      userId,
      ipAddress,
      { resource }
    );
  }

  /**
   * Log validation failure
   */
  logValidationFailure(field: string, reason: string, ipAddress?: string): void {
    this.logSecurityEvent(
      LogLevel.WARN,
      SecurityEvent.VALIDATION_FAILED,
      undefined,
      ipAddress,
      { field, reason }
    );
  }

  /**
   * Log data access
   */
  logDataAccess(userId: string, dataType: string, ipAddress?: string): void {
    this.logSecurityEvent(
      LogLevel.INFO,
      SecurityEvent.DATA_ACCESS,
      userId,
      ipAddress,
      { dataType }
    );
  }

  /**
   * Log data modification
   */
  logDataModification(
    userId: string,
    dataType: string,
    action: string,
    ipAddress?: string
  ): void {
    this.logSecurityEvent(
      LogLevel.INFO,
      SecurityEvent.DATA_MODIFICATION,
      userId,
      ipAddress,
      { dataType, action }
    );
  }

  /**
   * Log rate limit exceeded
   */
  logRateLimitExceeded(ipAddress: string): void {
    this.logSecurityEvent(
      LogLevel.WARN,
      SecurityEvent.RATE_LIMIT_EXCEEDED,
      undefined,
      ipAddress
    );
  }
}

export const logger = SecurityLogger.getInstance();

/**
 * Create safe error response (no stack traces or sensitive info)
 */
export function createSafeErrorResponse(
  error: unknown,
  statusCode: number = 500
): { error: string; statusCode: number } {
  let message = "An unexpected error occurred";

  if (error instanceof Error) {
    // Log the actual error internally
    logger.logSecurityEvent(
      LogLevel.ERROR,
      "ERROR",
      undefined,
      undefined,
      { error: error.message }
    );

    // Return generic message to client
    if (statusCode === 400) {
      message = "Invalid request";
    } else if (statusCode === 401) {
      message = "Authentication required";
    } else if (statusCode === 403) {
      message = "Access denied";
    } else if (statusCode === 404) {
      message = "Resource not found";
    }
  }

  return { error: message, statusCode };
}

/**
 * Express/Next.js error handler middleware
 */
export function errorHandler(
  error: Error,
  statusCode: number = 500
): Response {
  const { error: message, statusCode: code } = createSafeErrorResponse(
    error,
    statusCode
  );

  return new Response(
    JSON.stringify({
      success: false,
      message,
      timestamp: new Date().toISOString(),
    }),
    {
      status: code,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
