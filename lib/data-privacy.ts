/**
 * Data Handling & Privacy Management
 * Healthcare data protection and privacy compliance
 */

interface PrivacyRequirement {
  id: string;
  name: string;
  description: string;
  jurisdiction: string[]; // GDPR, HIPAA, CCPA, etc.
  implementationSteps: string[];
}

interface DataClassification {
  id: string;
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  examples: string[];
  retentionPeriod: number; // days
  encryptionRequired: boolean;
  accessControl: string;
}

interface DataHandlingPolicy {
  id: string;
  name: string;
  dataType: string;
  classification: DataClassification;
  retention: {
    period: number; // days
    reason: string;
    deleteMethod: string;
  };
  sharing: {
    allowedRecipients: string[];
    requiresConsent: boolean;
    contractRequired: boolean;
  };
  security: {
    encryptionRequired: boolean;
    encryptionMethod: string;
    accessLogging: boolean;
    minimumRoles: string[];
  };
}

interface PrivacyAssessment {
  id: string;
  referenceNumber: string;
  date: Date;
  dataProcessor: string;
  dataTypes: string[];
  risks: PrivacyRisk[];
  mitigations: string[];
  complianceScore: number; // 0-100
  recommendations: string[];
}

interface PrivacyRisk {
  id: string;
  threat: string;
  likelihood: 'low' | 'medium' | 'high' | 'critical';
  impact: 'minimal' | 'minor' | 'major' | 'critical';
  affectedIndividuals: number;
}

interface DataBreachResponse {
  id: string;
  date: Date;
  description: string;
  affectedDataTypes: string[];
  affectedIndividuals: number;
  reportedToAuthority: boolean;
  notifiedIndividuals: boolean;
  mitigation: string;
  timeline: Array<{
    date: Date;
    event: string;
  }>;
}

class DataPrivacyManager {
  private static instance: DataPrivacyManager;
  private policies: Map<string, DataHandlingPolicy> = new Map();
  private assessments: Map<string, PrivacyAssessment> = new Map();
  private breaches: DataBreachResponse[] = [];
  private dataClassifications: Map<string, DataClassification> = new Map();

  private constructor() {
    this.initializeDataClassifications();
    this.initializeDefaultPolicies();
  }

  static getInstance(): DataPrivacyManager {
    if (!DataPrivacyManager.instance) {
      DataPrivacyManager.instance = new DataPrivacyManager();
    }
    return DataPrivacyManager.instance;
  }

  /**
   * Create data handling policy
   */
  createPolicy(
    name: string,
    dataType: string,
    retention: { period: number; reason: string; deleteMethod: string },
    sharing: {
      allowedRecipients: string[];
      requiresConsent: boolean;
      contractRequired: boolean;
    }
  ): DataHandlingPolicy {
    const id = `policy_${Date.now()}`;
    const classification = this.dataClassifications.get(
      dataType
    ) || {
      id: 'default',
      level: 'restricted',
      examples: [dataType],
      retentionPeriod: retention.period,
      encryptionRequired: true,
      accessControl: 'Role-based',
    };

    const policy: DataHandlingPolicy = {
      id,
      name,
      dataType,
      classification,
      retention,
      sharing,
      security: {
        encryptionRequired: classification.encryptionRequired,
        encryptionMethod: 'AES-256',
        accessLogging: true,
        minimumRoles: ['admin', 'data-processor'],
      },
    };

    this.policies.set(id, policy);

    return policy;
  }

  /**
   * Conduct privacy impact assessment
   */
  conductPrivacyAssessment(
    dataProcessor: string,
    dataTypes: string[]
  ): PrivacyAssessment {
    const id = `pia_${Date.now()}`;

    const risks: PrivacyRisk[] = [];

    // Identify risks based on data types
    for (const dataType of dataTypes) {
      if ([
        'medical-records',
        'genetic-info',
        'biometric-data',
      ].includes(dataType)) {
        risks.push({
          id: `risk_${Date.now()}_${Math.random()
            .toString(36)
            .substring(7)}`,
          threat: 'Unauthorized access to sensitive health information',
          likelihood: 'medium',
          impact: 'critical',
          affectedIndividuals: 1000, // estimate
        });
      }

      if (['financial-data', 'payment-info'].includes(dataType)) {
        risks.push({
          id: `risk_${Date.now()}_${Math.random()
            .toString(36)
            .substring(7)}`,
          threat: 'Financial fraud or identity theft',
          likelihood: 'medium',
          impact: 'major',
          affectedIndividuals: 500,
        });
      }
    }

    const mitigations = this.calculateMitigations(risks);
    const complianceScore = this.calculateComplianceScore(risks, mitigations);

    const assessment: PrivacyAssessment = {
      id,
      referenceNumber: `DPIA-${Date.now()}`,
      date: new Date(),
      dataProcessor,
      dataTypes,
      risks,
      mitigations,
      complianceScore,
      recommendations: this.generateRecommendations(risks, mitigations),
    };

    this.assessments.set(id, assessment);

    return assessment;
  }

