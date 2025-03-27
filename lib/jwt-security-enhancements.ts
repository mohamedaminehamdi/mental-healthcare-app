/**
 * JWT Security Enhancements & Token Rotation
 * ==========================================
 * Improvements from security audit findings
 * Days 1-3: JWT refresh mechanisms and token blacklist
 */

import { logger } from './logger';

export interface TokenBlacklist {
  token: string;
  revokedAt: Date;
  reason: string;
  userId: string;
}

export class EnhancedJWTManager {
  private blacklist: Set<string> = new Set();
  private tokenRotationSchedule: Map<string, Date> = new Map();
  private refreshTokens: Map<string, RefreshTokenData> = new Map();

  public interface RefreshTokenData {
    userId: string;
    familyId: string;
    issuedAt: Date;
    expiresAt: Date;
    rotation: number;
  }

  // Token rotation implementation
  public async rotateTokenFamily(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const familyId = `family_${Date.now()}`;
    
    const accessToken = this.generateAccessToken(userId, familyId);
    const refreshToken = this.generateRefreshToken(userId, familyId, 1);

    // Store refresh token family
    this.refreshTokens.set(refreshToken, {
      userId,
      familyId,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      rotation: 1
    });

    logger.log('Token family created', { userId, familyId });
    return { accessToken, refreshToken };
  }

  // Refresh token rotation
  public async rotateRefreshToken(oldRefreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const tokenData = this.refreshTokens.get(oldRefreshToken);
    
    if (!tokenData) {
      throw new Error('Invalid refresh token');
    }

    // Detect token reuse (security issue)
    if (tokenData.rotation > 1) {
      logger.error('Possible token reuse attack detected', {
        userId: tokenData.userId,
        familyId: tokenData.familyId
      });
      // Invalidate entire family
      this.invalidateTokenFamily(tokenData.familyId);
      throw new Error('Security violation: Token family invalidated');
    }

    const newAccessToken = this.generateAccessToken(
      tokenData.userId,
      tokenData.familyId
    );
    const newRefreshToken = this.generateRefreshToken(
      tokenData.userId,
      tokenData.familyId,
      tokenData.rotation + 1
    );

    // Store new token
    this.refreshTokens.set(newRefreshToken, {
      ...tokenData,
      issuedAt: new Date(),
      rotation: tokenData.rotation + 1
    });

    // Blacklist old token
    this.blacklistToken(oldRefreshToken, tokenData.userId, 'Rotation');

    logger.log('Token rotated', {
      userId: tokenData.userId,
      newRotation: tokenData.rotation + 1
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  // Implement token blacklist
  public blacklistToken(token: string, userId: string, reason: string): void {
    this.blacklist.add(token);
    logger.log('Token blacklisted', {
      userId,
      reason,
      tokenCount: this.blacklist.size
    });
  }

  // Check if token is blacklisted
  public isTokenBlacklisted(token: string): boolean {
    return this.blacklist.has(token);
  }

  // Invalidate entire token family (on detected reuse)
  private invalidateTokenFamily(familyId: string): void {
    const tokensToInvalidate = Array.from(this.refreshTokens.entries())
      .filter(([_, data]) => data.familyId === familyId)
      .map(([token, _]) => token);

    tokensToInvalidate.forEach(token => {
      this.blacklistToken(token, '', 'Family invalidation');
    });

    logger.error('Token family invalidated due to security violation', {
      familyId,
      tokenCount: tokensToInvalidate.length
    });
  }

  private generateAccessToken(userId: string, familyId: string): string {
    // Mock implementation
    return `at_${familyId}_${Date.now()}`;
  }

  private generateRefreshToken(
    userId: string,
    familyId: string,
    rotation: number
  ): string {
    // Mock implementation
    return `rt_${familyId}_${rotation}_${Date.now()}`;
  }
}

export const enhancedJWTManager = new EnhancedJWTManager();
