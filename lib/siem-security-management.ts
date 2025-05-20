/**
 * Security Event Management & SIEM Integration
 * ===========================================
 * Days 92-96: Security Information and Event Management system
 */

import { logger } from './logger';

export interface SecurityEvent {
  eventId: string;
  eventType: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  source: string;
  sourceIp: string;
  userId?: string;
  description: string;
  metadata: { [key: string]: any };
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved';
}

export interface SecurityIncident {
  incidentId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  createdAt: Date;
  resolvedAt?: Date;
  relatedEvents: string[];
  assignedTo?: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  timeline: Array<{
    timestamp: Date;
    action: string;
    details: string;
  }>;
}

export interface ThreatIntelligence {
  threatId: string;
  threatType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  indicators: string[];
  description: string;
  sources: string[];
  detectedAt: Date;
  mitigationSteps: string[];
}

export interface ComplianceAlert {
  alertId: string;
  framework: 'HIPAA' | 'GDPR' | 'CCPA' | 'SOC2' | 'PCI-DSS';
  controlId: string;
  violationType: string;
  severity: 'warning' | 'critical';
  affectedResources: string[];
  firstDetected: Date;
  dueDate: Date;
  status: 'open' | 'remediated' | 'waived';
}

export class SIEMManager {
  private securityEvents: Map<string, SecurityEvent> = new Map();
  private incidents: Map<string, SecurityIncident> = new Map();
  private threats: Map<string, ThreatIntelligence> = new Map();
  private complianceAlerts: Map<string, ComplianceAlert> = new Map();
  private eventCorrelationRules: Map<string, any> = new Map();
  private dashboardMetrics = {
    eventsProcessed: 0,
    incidentsCreated: 0,
    threatsDetected: 0,
    complianceViolations: 0
  };

  /**
   * Ingest security event
   */
  public ingestSecurityEvent(event: Omit<SecurityEvent, 'eventId' | 'status'>): SecurityEvent {
    const fullEvent: SecurityEvent = {
      ...event,
      eventId: `evt_${Date.now()}`,
      status: 'new'
    };

    this.securityEvents.set(fullEvent.eventId, fullEvent);
    this.dashboardMetrics.eventsProcessed++;

    // Check if event correlates with existing incidents
    this.correlateWithIncidents(fullEvent);

    logger.log('Security event ingested', {
      eventType: event.eventType,
      severity: event.severity,
      source: event.source
    });

    return fullEvent;
  }

  /**
   * Create security incident from correlated events
   */
  public createIncident(
    title: string,
    description: string,
    severity: SecurityIncident['severity'],
    relatedEventIds: string[]
  ): SecurityIncident {
    const incident: SecurityIncident = {
      incidentId: `inc_${Date.now()}`,
      title,
      description,
      severity,
      createdAt: new Date(),
      relatedEvents: relatedEventIds,
      status: 'open',
      timeline: [
        {
          timestamp: new Date(),
          action: 'incident_created',
          details: `Incident created with severity: ${severity}`
        }
      ]
    };

    this.incidents.set(incident.incidentId, incident);
    this.dashboardMetrics.incidentsCreated++;

    logger.warn('Security incident created', {
      incidentId: incident.incidentId,
      severity: incident.severity,
      relatedEvents: relatedEventIds.length
    });

    return incident;
  }

  /**
   * Register threat intelligence
   */
  public registerThreat(
    threatType: string,
    indicators: string[],
    description: string,
    severity: ThreatIntelligence['severity']
  ): ThreatIntelligence {
    const threat: ThreatIntelligence = {
      threatId: `threat_${Date.now()}`,
      threatType,
      severity,
      indicators,
      description,
      sources: ['internal_detection', 'threat_feed', 'user_report'],
      detectedAt: new Date(),
      mitigationSteps: this.generateMitigationSteps(threatType, severity)
    };

    this.threats.set(threat.threatId, threat);
    this.dashboardMetrics.threatsDetected++;

    return threat;
  }

