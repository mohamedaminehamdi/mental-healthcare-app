/**
 * Advanced Threat Detection & Anomaly Scoring
 * Real-time behavioral analysis for detecting suspicious activities
 */

interface UserBehaviorProfile {
  userId: string;
  averageRequestsPerMinute: number;
  uniqueIPAddresses: Set<string>;
  usualgeographicLocation?: string;
  typicalRequestPatterns: Map<string, number>;
  lastActivities: Array<{
    timestamp: Date;
    endpoint: string;
    ip: string;
    statusCode: number;
  }>;
}

interface ThreatSignal {
  id: string;
  type: 'brute-force' | 'credential-stuffing' | 'sql-injection' | 'xss' | 'ddos' | 'account-takeover' | 'data-exfiltration' | 'privilege-escalation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  timestamp: Date;
  ip: string;
  userId?: string;
  endpoint?: string;
  description: string;
  evidence: string[];
}

interface AnomalyScore {
  userId: string;
  ip: string;
  timestamp: Date;
  overallScore: number; // 0-100
  factors: {
    velocityAnomaly: number;
    geographicAnomaly: number;
    behaviorDeviation: number;
    failureRateAnomaly: number;
    timeBasedAnomaly: number;
  };
  recommendation: 'allow' | 'challenge' | 'block';
}

const THREAT_PATTERNS = {
  bruteForce: {
    failedAttemptsThreshold: 5,
    timeWindow: 300000, // 5 minutes
    baseScore: 70,
  },
  credentialStuffing: {
    bulkLoginAttempts: 20,
    differentUsernamesThreshold: 10,
    timeWindow: 600000, // 10 minutes
    baseScore: 80,
  },
  ddos: {
    requestsPerSecond: 100,
    timeWindow: 60000,
    baseScore: 90,
  },
  accountTakeover: {
    simultaneousLoginAttempts: 3,
    geographicDistanceKm: 900, // 900km = approximately 1 hour flight
    timeWindow: 3600000, // 1 hour
    baseScore: 85,
  },
};

class AdvancedThreatDetector {
  private static instance: AdvancedThreatDetector;
  private userProfiles: Map<string, UserBehaviorProfile> = new Map();
  private threats: ThreatSignal[] = [];
  private ipReputation: Map<string, number> = new Map(); // 0-100, higher = worse

  private constructor() {}

  static getInstance(): AdvancedThreatDetector {
    if (!AdvancedThreatDetector.instance) {
      AdvancedThreatDetector.instance = new AdvancedThreatDetector();
    }
    return AdvancedThreatDetector.instance;
  }

  /**
   * Analyze request for threats
   */
  async analyzeRequest(
    userId: string | undefined,
    ip: string,
    endpoint: string,
    payload: unknown,
    statusCode: number
  ): Promise<{
    anomalyScore?: AnomalyScore;
    threats: ThreatSignal[];
  }> {
    const threats: ThreatSignal[] = [];

    // Check for SQL injection patterns
    const sqlInjectionThreat = this.detectSQLInjection(payload);
    if (sqlInjectionThreat) {
      threats.push(sqlInjectionThreat);
    }

    // Check for XSS patterns
    const xssThreat = this.detectXSS(payload);
    if (xssThreat) {
      threats.push(xssThreat);
    }

    // Analyze behavior if user is authenticated
    let anomalyScore: AnomalyScore | undefined;
    if (userId) {
      const profile = this.getUserProfile(userId, ip);
      anomalyScore = this.calculateAnomalyScore(userId, ip, profile);

      // Detect account takeover
      const takeover = this.detectAccountTakeover(userId, ip, profile);
      if (takeover) {
        threats.push(takeover);
      }

      // Detect data exfiltration
      const exfiltration = this.detectDataExfiltration(userId, endpoint, payload);
      if (exfiltration) {
        threats.push(exfiltration);
      }
    }

    // Detect DDoS patterns
    const ddosThreat = this.detectDDoS(ip);
    if (ddosThreat) {
      threats.push(ddosThreat);
    }

    // Check IP reputation
    const reputation = this.ipReputation.get(ip) || 0;
    if (reputation > 70) {
      threats.push({
        id: this.generateThreatId(),
        type: 'brute-force',
        severity: 'high',
        score: Math.min(100, reputation),
        timestamp: new Date(),
        ip,
        userId,
        endpoint,
        description: `IP ${ip} has high reputation score (${reputation}/100)`,
        evidence: [`High reputation score from previous violations`],
      });
    }

    // Store threats
    threats.forEach((threat) => this.threats.push(threat));

    return {
      anomalyScore,
      threats,
    };
  }

