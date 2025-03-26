/**
 * Security Incident Response Runbook
 * ==================================
 * Operational procedures for security incident management
 * Day 28: Incident Response Runbook
 */

import { logger } from './logger';

export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentType = 
  | 'DATA_BREACH' | 'ACCOUNT_COMPROMISE' | 'DDoS' | 'MALWARE' 
  | 'UNAUTHORIZED_ACCESS' | 'DATA_LOSS' | 'COMPLIANCE_VIOLATION' | 'SYSTEM_COMPROMISE';

export interface IncidentRunbook {
  incidentType: IncidentType;
  severity: IncidentSeverity;
  timeframe: string;
  roles: string[];
  immediateActions: string[];
  investigationSteps: string[];
  communicationTemplate: string;
  regulatoryNotifications: string[];
}

export const INCIDENT_RUNBOOKS: Record<IncidentType, IncidentRunbook> = {
  DATA_BREACH: {
    incidentType: 'DATA_BREACH',
    severity: 'CRITICAL',
    timeframe: 'Detect to 1-hour assessment',
    roles: ['Security Lead', 'Legal', 'Privacy Officer', 'Communications'],
    immediateActions: [
      'Isolate affected systems from network',
      'Preserve forensic evidence',
      'Activate incident response team',
      'Begin damage assessment',
      'Review breach detection logs'
    ],
    investigationSteps: [
      'Identify data types compromised',
      'Determine number of individuals affected',
      'Identify source of breach',
      'Check for ongoing access',
      'Review backup integrity',
      'Document timeline of events'
    ],
    communicationTemplate: `
Subject: Security Incident - Regulatory Notification Required
- We discovered unauthorized access to [DATA_TYPE]
- Affects approximately [NUMBER] individuals
- Accessed on [DATE_TIME]
- We have secured systems and are investigating
    `,
    regulatoryNotifications: [
      'HIPAA: Notify HHS (OCR) if 500+ individuals',
      'GDPR: Notify supervisory authority within 72 hours',
      'CCPA: Notify California AG if 500+ California residents',
      'State AG: Notify if 500+ state residents'
    ]
  },

  ACCOUNT_COMPROMISE: {
    incidentType: 'ACCOUNT_COMPROMISE',
    severity: 'HIGH',
    timeframe: 'Detect to 30-minute response',
    roles: ['Security Team', 'Account Owner', 'Support Lead'],
    immediateActions: [
      'Reset user password immediately',
      'Revoke all active sessions',
      'Enable MFA if not already active',
      'Review account activity for unauthorized changes',
      'Force password reset for all users with admin role'
    ],
    investigationSteps: [
      'Review login history',
      'Check for data access/exports',
      'Audit privilege changes',
      'Verify no backdoor access created',
      'Check password reset history'
    ],
    communicationTemplate: `
Your account has been temporarily locked due to suspicious activity.
- Reset your password immediately
- Enable two-factor authentication
- Review recent activity in account settings
    `,
    regulatoryNotifications: [
      'No notification required if contained within 1 hour',
      'Notify user if personal data accessed'
    ]
  },

  DDoS: {
    incidentType: 'DDoS',
    severity: 'HIGH',
    timeframe: 'Detect to 15-minute mitigation',
    roles: ['Network Security', 'Infrastructure', 'Incident Commander'],
    immediateActions: [
      'Activate DDoS mitigation service',
      'Increase infrastructure capacity',
      'Block obvious attack sources',
      'Monitor attack patterns',
      'Notify CDN/WAF provider'
    ],
    investigationSteps: [
      'Identify attack vectors',
      'Capture attack samples',
      'Monitor for data exfiltration during attack',
      'Track attack origin',
      'Document attack timeline'
    ],
    communicationTemplate: `
We are experiencing higher-than-normal traffic due to a DDoS attack.
- Our team is actively mitigating the impact
- Services should be restored within [TIME]
- No user data has been compromised
    `,
    regulatoryNotifications: []
  },

  UNAUTHORIZED_ACCESS: {
    incidentType: 'UNAUTHORIZED_ACCESS',
    severity: 'CRITICAL',
    timeframe: 'Detect to investigation within 24 hours',
    roles: ['Security Team', 'Database Admin', 'Legal'],
    immediateActions: [
      'Identify access method',
      'Revoke unauthorized credentials',
      'Change all database passwords',
      'Enable security monitoring',
      'Review access logs'
    ],
    investigationSteps: [
      'Determine scope of unauthorized access',
      'Identify data accessed',
      'Check for data exfiltration',
      'Verify attacker identity if possible',
      'Document access patterns'
    ],
    communicationTemplate: `
Security Incident Notification:
- Unauthorized access to patient records was detected
- Approximately [X] records may have been accessed
- We have contained the issue
- We will notify affected individuals
    `,
    regulatoryNotifications: [
      'HIPAA: Breach notification if PHI accessed',
      'GDPR: Breach notification within 72 hours',
      'Send notifications to affected individuals'
    ]
  },

  DATA_LOSS: {
    incidentType: 'DATA_LOSS',
    severity: 'CRITICAL',
    timeframe: 'Immediate',
    roles: ['Database Admin', 'Backup Team', 'Incident Commander'],
    immediateActions: [
      'Stop all write operations',
      'Assess backup availability',
      'Determine recovery point',
      'Begin data restoration',
      'Notify users of potential service interruption'
    ],
    investigationSteps: [
      'Determine cause of data loss',
      'Verify backup integrity',
      'Calculate data loss amount',
      'Review backup retention policies',
      'Implement prevention measures'
    ],
    communicationTemplate: `
We experienced unexpected data loss. 
- Data backup from [TIME] is being restored
- Service will be unavailable for approximately [DURATION]
- [X] hours of recent data may be lost
    `,
    regulatoryNotifications: [
      'HIPAA: Breach notification if unable to verify data integrity',
      'Notify affected individuals of data loss'
    ]
  },

  MALWARE: {
    incidentType: 'MALWARE',
    severity: 'CRITICAL',
    timeframe: 'Immediate quarantine',
    roles: ['Security Team', 'Infrastructure', 'Incident Commander'],
    immediateActions: [
      'Quarantine affected systems immediately',
      'Isolate from network',
      'Scan all systems for indicators of compromise',
      'Begin malware analysis',
      'Preserve evidence for forensics'
    ],
    investigationSteps: [
      'Identify malware type',
      'Determine infection vector',
      'Check for lateral movement',
      'Identify compromised systems',
      'Verify eradication before reboot'
    ],
    communicationTemplate: `
Malware detected and contained:
- A computer was found to have malware
- It has been isolated from the network
- We are investigating the extent of compromise
- Systems are being cleaned and restored
    `,
    regulatoryNotifications: [
      'Notify users of affected systems',
      'HIPAA: Breach notification if patient data accessed'
    ]
  },

  SYSTEM_COMPROMISE: {
    incidentType: 'SYSTEM_COMPROMISE',
    severity: 'CRITICAL',
    timeframe: 'Immediate',
    roles: ['Security Team', 'System Admin', 'Incident Commander'],
    immediateActions: [
      'Take system offline immediately',
      'Preserve forensic evidence',
      'Revoke all credentials',
      'Notify affected parties',
      'Begin comprehensive investigation'
    ],
    investigationSteps: [
      'Determine entry point',
      'Identify persistence mechanisms',
      'Check for data exfiltration',
      'Document all attacker activity',
      'Plan remediation'
    ],
    communicationTemplate: `
Critical Security Incident:
- A system was compromised by an attacker
- We immediately isolated it from the network
- Data integrity is being verified
- We will provide updates as investigation continues
    `,
    regulatoryNotifications: [
      'HIPAA: Breach notification within 60 days',
      'GDPR: Breach notification within 72 hours',
      'Law enforcement: If criminal activity suspected'
    ]
  },

  COMPLIANCE_VIOLATION: {
    incidentType: 'COMPLIANCE_VIOLATION',
    severity: 'HIGH',
    timeframe: 'Assess within 24 hours',
    roles: ['Compliance Officer', 'Security Team', 'Legal'],
    immediateActions: [
      'Document the violation',
      'Assess regulatory impact',
      'Determine if notification required',
      'Begin remediation planning',
      'Notify leadership'
    ],
    investigationSteps: [
      'Root cause analysis',
      'Identify all affected areas',
      'Review logs for pattern',
      'Determine how to prevent recurrence',
      'Document findings'
    ],
    communicationTemplate: `
Compliance Issue Identified:
- A potential compliance violation has been identified
- We are investigating the extent and cause
- Corrective actions are being implemented
    `,
    regulatoryNotifications: [
      'Self-report if required by regulation',
      'Document for audit trail'
    ]
  }
};