  /**
   * Report data breach
   */
  reportDataBreach(
    description: string,
    affectedDataTypes: string[],
    affectedIndividuals: number
  ): DataBreachResponse {
    const breach: DataBreachResponse = {
      id: `breach_${Date.now()}`,
      date: new Date(),
      description,
      affectedDataTypes,
      affectedIndividuals,
      reportedToAuthority: false,
      notifiedIndividuals: false,
      mitigation: '',
      timeline: [
        {
          date: new Date(),
          event: 'Breach detected',
        },
      ],
    };

    this.breaches.push(breach);

    // Trigger breach response procedures
    this.initiateBreachResponse(breach);

    return breach;
  }

  /**
   * Initiate breach response procedures
   */
  private initiateBreachResponse(breach: DataBreachResponse): void {
    console.log('🚨 DATA BREACH RESPONSE INITIATED');
    console.log(`Breach ID: ${breach.id}`);
    console.log(`Affected Individuals: ${breach.affectedIndividuals}`);
    console.log(`Data Types: ${breach.affectedDataTypes.join(', ')}`);

    // Step 1: Containment
    console.log('\n1. CONTAINMENT (within 24 hours)');
    console.log('   - Isolate affected systems');
    console.log('   - Stop unauthorized access');
    console.log('   - Preserve evidence');

    breach.timeline.push({
      date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      event: 'Containment complete',
    });

    // Step 2: Investigation
    console.log('\n2. INVESTIGATION (within 72 hours)');
    console.log('   - Determine breach scope');
    console.log('   - Identify affected data');
    console.log('   - Document root cause');

    breach.timeline.push({
      date: new Date(Date.now() + 72 * 60 * 60 * 1000),
      event: 'Investigation report completed',
    });

    // Step 3: Notification
    console.log('\n3. NOTIFICATION (within 30 days for GDPR)');
    console.log('   - Report to authorities');
    console.log('   - Notify affected individuals');
    console.log('   - PR communication');

    breach.timeline.push({
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      event: 'Notifications sent',
    });

    // Step 4: Recovery
    console.log('\n4. RECOVERY & PREVENTION');
    console.log('   - Implement technical fixes');
    console.log('   - Review policies and processes');
    console.log('   - Provide credit monitoring if applicable');

    breach.reportedToAuthority = true;
    breach.notifiedIndividuals = true;
  }

