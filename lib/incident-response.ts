/**
 * Incident Response & Automated Alerting
 * Detects security incidents and triggers automated responses
 */

interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'investigating' | 'confirmed' | 'resolved' | 'false-positive';
  detectionTime: Date;
  confirmationTime?: Date;
  resolutionTime?: Date;
  affectedSystems: string[];
  affectedUsers: string[];
  rootCause?: string;
  timeline: IncidentTimeline[];
  actions: IncidentAction[];
}

interface IncidentTimeline {
  timestamp: Date;
  event: string;
  actor: string; // user/system
  status: string;
}

interface IncidentAction {
  id: string;
  action: string;
  timestamp: Date;
  executedBy: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: string;
}

interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: SecurityMetrics) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actions: string[]; // action IDs to execute
  enabled: boolean;
  notifyChannels: Array<'email' | 'slack' | 'pagerduty' | 'sms'>;
}

interface SecurityMetrics {
  failedAuthAttempts: number;
  rateLimitViolations: number;
  sqlInjectionAttempts: number;
  xssAttempts: number;
  unusualIPCount: number;
  dataAccessAnomalies: number;
  timeWindow: number; // milliseconds
}

interface AutomatedResponse {
  id: string;
  name: string;
  description: string;
  trigger: string; // incident type or alert name
  actions: Array<{
    type: 'block-ip' | 'disable-user' | 'increase-logging' | 'notify' | 'isolate' | 'quarantine';
    params: Record<string, unknown>;
    delayMs?: number; // delay before execution
  }>;
  reversible: boolean; // can be undone
}

class IncidentResponseManager {
  private static instance: IncidentResponseManager;
  private incidents: Map<string, SecurityIncident> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private automatedResponses: Map<string, AutomatedResponse> = new Map();
  private metrics: SecurityMetrics = {
    failedAuthAttempts: 0,
    rateLimitViolations: 0,
    sqlInjectionAttempts: 0,
    xssAttempts: 0,
    unusualIPCount: 0,
    dataAccessAnomalies: 0,
    timeWindow: 300000, // 5 minutes
  };

  private constructor() {
    this.initializeDefaultResponses();
  }

  static getInstance(): IncidentResponseManager {
    if (!IncidentResponseManager.instance) {
      IncidentResponseManager.instance = new IncidentResponseManager();
    }
    return IncidentResponseManager.instance;
  }

  /**
   * Create and register a security incident
   */
  createIncident(
    title: string,
    description: string,
    severity: SecurityIncident['severity'],
    affectedSystems: string[] = [],
    affectedUsers: string[] = []
  ): SecurityIncident {
    const id = this.generateIncidentId();
    const now = new Date();

    const incident: SecurityIncident = {
      id,
      title,
      description,
      severity,
      status: 'detected',
      detectionTime: now,
      affectedSystems,
      affectedUsers,
      timeline: [
        {
          timestamp: now,
          event: 'Incident detected',
          actor: 'system',
          status: 'detected',
        },
      ],
      actions: [],
    };

    this.incidents.set(id, incident);

    // Auto-trigger responses based on severity
    this.triggerAutomatedResponses(incident);

    // Check alert rules
    this.evaluateAlertRules();

    return incident;
  }

  /**
   * Update incident status
   */
  updateIncidectStatus(
    incidentId: string,
    newStatus: SecurityIncident['status'],
    notes: string = ''
  ): boolean {
    const incident = this.incidents.get(incidentId);

    if (!incident) {
      return false;
    }

    incident.status = newStatus;

    if (newStatus === 'confirmed') {
      incident.confirmationTime = new Date();
    } else if (newStatus === 'resolved') {
      incident.resolutionTime = new Date();
    }

    incident.timeline.push({
      timestamp: new Date(),
      event: `Status changed to ${newStatus}`,
      actor: 'incident-response-team',
      status: newStatus,
    });

    if (notes) {
      incident.timeline.push({
        timestamp: new Date(),
        event: `Note: ${notes}`,
        actor: 'analyst',
        status: newStatus,
      });
    }

    return true;
  }

  /**
   * Add action to incident
   */
  addIncidentAction(
    incidentId: string,
    action: string,
    executor: string
  ): IncidentAction | null {
    const incident = this.incidents.get(incidentId);

    if (!incident) {
      return null;
    }

    const incidentAction: IncidentAction = {
      id: `action_${Date.now()}`,
      action,
      timestamp: new Date(),
      executedBy: executor,
      status: 'pending',
    };

    incident.actions.push(incidentAction);

    return incidentAction;
  }

  /**
   * Register alert rule
   */
  registerAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  /**
   * Register automated response
   */
  registerAutomatedResponse(response: AutomatedResponse): void {
    this.automatedResponses.set(response.id, response);
  }

  /**
   * Evaluate all alert rules
   */
  private evaluateAlertRules(): void {
    for (const rule of this.alertRules.values()) {
      if (rule.enabled && rule.condition(this.metrics)) {
        this.triggerAlert(rule);
      }
    }
  }