export class IncidentResponseRunbook {
  public getRunbook(incidentType: IncidentType): IncidentRunbook {
    return INCIDENT_RUNBOOKS[incidentType];
  }

  public getEscalationPath(): object {
    return {
      level1: {
        timeframe: '0-5 minutes',
        role: 'On-Call Security Engineer',
        actions: 'Acknowledge incident, begin initial triage'
      },
      level2: {
        timeframe: '5-15 minutes',
        role: 'Security Lead + Incident Commander',
        actions: 'Assess severity, activate response team'
      },
      level3: {
        timeframe: '15-60 minutes',
        role: 'CISO + Legal + Privacy Officer',
        actions: 'Make breach/notification decision'
      },
      level4: {
        timeframe: '1+ hours',
        role: 'CEO + Board + Regulators',
        actions: 'Executive notification and regulatory reporting'
      }
    };
  }

  public getCommunicationPlan(): object {
    return {
      internalNotification: {
        timing: 'Within 30 minutes of incident confirmation',
        recipients: ['Executive Team', 'Department Heads'],
        content: 'Incident type, severity, status, actions being taken'
      },
      customerNotification: {
        timing: 'Within 24-72 hours (per regulation)',
        recipients: 'Affected customers',
        content: 'What happened, what data was affected, what we\'re doing'
      },
      regulatoryNotification: {
        timing: 'Per regulatory timeline (60 days HIPAA, 72 hours GDPR)',
        recipients: 'HHS, state AGs, supervisory authorities',
        content: 'Detailed breach information and remediation'
      },
      mediaStatement: {
        timing: 'Only if significant breach (1000+ individuals)',
        recipients: 'Press',
        content: 'Incident summary, commitment to security'
      }
    };
  }

