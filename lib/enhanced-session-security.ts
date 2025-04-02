/**
 * Enhanced Session Security & DeviceFingerprinting
 * =================================================
 * Days 6-7: Session hijacking prevention and device binding
 */

import crypto from 'crypto';
import { logger } from './logger';

export interface SessionConfig {
  sessionTimeout: number; // milliseconds
  absoluteTimeout: number; // milliseconds
  idleTimeout: number; // milliseconds
  enableDeviceFingerprinting: boolean;
  allowConcurrentSessions: number;
}

export interface DeviceFingerprint {
  userAgent: string;
  ipAddress: string;
  acceptLanguage: string;
  timezone: string;
  screenResolution?: string;
  hash?: string;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  deviceFingerprint: DeviceFingerprint;
  ipAddress: string;
  userAgent: string;
  csrfToken: string;
  isActive: boolean;
}

export class EnhancedSessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();
  private config: SessionConfig;
  private sessionAnomalies: Array<{
    sessionId: string;
    userId: string;
    anomalyType: string;
    timestamp: Date;
  }> = [];

  constructor(config: SessionConfig) {
    this.config = config;
  }

  /**
   * Create new session with device fingerprinting
   */
  public createSession(
    userId: string,
    deviceInfo: DeviceFingerprint
  ): SessionData {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const now = new Date();

    const session: SessionData = {
      sessionId,
      userId,
      createdAt: now,
      lastActivity: now,
      expiresAt: new Date(now.getTime() + this.config.sessionTimeout),
      deviceFingerprint: {
        ...deviceInfo,
        hash: this.generateFingerprintHash(deviceInfo)
      },
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      csrfToken,
      isActive: true
    };

    this.sessions.set(sessionId, session);

    // Track sessions per user
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    // Enforce concurrent session limit
    const userSessionSet = this.userSessions.get(userId)!;
    if (userSessionSet.size > this.config.allowConcurrentSessions) {
      const oldestSessionId = Array.from(userSessionSet).sort((a, b) => {
        const t1 = this.sessions.get(a)?.createdAt.getTime() || 0;
        const t2 = this.sessions.get(b)?.createdAt.getTime() || 0;
        return t1 - t2;
      })[0];

      this.sessions.delete(oldestSessionId);
      userSessionSet.delete(oldestSessionId);

      logger.warn('Concurrent session limit exceeded, removing oldest session', {
        userId,
        removedSessionId: oldestSessionId
      });
    }

    logger.log('Session created', {
      sessionId,
      userId,
      deviceHash: session.deviceFingerprint.hash
    });

    return session;
  }

  /**
   * Validate session with anomaly detection
   */
  public validateSession(
    sessionId: string,
    currentDeviceInfo: DeviceFingerprint
  ): { isValid: boolean; anomalies: string[] } {
    const session = this.sessions.get(sessionId);
    const anomalies: string[] = [];

    if (!session || !session.isActive) {
      return { isValid: false, anomalies: ['Session not found or inactive'] };
    }

    const now = new Date();

    // Check absolute timeout
    if (now.getTime() - session.createdAt.getTime() >
      this.config.absoluteTimeout) {
      session.isActive = false;
      logger.warn('Session expired (absolute timeout)', { sessionId });
      return {
        isValid: false,
        anomalies: ['Session expired (absolute timeout)']
      };
    }

    // Check idle timeout
    if (
      now.getTime() - session.lastActivity.getTime() > this.config.idleTimeout
    ) {
      session.isActive = false;
      logger.warn('Session expired (idle timeout)', { sessionId });
      return {
        isValid: false,
        anomalies: ['Session expired (idle timeout)']
      };
    }

    // Device fingerprint validation
    if (this.config.enableDeviceFingerprinting) {
      const fingerprintValidation = this.validateDeviceFingerprint(
        session.deviceFingerprint,
        currentDeviceInfo
      );

      if (!fingerprintValidation.isValid) {
        anomalies.push(...fingerprintValidation.anomalies);

        // Log potential session hijacking
        if (fingerprintValidation.anomalies.length > 1) {
          this.recordAnomaly(
            sessionId,
            session.userId,
            'Potential session hijacking'
          );
          session.isActive = false;
          logger.error('Session invalidated due to hijacking attempt', {
            sessionId,
            anomalies: fingerprintValidation.anomalies
          });
          return { isValid: false, anomalies };
        }
      }
    }

    // IP address change detection (warn but allow)
    if (session.ipAddress !== currentDeviceInfo.ipAddress) {
      anomalies.push('IP address changed');
      logger.warn('Session IP address changed', {
        sessionId,
        oldIP: session.ipAddress,
        newIP: currentDeviceInfo.ipAddress
      });
    }

    // Update last activity
    session.lastActivity = now;

    return {
      isValid: anomalies.length === 0,
      anomalies
    };
  }

  /**
   * Validate device fingerprint
   */
  private validateDeviceFingerprint(
    stored: DeviceFingerprint,
    current: DeviceFingerprint
  ): { isValid: boolean; anomalies: string[] } {
    const anomalies: string[] = [];

    // User-Agent check (high priority)
    if (stored.userAgent !== current.userAgent) {
      anomalies.push('User-Agent mismatch');
    }

    // Browser language change (low priority - might be legitimate)
    if (stored.acceptLanguage !== current.acceptLanguage) {
      anomalies.push('Language changed');
    }

    // Timezone change (low priority)
    if (stored.timezone !== current.timezone) {
      anomalies.push('Timezone changed');
    }

    // Screen resolution (low priority - might change with window resize)
    if (
      current.screenResolution &&
      stored.screenResolution !== current.screenResolution
    ) {
      anomalies.push('Screen resolution changed');
    }

    // Multiple anomalies indicate potential hijacking
    return {
      isValid: anomalies.length === 0,
      anomalies
    };
  }

  /**
   * Generate fingerprint hash
   */
  private generateFingerprintHash(deviceInfo: DeviceFingerprint): string {
    const data = `${deviceInfo.userAgent}|${deviceInfo.acceptLanguage}|${deviceInfo.timezone}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Revoke session
   */
  public revokeSession(sessionId: string, reason: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.isActive = false;

    // Remove from user sessions
    const userSessions = this.userSessions.get(session.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
    }

    logger.log('Session revoked', {
      sessionId,
      userId: session.userId,
      reason
    });

    return true;
  }

  /**
   * Revoke all sessions for user
   */
  public revokeAllUserSessions(userId: string, reason: string): number {
    const userSessions = this.userSessions.get(userId);
    if (!userSessions) {
      return 0;
    }

    let revokedCount = 0;
    userSessions.forEach(sessionId => {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.isActive = false;
        revokedCount++;
      }
    });

    userSessions.clear();

    logger.log('All user sessions revoked', {
      userId,
      count: revokedCount,
      reason
    });

    return revokedCount;
  }

  /**
   * Record session anomaly
   */
  private recordAnomaly(
    sessionId: string,
    userId: string,
    anomalyType: string
  ): void {
    this.sessionAnomalies.push({
      sessionId,
      userId,
      anomalyType,
      timestamp: new Date()
    });

    // If multiple anomalies in short time, flag for investigation
    const recentAnomalies = this.sessionAnomalies.filter(
      a => new Date().getTime() - a.timestamp.getTime() < 5 * 60 * 1000
    );

    if (recentAnomalies.length > 3) {
      logger.error('Multiple session anomalies detected', {
        userId,
        anomalyCount: recentAnomalies.length
      });
    }
  }

  /**
   * Get session statistics
   */
  public getSessionStats(): {
    activeSessions: number;
    totalSessions: number;
    recentAnomalies: number;
    userCount: number;
  } {
    const activeSessions = Array.from(this.sessions.values()).filter(
      s => s.isActive
    ).length;
    const recentAnomalies = this.sessionAnomalies.filter(
      a => new Date().getTime() - a.timestamp.getTime() < 60 * 60 * 1000
    ).length;

    return {
      activeSessions,
      totalSessions: this.sessions.size,
      recentAnomalies,
      userCount: this.userSessions.size
    };
  }
}

export const createSessionManager = (
  config: SessionConfig
): EnhancedSessionManager => {
  return new EnhancedSessionManager(config);
};