  /**
   * Trigger alert from rule
   */
  private triggerAlert(rule: AlertRule): void {
    console.log(`🚨 ALERT: ${rule.name} (Severity: ${rule.severity})`);

    // Execute configured actions
    for (const actionId of rule.actions) {
      const response = this.automatedResponses.get(actionId);
      if (response) {
        this.executeResponse(response);
      }
    }

    // Send notifications
    for (const channel of rule.notifyChannels) {
      this.sendNotification(channel, rule);
    }
  }

  /**
   * Trigger automated responses for incident
   */
  private triggerAutomatedResponses(incident: SecurityIncident): void {
    for (const response of this.automatedResponses.values()) {
      // Match by incident type in trigger
      if (response.trigger === incident.title) {
        this.executeResponse(response);
      }
    }
  }

  /**
   * Execute automated response
   */
  private executeResponse(response: AutomatedResponse): void {
    console.log(`⚡ Executing automated response: ${response.name}`);

    for (const action of response.actions) {
      setTimeout(() => {
        this.executeAction(action);
      }, action.delayMs || 0);
    }
  }

  /**
   * Execute individual action
   */
  private executeAction(
    action: AutomatedResponse['actions'][0]
  ): void {
    const { type, params } = action;

    switch (type) {
      case 'block-ip':
        console.log(`🚫 Blocking IP: ${params.ip}`);
        // Call rate limiter to block IP
        break;
      case 'disable-user':
        console.log(`🔒 Disabling user: ${params.userId}`);
        // Disable user account
        break;
      case 'increase-logging':
        console.log(`📝 Increasing logging detail`);
        // Increase log verbosity
        break;
      case 'notify':
        console.log(`📧 Sending notification: ${params.message}`);
        // Send notification
        break;
      case 'isolate':
        console.log(`🛑 Isolating system: ${params.system}`);
        // Isolate affected system
        break;
      case 'quarantine':
        console.log(`⛔ Quarantining resource: ${params.resource}`);
        // Quarantine resource
        break;
    }
  }

  /**
   * Send notification
   */
  private sendNotification(channel: string, rule: AlertRule): void {
    const message = `Security Alert: ${rule.name} - Severity: ${rule.severity.toUpperCase()}`;

    switch (channel) {
      case 'email':
        console.log(`📧 Email: ${message}`);
        break;
      case 'slack':
        console.log(`💬 Slack: ${message}`);
        break;
      case 'pagerduty':
        console.log(`📲 PagerDuty: ${message}`);
        break;
      case 'sms':
        console.log(`📞 SMS: ${message}`);
        break;
    }
  }

  /**
   * Update metrics bucket
   */
  updateMetrics(partial: Partial<SecurityMetrics>): void {
    this.metrics = {
      ...this.metrics,
      ...partial,
    };
  }

  /**
   * Get incident
   */
  getIncident(incidentId: string): SecurityIncident | undefined {
    return this.incidents.get(incidentId);
  }

  /**
   * Get all incidents
   */
  getAllIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values());
  }

  /**
   * Get active incidents
   */
  getActiveIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values()).filter(
      (incident) => incident.status !== 'resolved'
    );
  }

  /**
   * Get incident statistics
   */
  getIncidentStats(): {
    total: number;
    active: number;
    critical: number;
    avgResolutionTime: number;
  } {
    const allIncidents = Array.from(this.incidents.values());
    const activeIncidents = allIncidents.filter(
      (incident) => incident.status !== 'resolved'
    );
    const criticalIncidents = allIncidents.filter(
      (incident) => incident.severity === 'critical'
    );

    const resolvedIncidents = allIncidents.filter(
      (incident) => incident.resolutionTime
    );
    const avgResolutionTime =
      resolvedIncidents.length > 0
        ? resolvedIncidents.reduce((sum, incident) => {
            const duration = incident.resolutionTime!.getTime() -
              incident.detectionTime.getTime();
            return sum + duration;
          }, 0) / resolvedIncidents.length
        : 0;

    return {
      total: allIncidents.length,
      active: activeIncidents.length,
      critical: criticalIncidents.length,
      avgResolutionTime: Math.round(avgResolutionTime / 1000), // seconds
    };
  }

  /**
   * Initialize default responses
   */
  private initializeDefaultResponses(): void {
    const blockUnauthorizedResponse: AutomatedResponse = {
      id: 'resp_block_unauthorized',
      name: 'Block Unauthorized Access Attempts',
      description: 'Automatically block IPs attempting unauthorized access',
      trigger: 'Unauthorized Access',
      actions: [
        {
          type: 'block-ip',
          params: { ip: 'triggering_ip', duration: 3600 },
          delayMs: 0,
        },
        {
          type: 'increase-logging',
          params: { level: 'debug' },
          delayMs: 1000,
        },
        {
          type: 'notify',
          params: { message: 'Unauthorized access attempt blocked' },
          delayMs: 2000,
        },
      ],
      reversible: true,
    };

    this.registerAutomatedResponse(blockUnauthorizedResponse);
  }

  /**
   * Generate incident ID
   */
  private generateIncidentId(): string {
    return `INC_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`;
  }
}

export const incidentManager = IncidentResponseManager.getInstance();
export type {
  SecurityIncident,
  IncidentTimeline,
  IncidentAction,
  AlertRule,
  SecurityMetrics,
  AutomatedResponse,
};