  public generateIncidentReport(
    incidentType: IncidentType,
    affectedIndividuals: number,
    dataTypesAffected: string[]
  ): object {
    const runbook = this.getRunbook(incidentType);

    return {
      incidentSummary: {
        type: incidentType,
        severity: runbook.severity,
        affectedIndividuals,
        dataTypes: dataTypesAffected,
        includesHealthcare: dataTypesAffected.some(type =>
          ['medical_records', 'genetic', 'biometric'].includes(type)
        )
      },
      renderingrequiredNotifications: {
        hipaa: affectedIndividuals > 0,
        gdpr: affectedIndividuals > 0,
        ccpa: affectedIndividuals > 0,
        stateAG: affectedIndividuals > 500
      },
      notificationTimelines: {
        internalNotification: 'Within 30 minutes',
        affectedIndividuals: affectedIndividuals > 0 ? 'Within 60 days (HIPAA) or 72 hours (GDPR)' : 'N/A',
        regulatoryAuthorities: 'Per regulation',
        mediaStatement: affectedIndividuals > 1000 ? 'Required' : 'Optional'
      },
      nextSteps: runbook.immediateActions,
      escalationPath: this.getEscalationPath(),
      reviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };
  }
}

export const incidentRunbook = new IncidentResponseRunbook();

/**
 * Incident Response Runbook Summary
 * =================================
 * ✓ 8 comprehensive runbooks for major incident types
 * ✓ Immediate actions for containment
 * ✓ Investigation procedures
 * ✓ Communication templates
 * ✓ Regulatory notification requirements
 * ✓ Escalation procedures
 * ✓ HIPAA/GDPR/CCPA notification timelines
 */
