/**
 * Secret Management & Key Rotation
 * Secure management of API keys, tokens, and sensitive credentials
 */

interface Secret {
  id: string;
  name: string;
  value: string; // encrypted
  type: 'api-key' | 'token' | 'password' | 'connection-string';
  createdAt: Date;
  rotatedAt: Date;
  expiresAt?: Date;
  metadata: Record<string, unknown>;
}

interface KeyRotationPolicy {
  enabled: boolean;
  rotationInterval: number; // days
  graceperiod: number; // days after rotation before old key expires
  maxKeyAge: number; // days - force rotation
}

interface SecretAuditLog {
  secretId: string;
  action: 'created' | 'rotated' | 'accessed' | 'deleted' | 'expired';
  timestamp: Date;
  actor: string; // user/service that performed action
  reason?: string;
}

const DEFAULT_ROTATION_POLICY: KeyRotationPolicy = {
  enabled: true,
  rotationInterval: 90, // 90 days
  graceperiod: 7, // 7 day grace period
  maxKeyAge: 365, // 1 year maximum
};

class SecretManager {
  private static instance: SecretManager;
  private secrets: Map<string, Secret> = new Map();
  private auditLogs: SecretAuditLog[] = [];
  private rotationPolicy: KeyRotationPolicy = DEFAULT_ROTATION_POLICY;
  private encryptionKey?: string;

  private constructor() {}

