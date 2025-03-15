/**
 * Penetration Testing & Security Assessment Guide
 * Framework for conducting authorized security testing
 */

interface PenetrationTest {
  id: string;
  name: string;
  description: string;
  targetSystem: string;
  scope: string; // what's in scope
  outOfScope: string[]; // what's NOT in scope
  startDate: Date;
  endDate?: Date;
  severity: 'informational' | 'low' | 'medium' | 'high' | 'critical';
  status: 'planned' | 'in-progress' | 'completed' | 'remediation' | 'verified';
  findings: Finding[];
  authorized: boolean;
  approvedBy: string;
}

interface Finding {
  id: string;
  title: string;
  description: string;
  severity: 'informational' | 'low' | 'medium' | 'high' | 'critical';
  cweId?: string;
  cvvId?: string;
  affectedComponent: string;
  vulnerability: string;
  exploitationDifficulty: 'low' | 'medium' | 'high';
  businessImpact: string;
  proofOfConcept?: string; // code or steps to reproduce
  remediation: string;
  remediationPriority: 'low' | 'medium' | 'high' | 'critical';
  remediationDate?: Date;
  verificationStatus: 'unverified' | 'verified' | 'resolved' | 'false-positive';
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: TestStep[];
  expectedResults: string;
  severity: string;
}

interface TestStep {
  order: number;
  action: string;
  expectedResult?: string;
}

interface TestReport {
  testId: string;
  timestamp: Date;
  testerName: string;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  findings: Finding[];
  overallRisk: number; // 0-100
  recommendations: string[];
  resolutionDeadlines: Map<string, Date>;
}

class PenetrationTestingGuide {
  private static instance: PenetrationTestingGuide;
  private tests: Map<string, PenetrationTest> = new Map();
  private testCases: Map<string, TestCase> = new Map();
  private reports: TestReport[] = [];

  private constructor() {
    this.initializeStandardTestCases();
  }

  static getInstance(): PenetrationTestingGuide {
    if (!PenetrationTestingGuide.instance) {
      PenetrationTestingGuide.instance = new PenetrationTestingGuide();
    }
    return PenetrationTestingGuide.instance;
  }

  /**
   * Create new penetration testing engagement
   */
  createTest(
    name: string,
    description: string,
    targetSystem: string,
    scope: string,
    outOfScope: string[],
    approver: string
  ): PenetrationTest {
    const id = this.generateTestId();

    const test: PenetrationTest = {
      id,
      name,
      description,
      targetSystem,
      scope,
      outOfScope,
      startDate: new Date(),
      severity: 'medium',
      status: 'planned',
      findings: [],
      authorized: true,
      approvedBy: approver,
    };

    this.tests.set(id, test);

    return test;
  }

  /**
   * Add finding to penetration test
   */
  addFinding(
    testId: string,
    title: string,
    description: string,
    severity: Finding['severity'],
    affectedComponent: string,
    vulnerability: string,
    remediation: string
  ): Finding | null {
    const test = this.tests.get(testId);

    if (!test) {
      return null;
    }

    const finding: Finding = {
      id: `FINDING_${Date.now()}`,
      title,
      description,
      severity,
      affectedComponent,
      vulnerability,
      exploitationDifficulty: 'medium',
      businessImpact: `Affects ${affectedComponent} functionality and user trust`,
      remediation,
      remediationPriority: severity === 'critical' ? 'critical' : 'high',
      verificationStatus: 'unverified',
    };

    test.findings.push(finding);

    return finding;
  }

  /**
   * Update finding remediation status
   */
  updateFindingStatus(
    testId: string,
    findingId: string,
    status: Finding['verificationStatus'],
    remediationDate?: Date
  ): boolean {
    const test = this.tests.get(testId);

    if (!test) {
      return false;
    }

    const finding = test.findings.find((f) => f.id === findingId);

    if (!finding) {
      return false;
    }

    finding.verificationStatus = status;
    if (remediationDate) {
      finding.remediationDate = remediationDate;
    }

    return true;
  }

  /**
   * Generate security testing checklist
   */
  getTestingChecklistForCategory(category: string): TestCase[] {
    const checklist: TestCase[] = [];

    for (const testCase of this.testCases.values()) {
      if (testCase.category === category) {
        checklist.push(testCase);
      }
    }

    return checklist;
  }

