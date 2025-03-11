/**
 * Advanced Rate Limiting & API Throttling
 * Multi-level throttling with distributed cache support
 */

interface RateLimitBucket {
  key: string;
  requests: number;
  resetTime: number; // Unix timestamp
  windowSize: number; // milliseconds
}

interface ThrottleConfig {
  globalLimit: number; // total requests per window
  perIPLimit: number; // per IP per window
  perUserLimit: number; // per authenticated user per window
  perEndpointLimit: Record<string, number>; // per endpoint
  windowSize: number; // milliseconds
  burstSize: number; // allow temporary burst
  penaltyDuration: number; // milliseconds to ban after limit
}

interface RateLimitViolation {
  key: string;
  violationType: 'global' | 'ip' | 'user' | 'endpoint';
  timestamp: Date;
  requestedLimit: number;
  currentRequests: number;
  retryAfter: number; // seconds
}

const DEFAULT_THROTTLE_CONFIG: ThrottleConfig = {
  globalLimit: 10000, // 10k requests
  perIPLimit: 300, // 300 requests per IP
  perUserLimit: 500, // 500 requests per user
  perEndpointLimit: {
    '/api/auth/login': 10,
    '/api/auth/register': 5,
    '/api/users': 100,
  },
  windowSize: 60000, // 1 minute
  burstSize: 50, // allow 50% burst temporarily
  penaltyDuration: 3600000, // 1 hour ban after violation
};

class AdvancedRateLimiter {
  private static instance: AdvancedRateLimiter;
  private buckets: Map<string, RateLimitBucket> = new Map();
  private violations: Map<string, RateLimitViolation> = new Map();
  private config: ThrottleConfig;
  private cleanupInterval: NodeJS.Timer | null = null;

  private constructor() {
    this.config = DEFAULT_THROTTLE_CONFIG;
    this.startCleanupTimer();
  }

  static getInstance(): AdvancedRateLimiter {
    if (!AdvancedRateLimiter.instance) {
      AdvancedRateLimiter.instance = new AdvancedRateLimiter();
    }
    return AdvancedRateLimiter.instance;
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(
    ip: string,
    userId?: string,
    endpoint?: string
  ): Promise<{
    allowed: boolean;
    violation?: RateLimitViolation;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();

    // Check if IP is in penalty phase
    const penaltyKey = `penalty:${ip}`;
    const penalty = this.violations.get(penaltyKey);
    if (penalty && penalty.timestamp.getTime() + this.config.penaltyDuration > now) {
      return {
        allowed: false,
        violation: penalty,
        remaining: 0,
        resetTime: penalty.timestamp.getTime() + this.config.penaltyDuration,
      };
    }

    // Check global limit
    const globalKey = 'global';
    const globalCheck = await this.checkBucket(
      globalKey,
      this.config.globalLimit,
      this.config.windowSize
    );
    if (!globalCheck.allowed) {
      return {
        allowed: false,
        violation: this.createViolation('global', globalKey, this.config.globalLimit, globalCheck.requests),
        remaining: 0,
        resetTime: globalCheck.resetTime,
      };
    }

    // Check per-IP limit
    const ipKey = `ip:${ip}`;
    const ipCheck = await this.checkBucket(
      ipKey,
      this.config.perIPLimit,
      this.config.windowSize
    );
    if (!ipCheck.allowed) {
      this.recordViolation(ipKey, 'ip', this.config.perIPLimit, ipCheck.requests);
      return {
        allowed: false,
        violation: this.createViolation('ip', ipKey, this.config.perIPLimit, ipCheck.requests),
        remaining: 0,
        resetTime: ipCheck.resetTime,
      };
    }

    // Check per-user limit (if authenticated)
    if (userId) {
      const userKey = `user:${userId}`;
      const userCheck = await this.checkBucket(
        userKey,
        this.config.perUserLimit,
        this.config.windowSize
      );
      if (!userCheck.allowed) {
        this.recordViolation(
          userKey,
          'user',
          this.config.perUserLimit,
          userCheck.requests
        );
        return {
          allowed: false,
          violation: this.createViolation('user', userKey, this.config.perUserLimit, userCheck.requests),
          remaining: 0,
          resetTime: userCheck.resetTime,
        };
      }
    }

    // Check per-endpoint limit
    if (endpoint && this.config.perEndpointLimit[endpoint]) {
      const endpointKey = `endpoint:${endpoint}:${ip}`;
      const endpointLimit = this.config.perEndpointLimit[endpoint];
      const endpointCheck = await this.checkBucket(
        endpointKey,
        endpointLimit,
        this.config.windowSize
      );
      if (!endpointCheck.allowed) {
        this.recordViolation(
          endpointKey,
          'endpoint',
          endpointLimit,
          endpointCheck.requests
        );
        return {
          allowed: false,
          violation: this.createViolation('endpoint', endpointKey, endpointLimit, endpointCheck.requests),
          remaining: 0,
          resetTime: endpointCheck.resetTime,
        };
      }
    }

    // All checks passed
    const ipBucket = this.buckets.get(ipKey);
    return {
      allowed: true,
      remaining: ipBucket ? this.config.perIPLimit - ipBucket.requests : this.config.perIPLimit,
      resetTime: ipBucket?.resetTime ?? now + this.config.windowSize,
    };
  }

  /**
   * Check individual bucket
   */
  private async checkBucket(
    key: string,
    limit: number,
    windowSize: number
  ): Promise<{
    allowed: boolean;
    requests: number;
    resetTime: number;
  }> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    // Create new bucket if doesn't exist or expired
    if (!bucket || bucket.resetTime < now) {
      bucket = {
        key,
        requests: 1,
        resetTime: now + windowSize,
        windowSize,
      };
      this.buckets.set(key, bucket);
      return {
        allowed: true,
        requests: 1,
        resetTime: bucket.resetTime,
      };
    }

    // Increment requests
    bucket.requests++;

    // Allow for temporary burst (110% of limit)
    const burstLimit = Math.ceil(limit * (1 + this.config.burstSize / 100));
    const allowed = bucket.requests <= burstLimit;

    // Enforce hard limit
    if (bucket.requests > limit && bucket.requests <= burstLimit) {
      console.warn(`Rate limit burst detected for key: ${key}`);
    }

    return {
      allowed: bucket.requests <= limit,
      requests: bucket.requests,
      resetTime: bucket.resetTime,
    };
  }