  private generateMitigationSteps(threatType: string, severity: string): string[] {
    const baseSteps = [
      'Isolate affected systems from network',
      'Collect forensic evidence',
      'Notify security team',
      'Begin incident investigation'
    ];

    if (severity === 'critical') {
      baseSteps.push('Activate incident response plan');
      baseSteps.push('Brief leadership and legal teams');
    }

    return baseSteps;
  }

  /**
   * Detect compliance violations
   */
  public detectComplianceViolation(
    framework: ComplianceAlert['framework'],
    controlId: string,
    violationType: string,
    affectedResources: string[]
  ): ComplianceAlert {
    const alert: ComplianceAlert = {
      alertId: `comp_${Date.now()}`,
      framework,
      controlId,
      violationType,
      severity: affectedResources.length > 5 ? 'critical' : 'warning',
      affectedResources,
      firstDetected: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: 'open'
    };

    this.complianceAlerts.set(alert.alertId, alert);
    this.dashboardMetrics.complianceViolations++;

    logger.warn('Compliance violation detected', {
      framework,
      controlId,
      severity: alert.severity
    });

    return alert;
  }

  /**
   * Correlate events to detect patterns
   */
  private correlateWithIncidents(event: SecurityEvent): void {
    let correlatedIncident = null;

    this.incidents.forEach(incident => {
      if (
        incident.status === 'open' &&
        event.severity === 'critical' &&
        incident.severity === 'critical'
      ) {
        correlatedIncident = incident;
      }
    });

    if (correlatedIncident) {
      correlatedIncident.relatedEvents.push(event.eventId);
      correlatedIncident.timeline.push({
        timestamp: new Date(),
        action: 'event_correlated',
        details: `Event ${event.eventType} correlated with incident`
      });
    }
  }

  /**
   * Get all active incidents
   */
  public getActiveIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values()).filter(
      i => i.status === 'open' || i.status === 'investigating'
    );
  }

  /**
   * Get all open compliance alerts
   */
  public getOpenComplianceAlerts(): ComplianceAlert[] {
    return Array.from(this.complianceAlerts.values()).filter(
      a => a.status === 'open'
    );
  }

  /**
   * Resolve incident
   */
  public resolveIncident(
    incidentId: string,
    resolutionDetails: string
  ): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    incident.timeline.push({
      timestamp: new Date(),
      action: 'incident_resolved',
      details: resolutionDetails
    });

    return true;
  }

  /**
   * Generate SIEM dashboard
   */
  public generateDashboard(): {
    metrics: typeof this.dashboardMetrics;
    activeIncidents: number;
    openAlerts: number;
    threatsMonitored: number;
    complianceStatus: string;
  } {
    return {
      metrics: this.dashboardMetrics,
      activeIncidents: this.getActiveIncidents().length,
      openAlerts: this.getOpenComplianceAlerts().length,
      threatsMonitored: this.threats.size,
      complianceStatus: 'monitoring'
    };
  }

  /**
   * Generate security report
   */
  public generateSecurityReport(): string {
    let report = `# Security & Compliance Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += `## Event Summary\n`;
    report += `- Total Events Processed: ${this.dashboardMetrics.eventsProcessed}\n`;
    report += `- Critical Events: ${Array.from(this.securityEvents.values())
      .filter(e => e.severity === 'critical').length}\n\n`;

    report += `## Active Incidents\n`;
    const activeIncidents = this.getActiveIncidents();
    if (activeIncidents.length === 0) {
      report += `No active incidents.\n\n`;
    } else {
      activeIncidents.forEach(incident => {
        report += `- **${incident.title}** [${incident.severity}]\n`;
        report += `  Status: ${incident.status}\n`;
        report += `  Related Events: ${incident.relatedEvents.length}\n\n`;
      });
    }

    report += `## Compliance Status\n`;
    const openAlerts = this.getOpenComplianceAlerts();
    report += `- Open Violations: ${openAlerts.length}\n`;
    const frameworks = new Set(openAlerts.map(a => a.framework));
    frameworks.forEach(framework => {
      const count = openAlerts.filter(a => a.framework === framework).length;
      report += `  - ${framework}: ${count} violations\n`;
    });

    report += `\n## Threat Intelligence\n`;
    report += `- Threats Monitored: ${this.threats.size}\n`;

    return report;
  }
}

export const siemManager = new SIEMManager();