  /**
   * Detect SQL injection patterns
   */
  private detectSQLInjection(payload: unknown): ThreatSignal | null {
    const payloadStr = JSON.stringify(payload).toLowerCase();

    const sqlPatterns = [
      /union\s+select/,
      /select\s+.*\s+from/,
      /insert\s+into/,
      /delete\s+from/,
      /drop\s+table/,
      /exec\s*\(/,
      /execute\s*\(/,
      /;.*-{2}/, // SQL comment
      /'\s+or\s+'1'='1/,
      /"\s+or\s+"1"="1/,
    ];

    const detected = sqlPatterns.some((pattern) => pattern.test(payloadStr));

    if (detected) {
      return {
        id: this.generateThreatId(),
        type: 'sql-injection',
        severity: 'critical',
        score: 95,
        timestamp: new Date(),
        ip: 'unknown',
        description: 'SQL injection pattern detected in request',
        evidence: ['SQL keywords found in payload'],
      };
    }

    return null;
  }

  /**
   * Detect XSS patterns
   */
  private detectXSS(payload: unknown): ThreatSignal | null {
    const payloadStr = JSON.stringify(payload).toLowerCase();

    const xssPatterns = [
      /<script[^>]*>/,
      /on\w+\s*=/,
      /javascript:/,
      /eval\s*\(/,
      /expression\s*\(/,
      /<iframe[^>]*>/,
      /<object[^>]*>/,
      /<embed[^>]*>/,
      /alert\s*\(/,
      /prompt\s*\(/,
    ];

    const detected = xssPatterns.some((pattern) => pattern.test(payloadStr));

    if (detected) {
      return {
        id: this.generateThreatId(),
        type: 'xss',
        severity: 'high',
        score: 85,
        timestamp: new Date(),
        ip: 'unknown',
        description: 'XSS pattern detected in request',
        evidence: ['Potentially malicious JavaScript tags found'],
      };
    }

    return null;
  }

  /**
   * Get or create user behavior profile
   */
  private getUserProfile(userId: string, ip: string): UserBehaviorProfile {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {
        userId,
        averageRequestsPerMinute: 0,
        uniqueIPAddresses: new Set([ip]),
        typicalRequestPatterns: new Map(),
        lastActivities: [],
      });
    }

    return this.userProfiles.get(userId)!;
  }

  /**
   * Calculate anomaly score for request
   */
  private calculateAnomalyScore(
    userId: string,
    ip: string,
    profile: UserBehaviorProfile
  ): AnomalyScore {
    const timestamp = new Date();
    const factors = {
      velocityAnomaly: this.calculateVelocityAnomaly(profile),
      geographicAnomaly: this.calculateGeographicAnomaly(ip, profile),
      behaviorDeviation: this.calculateBehaviorDeviation(profile),
      failureRateAnomaly: this.calculateFailureRateAnomaly(profile),
      timeBasedAnomaly: this.calculateTimeBasedAnomaly(profile),
    };

    // Calculate weighted overall score
    const overallScore = Math.min(
      100,
      (factors.velocityAnomaly * 0.2 +
        factors.geographicAnomaly * 0.25 +
        factors.behaviorDeviation * 0.2 +
        factors.failureRateAnomaly * 0.2 +
        factors.timeBasedAnomaly * 0.15) *
        100
    );

    return {
      userId,
      ip,
      timestamp,
      overallScore: Math.round(overallScore),
      factors,
      recommendation:
        overallScore > 75 ? 'block' : overallScore > 50 ? 'challenge' : 'allow',
    };
  }

  /**
   * Calculate velocity anomaly (rapid request sequence)
   */
  private calculateVelocityAnomaly(profile: UserBehaviorProfile): number {
    const now = Date.now();
    const recentRequests = profile.lastActivities.filter(
      (activity) => now - activity.timestamp.getTime() < 60000
    ).length;

    const baseline = profile.averageRequestsPerMinute || 10;
    const velocityRatio = Math.min(1, recentRequests / (baseline * 3)); // 3x = anomaly

    return velocityRatio;
  }

  /**
   * Calculate geographic anomaly
   */
  private calculateGeographicAnomaly(ip: string, profile: UserBehaviorProfile): number {
    if (profile.uniqueIPAddresses.size === 0) return 0;

    // Simplified: penalize if multiple IPs in short timeframe
    const uniqueIPs = profile.uniqueIPAddresses.size;
    const anomalyScore = Math.min(1, (uniqueIPs - 1) / 5); // 5+ IPs = anomaly

    return anomalyScore;
  }

  /**
   * Calculate behavior deviation from baseline
   */
  private calculateBehaviorDeviation(profile: UserBehaviorProfile): number {
    if (profile.typicalRequestPatterns.size === 0) return 0;

    // Would compare current request to established patterns
    // Simplified for now
    return 0.1;
  }

  /**
   * Calculate failure rate anomaly
   */
  private calculateFailureRateAnomaly(profile: UserBehaviorProfile): number {
    const now = Date.now();
    const recentActivities = profile.lastActivities.filter(
      (activity) => now - activity.timestamp.getTime() < 300000
    );

    if (recentActivities.length === 0) return 0;

    const failureCount = recentActivities.filter(
      (activity) => activity.statusCode >= 400
    ).length;
    const failureRate = failureCount / recentActivities.length;

    return Math.min(1, failureRate);
  }

  /**
   * Calculate time-based anomaly
   */
  private calculateTimeBasedAnomaly(profile: UserBehaviorProfile): number {
    const now = new Date();
    const hour = now.getHours();

    // Penalize unusual hours (22:00-06:00)
    if (hour >= 22 || hour < 6) {
      return 0.3;
    }

    return 0;
  }

  /**
   * Detect account takeover
   */
  private detectAccountTakeover(
    userId: string,
    ip: string,
    profile: UserBehaviorProfile
  ): ThreatSignal | null {
    // Check for simultaneous logins from different IPs
    const now = Date.now();
    const recentIPs = new Set(
      profile.lastActivities
        .filter((activity) => now - activity.timestamp.getTime() < 3600000)
        .map((activity) => activity.ip)
    );

    if (recentIPs.size > 2) {
      return {
        id: this.generateThreatId(),
        type: 'account-takeover',
        severity: 'critical',
        score: 90,
        timestamp: new Date(),
        ip,
        userId,
        description: `Account ${userId} accessed from ${recentIPs.size} different IPs within 1 hour`,
        evidence: [
          `IPs: ${Array.from(recentIPs).join(', ')}`,
          'Geographic dispersion detected',
        ],
      };
    }

    return null;
  }

  /**
   * Detect data exfiltration
   */
  private detectDataExfiltration(
    userId: string,
    endpoint: string,
    payload: unknown
  ): ThreatSignal | null {
    // Detect unusual data export requests
    const exportPatterns = [
      '/export',
      '/download',
      '/csv',
      '/pdf',
      '/report',
    ];

    const isExportEndpoint = exportPatterns.some((pattern) =>
      endpoint.includes(pattern)
    );

    if (isExportEndpoint) {
      const payloadStr = JSON.stringify(payload);
      const dataSize = payloadStr.length;

      // Flag if trying to export large amounts of data
      if (dataSize > 10 * 1024 * 1024) {
        // 10MB
        return {
          id: this.generateThreatId(),
          type: 'data-exfiltration',
          severity: 'high',
          score: 75,
          timestamp: new Date(),
          ip: 'unknown',
          userId,
          endpoint,
          description: `Potential data exfiltration: ${Math.round(dataSize / 1024)}MB export attempt`,
          evidence: [`Endpoint: ${endpoint}`, `Payload size: ${dataSize} bytes`],
        };
      }
    }

    return null;
  }

  /**
   * Detect DDoS patterns
   */
  private detectDDoS(ip: string): ThreatSignal | null {
    const reputation = this.ipReputation.get(ip) || 0;

    // If reputation is already high, it's a known bad actor
    if (reputation > 80) {
      return {
        id: this.generateThreatId(),
        type: 'ddos',
        severity: 'high',
        score: 80,
        timestamp: new Date(),
        ip,
        description: `IP ${ip} identified as potential DDoS attacker`,
        evidence: [`High reputation score: ${reputation}/100`],
      };
    }

    return null;
  }

  /**
   * Update IP reputation
   */
  updateIPReputation(ip: string, score: number): void {
    const current = this.ipReputation.get(ip) || 0;
    // Gradually increase/decrease reputation
    const updated = current + (score - current) * 0.5;
    this.ipReputation.set(ip, Math.min(100, Math.max(0, updated)));
  }

  /**
   * Get threats
   */
  getThreats(limit: number = 100): ThreatSignal[] {
    return this.threats.slice(-limit);
  }

  /**
   * Get critical threats
   */
  getCriticalThreats(): ThreatSignal[] {
    return this.threats.filter((threat) => threat.severity === 'critical');
  }

  /**
   * Get threat statistics
   */
  getThreatStats(): {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  } {
    return {
      total: this.threats.length,
      critical: this.threats.filter((t) => t.severity === 'critical').length,
      high: this.threats.filter((t) => t.severity === 'high').length,
      medium: this.threats.filter((t) => t.severity === 'medium').length,
      low: this.threats.filter((t) => t.severity === 'low').length,
    };
  }

  /**
   * Generate unique threat ID
   */
  private generateThreatId(): string {
    return `threat_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`;
  }
}

export const threatDetector = AdvancedThreatDetector.getInstance();
export type { ThreatSignal, AnomalyScore, UserBehaviorProfile };
