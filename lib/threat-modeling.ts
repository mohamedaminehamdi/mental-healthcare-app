/**
 * Threat Modeling & Attack Surface Analysis
 * Identifies potential threats and attack vectors
 */

interface Threat {
  id: string;
  name: string;
  description: string;
  attackVector: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  likelihood: 'rare' | 'unlikely' | 'likely' | 'very-likely';
  impact: 'minimal' | 'minor' | 'major' | 'critical';
  affectedAssets: string[];
  attackers: string[]; // types of attackers
  prerequisites: string[];
  mitigations: string[];
  detectionMethods: string[];
  riskScore: number; // 0-100
}

interface AttackSurface {
  id: string;
  name: string;
  type: 'api' | 'web' | 'mobile' | 'third-party' | 'infrastructure';
  entryPoints: string[];
  dataFlows: DataFlow[];
  trustBoundaries: string[];
  threats: Threat[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface DataFlow {
  id: string;
  source: string;
  destination: string;
  dataType: string;
  protocol: string;
  encrypted: boolean;
  authenticated: boolean;
  threats: string[];
}

interface ThreatModel {
  id: string;
  applicationName: string;
  version: string;
  createdDate: Date;
  lastUpdated: Date;
  scope: string;
  assumptions: string[];
  threats: Threat[];
  attackSurfaces: AttackSurface[];
  dataFlows: DataFlow[];
  securityControls: SecurityControl[];
  riskAssessment: RiskAssessment;
}

interface SecurityControl {
  id: string;
  name: string;
  description: string;
  mitigatesThreats: string[]; // threat IDs
  type: 'preventive' | 'detective' | 'responsive';
  status: 'implemented' | 'planned' | 'in-progress';
  effectiveness: number; // 0-100
}

interface RiskAssessment {
  criticalThreats: number;
  highThreats: number;
  mediumThreats: number;
  lowThreats: number;
  overallRiskScore: number;
  acceptedRisks: string[];
  mitigationPriorities: string[];
}

class ThreatModelingService {
  private static instance: ThreatModelingService;
  private threatModels: Map<string, ThreatModel> = new Map();
  private threatsDatabase: Map<string, Threat> = new Map();

  private constructor() {
    this.initializeThreatDatabase();
  }

  static getInstance(): ThreatModelingService {
    if (!ThreatModelingService.instance) {
      ThreatModelingService.instance = new ThreatModelingService();
    }
    return ThreatModelingService.instance;
  }

  /**
   * Create new threat model
   */
  createThreatModel(
    applicationName: string,
    version: string,
    scope: string,
    assumptions: string[] = []
  ): ThreatModel {
    const id = `threat-model_${Date.now()}`;

    const model: ThreatModel = {
      id,
      applicationName,
      version,
      createdDate: new Date(),
      lastUpdated: new Date(),
      scope,
      assumptions,
      threats: [],
      attackSurfaces: [],
      dataFlows: [],
      securityControls: [],
      riskAssessment: {
        criticalThreats: 0,
        highThreats: 0,
        mediumThreats: 0,
        lowThreats: 0,
        overallRiskScore: 0,
        acceptedRisks: [],
        mitigationPriorities: [],
      },
    };

    this.threatModels.set(id, model);

    return model;
  }

  /**
   * Add attack surface to threat model
   */
  addAttackSurface(
    modelId: string,
    name: string,
    type: AttackSurface['type'],
    entryPoints: string[]
  ): AttackSurface | null {
    const model = this.threatModels.get(modelId);

    if (!model) {
      return null;
    }

    const surface: AttackSurface = {
      id: `surface_${Date.now()}`,
      name,
      type,
      entryPoints,
      dataFlows: [],
      trustBoundaries: [],
      threats: [],
      riskLevel: 'medium',
    };

    model.attackSurfaces.push(surface);

    return surface;
  }

  /**
   * Add data flow to threat model
   */
  addDataFlow(
    modelId: string,
    source: string,
    destination: string,
    dataType: string,
    protocol: string,
    encrypted: boolean = false,
    authenticated: boolean = false
  ): DataFlow | null {
    const model = this.threatModels.get(modelId);

    if (!model) {
      return null;
    }

    const flow: DataFlow = {
      id: `flow_${Date.now()}`,
      source,
      destination,
      dataType,
      protocol,
      encrypted,
      authenticated,
      threats: [],
    };

    model.dataFlows.push(flow);

    return flow;
  }

  /**
   * Add threat to model
   */
  addThreat(
    modelId: string,
    threat: Threat
  ): boolean {
    const model = this.threatModels.get(modelId);

    if (!model) {
      return false;
    }

    model.threats.push(threat);

    // Update risk assessment
    this.updateRiskAssessment(modelId);

    return true;
  }

  /**
   * Add security control
   */
  addSecurityControl(
    modelId: string,
    name: string,
    description: string,
    type: SecurityControl['type'],
    mitigatesThreats: string[]
  ): SecurityControl | null {
    const model = this.threatModels.get(modelId);

    if (!model) {
      return null;
    }

    const control: SecurityControl = {
      id: `control_${Date.now()}`,
      name,
      description,
      type,
      mitigatesThreats,
      status: 'planned',
      effectiveness: 0,
    };

    model.securityControls.push(control);

    return control;
  }

  /**
   * Update risk assessment
   */
  private updateRiskAssessment(modelId: string): void {
    const model = this.threatModels.get(modelId);

    if (!model) {
      return;
    }

    const risks = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const threat of model.threats) {
      // Calculate risk score: (Likelihood + Impact) / 2 * Severity multiplier
      const likelihoodScore = {
        'rare': 1,
        'unlikely': 2,
        'likely': 3,
        'very-likely': 4,
      }[threat.likelihood] || 2;

      const impactScore = {
        'minimal': 1,
        'minor': 2,
        'major': 3,
        'critical': 4,
      }[threat.impact] || 2;

      threat.riskScore = Math.round(
        ((likelihoodScore + impactScore) / 2) * 25
      );

      // Count by severity
      if (threat.severity === 'critical') {
        risks.critical++;
      } else if (threat.severity === 'high') {
        risks.high++;
      } else if (threat.severity === 'medium') {
        risks.medium++;
      } else {
        risks.low++;
      }
    }

    model.riskAssessment = {
      criticalsThreats: risks.critical,
      highThreats: risks.high,
      mediumThreats: risks.medium,
      lowThreats: risks.low,
      overallRiskScore: Math.min(
        100,
        (risks.critical * 30 +
          risks.high * 15 +
          risks.medium * 5 +
          risks.low * 1) /
          (model.threats.length || 1)
      ),
      acceptedRisks: [],
      mitigationPriorities: model.threats
        .filter((t) => t.severity === 'critical' || t.severity === 'high')
        .map((t) => t.id)
        .sort(),
    };

    model.lastUpdated = new Date();
  }

  /**
   * Get threat model
   */
  getThreatModel(modelId: string): ThreatModel | undefined {
    return this.threatModels.get(modelId);
  }

  /**
   * Generate threat report
   */
  generateThreatReport(modelId: string): {
    summary: string;
    threats: Threat[];
    attackSurfaces: AttackSurface[];
    recommendations: string[];
  } | null {
    const model = this.threatModels.get(modelId);

    if (!model) {
      return null;
    }

    const criticalThreats = model.threats.filter(
      (t) => t.severity === 'critical'
    );
    const highThreats = model.threats.filter((t) => t.severity === 'high');

    const recommendations: string[] = [];

    if (criticalThreats.length > 0) {
      recommendations.push(
        `🚨 Address ${criticalThreats.length} critical threats immediately`
      );
    }

    if (highThreats.length > 0) {
      recommendations.push(
        `⚠️  Mitigate ${highThreats.length} high-severity threats in next sprint`
      );
    }

    // Recommend controls
    for (const threat of model.threats) {
      if (!model.securityControls.some((c) =>
        c.mitigatesThreats.includes(threat.id)
      )) {
        recommendations.push(`✅ Implement controls for: ${threat.name}`);
      }
    }

    recommendations.push(
      '🔍 Conduct regular threat modeling reviews (quarterly)'
    );
    recommendations.push(
      '📊 Track threat model metrics and control effectiveness'
    );

    return {
      summary: `Threat Model: ${model.applicationName} v${model.version}`,
      threats: model.threats,
      attackSurfaces: model.attackSurfaces,
      recommendations,
    };
  }

  /**
   * Initialize threat database
   */
  private initializeThreatDatabase(): void {
    const commonThreats: Threat[] = [
      {
        id: 'threat_auth_001',
        name: 'Brute Force Attack',
        description: 'Attacker attempts to guess credentials through repeated attempts',
        attackVector: 'Authentication endpoint',
        severity: 'high',
        likelihood: 'likely',
        impact: 'major',
        affectedAssets: ['User accounts', 'Authentication system'],
        attackers: ['Automated tools', 'Competitors'],
        prerequisites: ['Public login page'],
        mitigations: [
          'Implement rate limiting',
          'Account lockout after N failures',
          'MFA requirement',
          'CAPTCHA challenges',
        ],
        detectionMethods: [
          'Login failure pattern analysis',
          'IP-based request rate monitoring',
        ],
        riskScore: 75,
      },
      {
        id: 'threat_auth_002',
        name: 'Session Hijacking',
        description: 'Attacker intercepts and steals session tokens',
        attackVector: 'Network traffic',
        severity: 'critical',
        likelihood: 'unlikely',
        impact: 'critical',
        affectedAssets: ['Session tokens', 'User data'],
        attackers: ['Network attacker', 'Man-in-the-middle'],
        prerequisites: ['Unencrypted communication'],
        mitigations: [
          'Use HTTPS/TLS with strong ciphers',
          'Implement short session timeouts',
          'Use httpOnly and secure cookie flags',
          'Implement CSRF protection',
        ],
        detectionMethods: [
          'Concurrent session detection',
          'Geographic anomaly detection',
        ],
        riskScore: 85,
      },
      {
        id: 'threat_data_001',
        name: 'Unauthorized Data Access',
        description: 'Attacker gains access to sensitive data',
        attackVector: 'API endpoints',
        severity: 'critical',
        likelihood: 'likely',
        impact: 'critical',
        affectedAssets: ['Database', 'User data', 'Medical records'],
        attackers: ['Insider threat', 'Attacker with access'],
        prerequisites: ['Broken access control', 'No encryption'],
        mitigations: [
          'Implement RBAC',
          'Encrypt data at rest',
          'Row-level security',
          'Audit logging',
        ],
        detectionMethods: [
          'Unusual access pattern detection',
          'Data exfiltration detection',
        ],
        riskScore: 90,
      },
      {
        id: 'threat_inject_001',
        name: 'SQL Injection',
        description: 'Attacker injects malicious SQL commands',
        attackVector: 'User input fields',
        severity: 'critical',
        likelihood: 'likely',
        impact: 'critical',
        affectedAssets: ['Database', 'All data'],
        attackers: ['Automated scanners', 'Skilled attackers'],
        prerequisites: ['Unsanitized user input'],
        mitigations: [
          'Use parameterized queries',
          'Input validation and sanitization',
          'ORM usage',
          'Least privilege database accounts',
        ],
        detectionMethods: [
          'WAF rules',
          'SQL injection pattern detection',
        ],
        riskScore: 95,
      },
    ];

    for (const threat of commonThreats) {
      this.threatsDatabase.set(threat.id, threat);
    }
  }

  /**
   * Get predefined threats
   */
  getPredefinedThreats(): Threat[] {
    return Array.from(this.threatsDatabase.values());
  }

  /**
   * Clone threat from database
   */
  cloneThreat(threatId: string): Threat | null {
    const threat = this.threatsDatabase.get(threatId);

    if (!threat) {
      return null;
    }

    return { ...threat, id: `threat_${Date.now()}` };
  }
}

export const threatModelingService = ThreatModelingService.getInstance();
export type {
  Threat,
  AttackSurface,
  DataFlow,
  ThreatModel,
  SecurityControl,
  RiskAssessment,
};