  /**
   * Create violation record
   */
  private createViolation(
    type: string,
    key: string,
    limit: number,
    current: number
  ): RateLimitViolation {
    return {
      key,
      violationType: type as any,
      timestamp: new Date(),
      requestedLimit: limit,
      currentRequests: current,
      retryAfter: Math.ceil(this.config.windowSize / 1000),
    };
  }

  /**
   * Record violation for penalty
   */
  private recordViolation(
    key: string,
    type: string,
    limit: number,
    current: number
  ): void {
    const violation = this.createViolation(type, key, limit, current);
    this.violations.set(key, violation);
  }

  /**
   * Manual bypass for trusted sources
   */
  addTrustedSource(ip: string, duration: number = 86400000): void {
    const key = `trusted:${ip}`;
    this.buckets.delete(`ip:${ip}`);
    this.violations.delete(`penalty:${ip}`);
    console.log(`Added trusted source: ${ip}`);
  }

  /**
   * Revoke trust for source
   */
  revokeTrustedSource(ip: string): void {
    const key = `trusted:${ip}`;
    this.buckets.delete(key);
    console.log(`Revoked trusted source: ${ip}`);
  }

  /**
   * Get bucket stats
   */
  getBucketStats(key: string): RateLimitBucket | undefined {
    return this.buckets.get(key);
  }

  /**
   * Reset bucket
   */
  resetBucket(key: string): void {
    this.buckets.delete(key);
    console.log(`Reset rate limit bucket: ${key}`);
  }

  /**
   * Get all violations
   */
  getViolations(): RateLimitViolation[] {
    return Array.from(this.violations.values());
  }

  /**
   * Clear expired violations
   */
  private clearExpiredViolations(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, violation] of this.violations) {
      if (violation.timestamp.getTime() + this.config.penaltyDuration < now) {
        expired.push(key);
      }
    }

    expired.forEach((key) => this.violations.delete(key));
  }

  /**
   * Cleanup timer for expired buckets
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const expired: string[] = [];

      for (const [key, bucket] of this.buckets) {
        if (bucket.resetTime < now) {
          expired.push(key);
        }
      }

      expired.forEach((key) => this.buckets.delete(key));
      this.clearExpiredViolations();
    }, 60000); // Cleanup every minute
  }

  /**
   * Get current config
   */
  getConfig(): ThrottleConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<ThrottleConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.buckets.clear();
    this.violations.clear();
  }
}

export const advancedRateLimiter = AdvancedRateLimiter.getInstance();
export type { RateLimitBucket, ThrottleConfig, RateLimitViolation };