  /**
   * Test case: Authentication bypass
   */
  private getAuthenticationBypassTests(): TestCase[] {
    return [
      {
        id: 'TEST_AUTH_001',
        name: 'Default Credentials Test',
        description: 'Attempt to access application with default username/password',
        category: 'Authentication',
        steps: [
          {
            order: 1,
            action: 'Navigate to login page',
            expectedResult: 'Login form loads successfully',
          },
          {
            order: 2,
            action: 'Try common default credentials (admin/admin, admin/password, etc.)',
            expectedResult: 'Authentication fails',
          },
          {
            order: 3,
            action: 'Check if application locks users after failed attempts',
            expectedResult: 'Account is locked or exponential backoff applied',
          },
        ],
        expectedResults: 'Default credentials are not accepted',
        severity: 'critical',
      },
      {
        id: 'TEST_AUTH_002',
        name: 'Brute Force Protection Test',
        description: 'Attempt to bypass authentication with brute force attack',
        category: 'Authentication',
        steps: [
          {
            order: 1,
            action: 'Send multiple failed authentication requests rapidly',
          },
          {
            order: 2,
            action: 'Monitor for rate limiting, account lockout, or CAPTCHA',
          },
        ],
        expectedResults: 'Brute force attack is prevented after N failed attempts',
        severity: 'high',
      },
      {
        id: 'TEST_AUTH_003',
        name: 'Session Fixation Test',
        description: 'Attempt to hijack user session',
        category: 'Authentication',
        steps: [
          {
            order: 1,
            action: 'Capture session token before authentication',
          },
          {
            order: 2,
            action: 'Authenticate with legitimate user',
          },
          {
            order: 3,
            action: 'Check if session token changed after authentication',
          },
        ],
        expectedResults: 'Session ID must be regenerated after successful login',
        severity: 'high',
      },
    ];
  }

  /**
   * Test case: Authorization bypass
   */
  private getAuthorizationBypassTests(): TestCase[] {
    return [
      {
        id: 'TEST_AUTHZ_001',
        name: 'Horizontal Privilege Escalation',
        description: 'Attempt to access resources of other users at same privilege level',
        category: 'Authorization',
        steps: [
          {
            order: 1,
            action: 'Authenticate as user A',
          },
          {
            order: 2,
            action: 'Attempt to access user B\'s data using user B\'s ID in URL/API',
          },
          {
            order: 3,
            action: 'Verify that access is denied',
          },
        ],
        expectedResults: 'Users cannot access other users\' data',
        severity: 'critical',
      },
      {
        id: 'TEST_AUTHZ_002',
        name: 'Vertical Privilege Escalation',
        description: 'Attempt to escalate privileges from user to admin',
        category: 'Authorization',
        steps: [
          {
            order: 1,
            action: 'Authenticate as regular user',
          },
          {
            order: 2,
            action: 'Attempt to access admin endpoints or modify user role parameter',
          },
          {
            order: 3,
            action: 'Verify that privilege escalation is prevented',
          },
        ],
        expectedResults: 'Regular users cannot escalate to admin privileges',
        severity: 'critical',
      },
    ];
  }

  /**
   * Test case: Injection attacks
   */
  private getInjectionTests(): TestCase[] {
    return [
      {
        id: 'TEST_INJ_001',
        name: 'SQL Injection Test',
        description: 'Attempt to inject SQL commands',
        category: 'Injection',
        steps: [
          {
            order: 1,
            action: 'Identify input fields that interact with database',
          },
          {
            order: 2,
            action: "Try SQL injection payloads: ' OR 1=1 --, admin' --",
          },
          {
            order: 3,
            action: 'Monitor for unexpected behavior or data exposure',
          },
        ],
        expectedResults: 'SQL injection attempts are blocked',
        severity: 'critical',
      },
      {
        id: 'TEST_INJ_002',
        name: 'NoSQL Injection Test',
        description: 'Attempt to inject NoSQL operators',
        category: 'Injection',
        steps: [
          {
            order: 1,
            action: 'Identify NoSQL database usage',
          },
          {
            order: 2,
            action: 'Try NoSQL payloads: {"$ne": null}, {"$gt": ""}',
          },
        ],
        expectedResults: 'NoSQL injection is prevented with input validation',
        severity: 'critical',
      },
      {
        id: 'TEST_INJ_003',
        name: 'Command Injection Test',
        description: 'Attempt to inject OS commands',
        category: 'Injection',
        steps: [
          {
            order: 1,
            action: 'Identify OS command inputs or file path parameters',
          },
          {
            order: 2,
            action: 'Try payloads: ; ls, | cat /etc/passwd, && whoami',
          },
        ],
        expectedResults: 'OS command injection is prevented',
        severity: 'critical',
      },
    ];
  }

  /**
   * Test case: XSS attacks
   */
  private getXSSTests(): TestCase[] {
    return [
      {
        id: 'TEST_XSS_001',
        name: 'Stored XSS Test',
        description: 'Inject malicious script that persists in database',
        category: 'XSS',
        steps: [
          {
            order: 1,
            action: 'Find user input fields (comments, profile, messages)',
          },
          {
            order: 2,
            action: 'Inject: <script>alert("XSS")</script>',
          },
          {
            order: 3,
            action: 'Reload page and check if script executes',
          },
        ],
        expectedResults: 'Stored XSS is prevented, script is escaped',
        severity: 'high',
      },
      {
        id: 'TEST_XSS_002',
        name: 'Reflected XSS Test',
        description: 'Inject malicious script in URL or request parameter',
        category: 'XSS',
        steps: [
          {
            order: 1,
            action: 'Craft URL with XSS payload: ?search=<img src=x onerror=alert(1)>',
          },
          {
            order: 2,
            action: 'Share URL with victim',
          },
          {
            order: 3,
            action: 'Check if script executes in victim\'s browser',
          },
        ],
        expectedResults: 'Reflected XSS is prevented with output encoding',
        severity: 'high',
      },
    ];
  }

