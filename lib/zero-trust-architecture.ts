/**
 * Zero-Trust Architecture & Advanced Threat Prevention
 * ======================================================
 * Days 22-27: Enhanced security hardening for healthcare data
 */

import { logger } from './logger';

export interface ZeroTrustPolicy {
  name: string;
  resources: string[];
  principals: string[];
  conditions: string[];
  action: 'allow' | 'deny';
  enforceAt: 'network' | 'application' | 'data';
}

export interface TrustScore {
  userId: string;
  score: number; // 0-100
  factors: {
    deviceTrust: number;
    locationTrust: number;
    timeTrust: number;
    behaviorTrust: number;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class ZeroTrustManager {
  private policies: Map<string, ZeroTrustPolicy> = new Map();
  private trustScores: Map<string, TrustScore> = new Map();
  private threatLog: Array<{
    userId: string;
    timestamp: Date;
    threatType: string;
    severity: string;
  }> = [];

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Evaluate connection with zero-trust model
   */
  public evaluateConnection(
    userId: string,
    resource: string,
    context: {
      deviceId: string;
      location: { lat: number; lng: number };
      timestamp: Date;
      userAgent: string;
    }
  ): { allowed: boolean; trustScore: TrustScore; violations: string[] } {
    const violations: string[] = [];

    // Calculate trust score
    const trustScore = this.calculateTrustScore(userId, context);
    this.trustScores.set(userId, trustScore);

    // Check policies
    const applicablePolicies = Array.from(
      this.policies.values()
    ).filter(
      p => p.resources.includes(resource) &&
        p.principals.includes(userId)
    );

    let allowed = false;
    for (const policy of applicablePolicies) {
      if (policy.action === 'allow') {
        // Check conditions
        const conditionsMet = this.evaluateConditions(
          policy.conditions,
          context,
          trustScore
        );
        if (conditionsMet) {
          allowed = true;
          break;
        } else {
          violations.push(`Policy conditions not met: ${policy.name}`);
        }
      }
    }

    // Check trust score thresholds
    if (trustScore.riskLevel === 'critical') {
      allowed = false;
      violations.push('Risk level critical - access denied');
      this.logThreat(userId, 'critical_risk_detected');
    } else if (
      trustScore.riskLevel === 'high' &&
      resource.includes('sensitive')
    ) {
      allowed = false;
      violations.push(
        'High risk level for sensitive resource'
      );
      this.logThreat(userId, 'high_risk_on_sensitive');
    }

    logger.log('Zero-Trust evaluation completed', {
      userId,
      resource,
      allowed,
      trustScore: trustScore.score,
      violations: violations.length
    });

    return { allowed, trustScore, violations };
  }

  /**
   * Calculate trust score for user
   */
  private calculateTrustScore(
    userId: string,
    context: {
      deviceId: string;
      location: { lat: number; lng: number };
      timestamp: Date;
      userAgent: string;
    }
  ): TrustScore {
    const deviceTrust = this.evaluateDeviceTrust(context.deviceId);
    const locationTrust = this.evaluateLocationTrust(
      userId,
      context.location
    );
    const timeTrust = this.evaluateTimeTrust(userId, context.timestamp);
    const behaviorTrust = this.evaluateBehaviorTrust(userId);

    const score = Math.round(
      (deviceTrust + locationTrust + timeTrust + behaviorTrust) / 4
    );

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' =
      'low';
    if (score < 30) {
      riskLevel = 'critical';
    } else if (score < 50) {
      riskLevel = 'high';
    } else if (score < 70) {
      riskLevel = 'medium';
    }

    return {
      userId,
      score,
      factors: {
        deviceTrust,
        locationTrust,
        timeTrust,
        behaviorTrust
      },
      riskLevel
    };
  }

  private evaluateDeviceTrust(deviceId: string): number {
    // Check if device is registered and compliant
    // Mock: return 85 for registered devices
    return 85;
  }

  private evaluateLocationTrust(
    userId: string,
    location: { lat: number; lng: number }
  ): number {
    // Check if location is consistent with user history
    // Mock: return 75 for expected locations
    return 75;
  }

  private evaluateTimeTrust(userId: string, timestamp: Date): number {
    // Check if access time is within normal working hours
    const hour = timestamp.getHours();
    if (hour >= 6 && hour < 22) {
      return 90;
    }
    return 40; // High risk outside working hours
  }

  private evaluateBehaviorTrust(userId: string): number {
    // Check for anomalous behavior patterns
    // Mock: return 80 for normal behavior
    return 80;
  }

  private evaluateConditions(
    conditions: string[],
    context: object,
    trustScore: TrustScore
  ): boolean {
    // Simplified condition evaluation
    return trustScore.score >= 60;
  }

  /**
   * Add zero-trust policy
   */
  public addPolicy(policy: ZeroTrustPolicy): void {
    this.policies.set(policy.name, policy);
    logger.log('Zero-Trust policy added', {
      policy: policy.name,
      resources: policy.resources.length,
      principals: policy.principals.length
    });
  }

  private logThreat(userId: string, threatType: string): void {
    this.threatLog.push({
      userId,
      timestamp: new Date(),
      threatType,
      severity: 'high'
    });
  }

  /**
   * Get security posture
   */
  public getSecurityPosture(): {
    lowRiskUsers: number;
    mediumRiskUsers: number;
    highRiskUsers: number;
    criticalRiskUsers: number;
    threatsDetected: number;
  } {
    const riskCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    this.trustScores.forEach(score => {
      riskCounts[score.riskLevel]++;
    });

    return {
      lowRiskUsers: riskCounts.low,
      mediumRiskUsers: riskCounts.medium,
      highRiskUsers: riskCounts.high,
      criticalRiskUsers: riskCounts.critical,
      threatsDetected: this.threatLog.filter(
        t =>
          new Date().getTime() - t.timestamp.getTime() <
          24 * 60 * 60 * 1000
      ).length
    };
  }

  private initializeDefaultPolicies(): void {
    // Example policies
    this.addPolicy({
      name: 'patient-data-access',
      resources: [
        'patients/*',
        'medical-records/*'
      ],
      principals: ['doctors', 'nurses'],
      conditions: [
        'trust_score >= 70',
        'device_compliant',
        'location_expected'
      ],
      action: 'allow',
      enforceAt: 'data'
    });
  }
}

export const zeroTrustManager = new ZeroTrustManager();