  /**
   * Calculate required mitigations for risks
   */
  private calculateMitigations(risks: PrivacyRisk[]): string[] {
    const mitigations: string[] = [];

    for (const risk of risks) {
      if (risk.impact === 'critical') {
        mitigations.push('Implement end-to-end encryption');
        mitigations.push('Deploy access control system (RBAC)');
        mitigations.push('Enable audit logging for all access');
        mitigations.push('Implement anomaly detection');
      }

      if (risk.likelihood === 'high' || risk.likelihood === 'critical') {
        mitigations.push('Implement intrusion detection');
        mitigations.push('Deploy rate limiting');
        mitigations.push('Enable MFA for sensitive operations');
      }
    }

    mitigations.push('Conduct regular security training');
    mitigations.push('Perform vulnerability assessments');
    mitigations.push('Implement data retention policies');
    mitigations.push('Deploy DLP (Data Loss Prevention) tools');

    return [...new Set(mitigations)]; // Remove duplicates
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(
    risks: PrivacyRisk[],
    mitigations: string[]
  ): number {
    let score = 100;

    // Deduct for critical/high impact risks
    for (const risk of risks) {
      if (risk.impact === 'critical') score -= 30;
      else if (risk.impact === 'major') score -= 15;
      else if (risk.impact === 'minor') score -= 5;
    }

    // Deduct for high likelihood
    for (const risk of risks) {
      if (risk.likelihood === 'critical') score -= 20;
      else if (risk.likelihood === 'high') score -= 10;
    }

    // Add credit for mitigations
    score += mitigations.length * 2;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    risks: PrivacyRisk[],
    mitigations: string[]
  ): string[] {
    const recommendations: string[] = [];

    const criticalRisks = risks.filter((r) => r.impact === 'critical');
    if (criticalRisks.length > 0) {
      recommendations.push(
        `🚨 Address ${criticalRisks.length} critical privacy risks immediately`
      );
    }

    if (mitigations.length < 5) {
      recommendations.push(
        '⚠️  Implement additional privacy controls and technical safeguards'
      );
    }

    recommendations.push(
      '📋 Develop comprehensive Data Protection Impact Assessment (DPIA)'
    );
    recommendations.push(
      '🔐 Implement privacy by design principle in new features'
    );
    recommendations.push(
      '👥 Establish Data Protection Officer role and responsibilities'
    );
    recommendations.push(
      '📊 Define data retention and deletion schedules'
    );
    recommendations.push(
      '✅ Conduct regular privacy compliance audits'
    );

    return recommendations;
  }

  /**
   * Get compliance status for all policies
   */
  getComplianceStatus(): {
    policies: DataHandlingPolicy[];
    compliancePercentage: number;
    criticalGaps: string[];
  } {
    const policies = Array.from(this.policies.values());

    let compliantPolicies = 0;

    for (const policy of policies) {
      if (
        policy.security.encryptionRequired &&
        policy.security.accessLogging &&
        policy.retention.period > 0
      ) {
        compliantPolicies++;
      }
    }

    const compliancePercentage =
      policies.length > 0
        ? Math.round((compliantPolicies / policies.length) * 100)
        : 0;

    const criticalGaps: string[] = [];

    if (policies.filter((p) => !p.security.encryptionRequired).length > 0) {
      criticalGaps.push('Unencrypted sensitive data handling');
    }

    if (policies.filter((p) => !p.security.accessLogging).length > 0) {
      criticalGaps.push('Missing access audit logs');
    }

    if (this.breaches.length > 0) {
      criticalGaps.push(`${this.breaches.length} unresolved data breaches`);
    }

    return {
      policies,
      compliancePercentage,
      criticalGaps,
    };
  }

  /**
   * Get breach history
   */
  getBreachHistory(): DataBreachResponse[] {
    return this.breaches;
  }

  /**
   * Initialize data classifications
   */
  private initializeDataClassifications(): void {
    this.dataClassifications.set('public', {
      id: 'public',
      level: 'public',
      examples: ['Marketing materials', 'Public announcements'],
      retentionPeriod: 0,
      encryptionRequired: false,
      accessControl: 'None required',
    });

    this.dataClassifications.set('internal', {
      id: 'internal',
      level: 'internal',
      examples: ['Internal documentation', 'Release notes'],
      retentionPeriod: 365,
      encryptionRequired: false,
      accessControl: 'Employees only',
    });

    this.dataClassifications.set('confidential', {
      id: 'confidential',
      level: 'confidential',
      examples: [
        'Subscriber data',
        'Business metrics',
        'Technical specifications',
      ],
      retentionPeriod: 1825, // 5 years
      encryptionRequired: true,
      accessControl: 'Management approval',
    });

    this.dataClassifications.set('restricted', {
      id: 'restricted',
      level: 'restricted',
      examples: [
        'Medical records',
        'Genetic information',
        'Payment information',
        'PII',
      ],
      retentionPeriod: 2555, // 7 years
      encryptionRequired: true,
      accessControl: 'Strict role-based access',
    });
  }

  /**
   * Initialize default policies
   */
  private initializeDefaultPolicies(): void {
    // Medical Records Policy
    this.createPolicy(
      'Medical Records Handling',
      'medical-records',
      {
        period: 2555, // 7 years (legal requirement)
        reason: 'Legal and clinical requirement',
        deleteMethod: 'Secure cryptographic deletion',
      },
      {
        allowedRecipients: [
          'Healthcare providers',
          'Patient themselves',
          'Authorized representatives',
        ],
        requiresConsent: true,
        contractRequired: true,
      }
    );

    // Payment Information Policy
    this.createPolicy(
      'Payment Information Handling',
      'payment-info',
      {
        period: 365, // 1 year
        reason: 'PCI DSS compliance',
        deleteMethod: 'Tokenization and deletion',
      },
      {
        allowedRecipients: ['Payment processor', 'Finance team'],
        requiresConsent: false,
        contractRequired: true,
      }
    );

    // User Profile Policy
    this.createPolicy(
      'User Profile Data',
      'user-profile',
      {
        period: 1825, // 5 years max
        reason: 'User retention and analytics',
        deleteMethod: 'Anonymization and deletion',
      },
      {
        allowedRecipients: ['Support team', 'Analytics service'],
        requiresConsent: true,
        contractRequired: false,
      }
    );
  }
}

export const dataPrivacyManager = DataPrivacyManager.getInstance();
export type {
  PrivacyRequirement,
  DataClassification,
  DataHandlingPolicy,
  PrivacyAssessment,
  PrivacyRisk,
  DataBreachResponse,
};