  /**
   * Test case: API security
   */
  private getAPISecurityTests(): TestCase[] {
    return [
      {
        id: 'TEST_API_001',
        name: 'API Authentication Test',
        description: 'Verify API requires proper authentication',
        category: 'API Security',
        steps: [
          {
            order: 1,
            action: 'Call API endpoint without authentication token',
          },
          {
            order: 2,
            action: 'Verify 401 Unauthorized response',
          },
        ],
        expectedResults: 'API rejects requests without valid authentication',
        severity: 'critical',
      },
      {
        id: 'TEST_API_002',
        name: 'API Rate Limiting Test',
        description: 'Verify API rate limiting is enforced',
        category: 'API Security',
        steps: [
          {
            order: 1,
            action: 'Send rapid API requests (100+ in 1 minute)',
          },
          {
            order: 2,
            action: 'Monitor for 429 TOO MANY REQUESTS response',
          },
        ],
        expectedResults: 'API enforces rate limiting',
        severity: 'high',
      },
    ];
  }

  /**
   * Generate test report
   */
  generateTestReport(
    testId: string,
    testerName: string
  ): TestReport | null {
    const test = this.tests.get(testId);

    if (!test) {
      return null;
    }

    const severity_counts = {
      critical: test.findings.filter((f) => f.severity === 'critical').length,
      high: test.findings.filter((f) => f.severity === 'high').length,
      medium: test.findings.filter((f) => f.severity === 'medium').length,
      low: test.findings.filter((f) => f.severity === 'low').length,
    };

    const overallRisk = Math.min(
      100,
      severity_counts.critical * 30 +
        severity_counts.high * 15 +
        severity_counts.medium * 5 +
        severity_counts.low * 1
    );

    const resolutionDeadlines = new Map<string, Date>();
    const today = new Date();

    for (const finding of test.findings) {
      let daysToResolve = 90;
      if (finding.remediationPriority === 'critical') daysToResolve = 7;
      else if (finding.remediationPriority === 'high') daysToResolve = 30;

      const deadline = new Date(today.getTime() + daysToResolve * 24 * 60 * 60 * 1000);
      resolutionDeadlines.set(finding.id, deadline);
    }

    const report: TestReport = {
      testId,
      timestamp: new Date(),
      testerName,
      totalFindings: test.findings.length,
      criticalFindings: severity_counts.critical,
      highFindings: severity_counts.high,
      mediumFindings: severity_counts.medium,
      lowFindings: severity_counts.low,
      findings: test.findings,
      overallRisk: Math.round(overallRisk),
      recommendations: this.generateRecommendations(test.findings),
      resolutionDeadlines,
    };

    this.reports.push(report);

    return report;
  }

  /**
   * Generate recommendations from findings
   */
  private generateRecommendations(findings: Finding[]): string[] {
    const recommendations: string[] = [];

    if (findings.some((f) => f.vulnerability.includes('authentication'))) {
      recommendations.push(
        '🔐 Implement robust authentication mechanisms (OAuth 2.0, JWT, MFA)'
      );
    }

    if (findings.some((f) => f.vulnerability.includes('injection'))) {
      recommendations.push(
        '🛡️ Use parameterized queries and input validation libraries'
      );
    }

    if (findings.some((f) => f.vulnerability.includes('XSS'))) {
      recommendations.push(
        '✅ Implement output encoding and Content Security Policy'
      );
    }

    if (findings.some((f) => f.vulnerability.includes('CORS'))) {
      recommendations.push(
        '🌐 Configure restrictive CORS policies with origin whitelisting'
      );
    }

    recommendations.push('📋 Conduct regular security training for development team');
    recommendations.push('🚀 Implement security testing in CI/CD pipeline');
    recommendations.push('📊 Establish metrics for security improvements');

    return recommendations;
  }

  /**
   * Get all test cases
   */
  getAllTestCases(): TestCase[] {
    return Array.from(this.testCases.values());
  }

  /**
   * Initialize standard test cases
   */
  private initializeStandardTestCases(): void {
    const allTests = [
      ...this.getAuthenticationBypassTests(),
      ...this.getAuthorizationBypassTests(),
      ...this.getInjectionTests(),
      ...this.getXSSTests(),
      ...this.getAPISecurityTests(),
    ];

    for (const testCase of allTests) {
      this.testCases.set(testCase.id, testCase);
    }
  }

  /**
   * Get test by ID
   */
  getTest(testId: string): PenetrationTest | undefined {
    return this.tests.get(testId);
  }

  /**
   * Get all tests
   */
  getAllTests(): PenetrationTest[] {
    return Array.from(this.tests.values());
  }

  /**
   * Get test reports
   */
  getTestReports(): TestReport[] {
    return this.reports;
  }

  /**
   * Generate test ID
   */
  private generateTestId(): string {
    return `PENTEST_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`;
  }
}

export const pentestGuide = PenetrationTestingGuide.getInstance();
export type {
  PenetrationTest,
  Finding,
  TestCase,
  TestStep,
  TestReport,
};