  static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager();
    }
    return SecretManager.instance;
  }

  /**
   * Initialize secret manager with encryption key
   */
  initialize(encryptionKey: string): void {
    this.encryptionKey = encryptionKey;
  }

  /**
   * Create or store a secret
   */
  createSecret(
    name: string,
    value: string,
    type: Secret['type'],
    metadata: Record<string, unknown> = {},
    expiresAt?: Date
  ): Secret {
    const id = this.generateSecretId();
    const now = new Date();

    const secret: Secret = {
      id,
      name,
      value: this.encryptSecret(value),
      type,
      createdAt: now,
      rotatedAt: now,
      expiresAt,
      metadata,
    };

    this.secrets.set(id, secret);

    // Log creation
    this.logAuditEvent({
      secretId: id,
      action: 'created',
      timestamp: now,
      actor: 'system',
      reason: `Secret "${name}" created`,
    });

    return { ...secret, value: '[REDACTED]' };
  }

  /**
   * Get secret by ID (decrypted)
   */
  getSecret(secretId: string): Secret | undefined {
    const secret = this.secrets.get(secretId);

    if (!secret) {
      return undefined;
    }

    // Check expiration
    if (secret.expiresAt && secret.expiresAt < new Date()) {
      this.logAuditEvent({
        secretId,
        action: 'expired',
        timestamp: new Date(),
        actor: 'system',
      });
      return undefined;
    }

    // Log access
    this.logAuditEvent({
      secretId,
      action: 'accessed',
      timestamp: new Date(),
      actor: 'system',
    });

    // Decrypt and return
    return {
      ...secret,
      value: this.decryptSecret(secret.value),
    };
  }

  /**
   * Get secret by name (decrypted)
   */
  getSecretByName(name: string): Secret | undefined {
    for (const secret of this.secrets.values()) {
      if (secret.name === name) {
        return this.getSecret(secret.id);
      }
    }
    return undefined;
  }

  /**
   * Rotate a secret (generate new value)
   */
  rotateSecret(
    secretId: string,
    newValue: string,
    reason?: string
  ): { oldSecret: Secret; newSecret: Secret } | undefined {
    const oldSecret = this.secrets.get(secretId);

    if (!oldSecret) {
      return undefined;
    }

    const now = new Date();

    // Create new secret with same properties
    const newSecret: Secret = {
      ...oldSecret,
      id: this.generateSecretId(),
      value: this.encryptSecret(newValue),
      rotatedAt: now,
    };

    // Store new secret
    this.secrets.set(newSecret.id, newSecret);

    // Log rotation
    this.logAuditEvent({
      secretId: newSecret.id,
      action: 'rotated',
      timestamp: now,
      actor: 'system',
      reason: reason || 'Scheduled rotation',
    });

    // Deactivate and log old secret
    this.logAuditEvent({
      secretId: oldSecret.id,
      action: 'expired',
      timestamp: now,
      actor: 'system',
      reason: 'Replaced by new secret during rotation',
    });

    return {
      oldSecret,
      newSecret: { ...newSecret, value: '[REDACTED]' },
    };
  }

  /**
   * Delete a secret
   */
  deleteSecret(secretId: string, reason?: string): boolean {
    if (!this.secrets.has(secretId)) {
      return false;
    }

    this.secrets.delete(secretId);

    this.logAuditEvent({
      secretId,
      action: 'deleted',
      timestamp: new Date(),
      actor: 'system',
      reason: reason || 'Manual deletion',
    });

    return true;
  }

  /**
   * Check if secret needs rotation
   */
  needsRotation(secret: Secret): boolean {
    if (!this.rotationPolicy.enabled) {
      return false;
    }

    const daysSinceRotation = this.getDaysSince(secret.rotatedAt);

    // Check mandatory rotation age
    if (daysSinceRotation > this.rotationPolicy.maxKeyAge) {
      return true;
    }

    // Check scheduled rotation
    return daysSinceRotation > this.rotationPolicy.rotationInterval;
  }

  /**
   * Get secrets that need rotation
   */
  getSecretsNeedingRotation(): Secret[] {
    const needsRotation: Secret[] = [];

    for (const secret of this.secrets.values()) {
      if (this.needsRotation(secret)) {
        needsRotation.push({
          ...secret,
          value: '[REDACTED]',
        });
      }
    }

    return needsRotation;
  }

  /**
   * Validate secret against policy
   */
  validateSecretPolicy(secret: Secret): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check expiration
    if (secret.expiresAt && secret.expiresAt < new Date()) {
      issues.push('Secret has expired');
    }

    // Check rotation age
    if (this.needsRotation(secret)) {
      const daysOld = this.getDaysSince(secret.rotatedAt);
      issues.push(
        `Secret is ${daysOld} days old and needs rotation (max age: ${this.rotationPolicy.maxKeyAge} days)`
      );
    }

    // Check value strength (simple check)
    if (!this.isStrongSecret(secret.value)) {
      issues.push('Secret does not meet strength requirements');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Check secret strength
   */
  private isStrongSecret(secret: string): boolean {
    // Minimum length
    if (secret.length < 32) return false;

    // Require mix of character types
    const hasLower = /[a-z]/.test(secret);
    const hasUpper = /[A-Z]/.test(secret);
    const hasNumber = /[0-9]/.test(secret);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secret);

    return hasLower && hasUpper && hasNumber && hasSpecial;
  }

  /**
   * Get audit log for specific secret
   */
  getAuditLog(secretId?: string): SecretAuditLog[] {
    if (secretId) {
      return this.auditLogs.filter((log) => log.secretId === secretId);
    }
    return [...this.auditLogs];
  }

  /**
   * Log audit event
   */
  private logAuditEvent(log: SecretAuditLog): void {
    this.auditLogs.push(log);

    // Cleanup old logs (keep last 1000)
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }
  }

  /**
   * Generate unique secret ID
   */
  private generateSecretId(): string {
    return `secret_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`;
  }

  /**
   * Encrypt secret value
   */
  private encryptSecret(value: string): string {
    if (!this.encryptionKey) {
      console.warn('No encryption key set, storing plaintext (NOT SECURE)');
      return value;
    }

    // Simple XOR encryption (in production, use proper encryption)
    let encrypted = '';
    for (let i = 0; i < value.length; i++) {
      encrypted += String.fromCharCode(
        value.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
      );
    }

    return btoa(encrypted);
  }

  /**
   * Decrypt secret value
   */
  private decryptSecret(encrypted: string): string {
    if (!this.encryptionKey) {
      console.warn('No encryption key set, assuming plaintext');
      return encrypted;
    }

    const value = atob(encrypted);
    let decrypted = '';

    for (let i = 0; i < value.length; i++) {
      decrypted += String.fromCharCode(
        value.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
      );
    }

    return decrypted;
  }

  /**
   * Calculate days since timestamp
   */
  private getDaysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Set rotation policy
   */
  setRotationPolicy(policy: Partial<KeyRotationPolicy>): void {
    this.rotationPolicy = {
      ...this.rotationPolicy,
      ...policy,
    };
  }

  /**
   * Get all secrets (values redacted)
   */
  getAllSecrets(): Secret[] {
    return Array.from(this.secrets.values()).map((secret) => ({
      ...secret,
      value: '[REDACTED]',
    }));
  }

  /**
   * Get secret metadata without exposing value
   */
  getSecretMetadata(secretId: string): {
    id: string;
    name: string;
    type: string;
    createdAt: Date;
    rotatedAt: Date;
    expiresAt?: Date;
    needsRotation: boolean;
  } | undefined {
    const secret = this.secrets.get(secretId);

    if (!secret) {
      return undefined;
    }

    return {
      id: secret.id,
      name: secret.name,
      type: secret.type,
      createdAt: secret.createdAt,
      rotatedAt: secret.rotatedAt,
      expiresAt: secret.expiresAt,
      needsRotation: this.needsRotation(secret),
    };
  }
}

export const secretManager = SecretManager.getInstance();
export type { Secret, KeyRotationPolicy, SecretAuditLog };
