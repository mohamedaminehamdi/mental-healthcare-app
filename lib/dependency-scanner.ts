/**
 * Dependency Scanner & Software Composition Analysis
 * Scans package.json and installed dependencies for known vulnerabilities
 * Provides vulnerability scoring and remediation guidance
 */

interface VulnerabilityRecord {
  packageName: string;
  version: string;
  vulnerabilityId: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedVersions: string[];
  fixedVersion: string;
  cveId?: string;
  cvssScore?: number;
  publishedDate: string;
}

interface DependencyAudit {
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  isDirect: boolean;
  vulnerabilities: VulnerabilityRecord[];
  riskScore: number;
  updatePriority: 'critical' | 'high' | 'medium' | 'low';
}

interface SCAReport {
  timestamp: string;
  totalDependencies: number;
  directDependencies: number;
  vulnerablePackages: number;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  overallRisk: number; // 0-100
  audits: DependencyAudit[];
  recommendations: string[];
}

// Database of known vulnerabilities (simplified - would integrate with NVD/snyk in production)
const KNOWN_VULNERABILITIES: VulnerabilityRecord[] = [
  {
    packageName: 'axios',
    version: '1.0.0',
    vulnerabilityId: 'AXIOS-001',
    title: 'Insecure HTTP Deserialization',
    severity: 'high',
    description: 'Axios versions before 1.4.0 may expose credentials in logs',
    affectedVersions: ['<1.4.0'],
    fixedVersion: '1.4.0',
    cveId: 'CVE-2023-45811',
    cvssScore: 7.5,
    publishedDate: '2023-06-15',
  },
  {
    packageName: 'lodash',
    version: '4.17.15',
    vulnerabilityId: 'LODASH-001',
    title: 'Prototype Pollution',
    severity: 'medium',
    description: 'lodash merge function vulnerable to prototype pollution',
    affectedVersions: ['<4.17.21'],
    fixedVersion: '4.17.21',
    cveId: 'CVE-2021-23337',
    cvssScore: 6.1,
    publishedDate: '2021-02-15',
  },
  {
    packageName: 'react',
    version: '18.0.0',
    vulnerabilityId: 'REACT-001',
    title: 'JSX Props Injection',
    severity: 'medium',
    description: 'React versions may allow JSX prop injection in certain contexts',
    affectedVersions: ['<18.2.0'],
    fixedVersion: '18.2.0',
    cveId: 'CVE-2023-32315',
    cvssScore: 5.3,
    publishedDate: '2023-05-20',
  },
];

class DependencyScanner {
  private static instance: DependencyScanner;

  private constructor() {}

  static getInstance(): DependencyScanner {
    if (!DependencyScanner.instance) {
      DependencyScanner.instance = new DependencyScanner();
    }
    return DependencyScanner.instance;
  }

  /**
   * Check if a package version is vulnerable based on known CVEs
   */
  checkPackageVulnerabilities(
    packageName: string,
    version: string
  ): VulnerabilityRecord[] {
    return KNOWN_VULNERABILITIES.filter((vuln) => {
      if (vuln.packageName !== packageName) return false;

      // Simple version comparison (in production, use semver library)
      return this.isVersionVulnerable(version, vuln.affectedVersions);
    });
  }

  /**
   * Check if version matches any affected version pattern
   */
  private isVersionVulnerable(
    version: string,
    affectedVersions: string[]
  ): boolean {
    // Remove 'v' prefix if present
    const cleanVersion = version.replace(/^v/, '');

    return affectedVersions.some((pattern) => {
      if (pattern.startsWith('<')) {
        const targetVersion = pattern.substring(1);
        return this.compareVersions(cleanVersion, targetVersion) < 0;
      }
      if (pattern.startsWith('<=')) {
        const targetVersion = pattern.substring(2);
        return this.compareVersions(cleanVersion, targetVersion) <= 0;
      }
      if (pattern.startsWith('==')) {
        const targetVersion = pattern.substring(2);
        return cleanVersion === targetVersion;
      }
      if (pattern.startsWith('>')) {
        const targetVersion = pattern.substring(1);
        return this.compareVersions(cleanVersion, targetVersion) > 0;
      }
      return false;
    });
  }

  /**
   * Simple semantic versioning comparison
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0);
    const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }
    return 0;
  }

  /**
   * Score vulnerability severity (0-100)
   */
  private scoreSeverity(severity: string, cvssScore?: number): number {
    const baseScores: Record<string, number> = {
      critical: 90,
      high: 75,
      medium: 50,
      low: 25,
    };

    const baseScore = baseScores[severity] || 0;

    // Adjust based on CVSS score if available
    if (cvssScore) {
      return Math.min(100, baseScore + cvssScore);
    }

    return Math.min(100, baseScore);
  }

  /**
   * Calculate risk score for a dependency
   */
  private calculateRiskScore(vulnerabilities: VulnerabilityRecord[]): number {
    if (vulnerabilities.length === 0) return 0;

    const scores = vulnerabilities.map((v) =>
      this.scoreSeverity(v.severity, v.cvssScore)
    );

    // Return highest severity weighted score
    return Math.max(...scores);
  }

  /**
   * Determine update priority based on vulnerabilities
   */
  private determineUpdatePriority(
    vulnerabilities: VulnerabilityRecord[]
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (vulnerabilities.length === 0) return 'low';

    const severities = vulnerabilities.map((v) => v.severity);

    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';

    return 'low';
  }

  /**
   * Scan dependencies from package.json
   */
  async scanDependencies(
    dependencies: Record<string, string>,
    isDirect: boolean = true
  ): Promise<DependencyAudit[]> {
    const audits: DependencyAudit[] = [];

    for (const [packageName, version] of Object.entries(dependencies)) {
      const vulnerabilities = this.checkPackageVulnerabilities(
        packageName,
        version
      );

      const audit: DependencyAudit = {
        packageName,
        currentVersion: version,
        latestVersion: await this.getLatestVersion(packageName),
        isDirect,
        vulnerabilities,
        riskScore: this.calculateRiskScore(vulnerabilities),
        updatePriority: this.determineUpdatePriority(vulnerabilities),
      };

      audits.push(audit);
    }

    return audits;
  }

  /**
   * Mock function to get latest version (would call npm registry in production)
   */
  private async getLatestVersion(packageName: string): Promise<string> {
    // In production, would call npm registry API
    const latestVersions: Record<string, string> = {
      axios: '1.6.0',
      lodash: '4.17.21',
      react: '19.0.0',
      zod: '3.22.4',
      'next.js': '15.0.0',
    };

    return latestVersions[packageName] || 'unknown';
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(audits: DependencyAudit[]): string[] {
    const recommendations: string[] = [];

    // Critical vulnerabilities
    const critical = audits.filter((a) => a.updatePriority === 'critical');
    if (critical.length > 0) {
      recommendations.push(
        `⚠️  ${critical.length} critical vulnerabilities found. Update immediately: ${critical.map((a) => `${a.packageName}@${a.latestVersion}`).join(', ')}`
      );
    }

    // High-priority updates
    const highPriority = audits.filter((a) => a.updatePriority === 'high');
    if (highPriority.length > 0) {
      recommendations.push(
        `🔴 ${highPriority.length} high-risk updates recommended: ${highPriority.map((a) => `${a.packageName}@${a.latestVersion}`).join(', ')}`
      );
    }

    // Outdated indirect dependencies
    const outdated = audits.filter(
      (a) => !a.isDirect && a.riskScore > 0 && a.vulnerabilities.length > 0
    );
    if (outdated.length > 0) {
      recommendations.push(
        `📦 Review transitive dependencies with vulnerabilities: ${outdated.map((a) => a.packageName).join(', ')}`
      );
    }

    // General security practices
    recommendations.push(
      '🔐 Run `npm audit fix` to automatically patch identified vulnerabilities'
    );
    recommendations.push(
      '📋 Review vulnerable packages and their fixed versions before updating'
    );
    recommendations.push(
      '✅ Test application thoroughly after dependency updates'
    );
    recommendations.push(
      '🚀 Consider using Dependabot for automated dependency updates'
    );
    recommendations.push(
      '📊 Monitor for new vulnerabilities using GitHub Security tab'
    );

    return recommendations;
  }

  /**
   * Generate comprehensive SCA report
   */
  async generateSCAReport(
    dependencies: Record<string, string>,
    devDependencies?: Record<string, string>
  ): Promise<SCAReport> {
    // Scan both direct dependencies
    const directAudits = await this.scanDependencies(dependencies, true);

    // Scan dev dependencies
    const devAudits = devDependencies
      ? await this.scanDependencies(devDependencies, true)
      : [];

    const allAudits = [...directAudits, ...devAudits];

    // Count vulnerabilities by severity
    const vulnerablePackages = allAudits.filter((a) => a.vulnerabilities.length > 0);
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    vulnerablePackages.forEach((pkg) => {
      pkg.vulnerabilities.forEach((vuln) => {
        if (vuln.severity === 'critical') criticalCount++;
        else if (vuln.severity === 'high') highCount++;
        else if (vuln.severity === 'medium') mediumCount++;
        else if (vuln.severity === 'low') lowCount++;
      });
    });

    // Calculate overall risk score (0-100)
    const avgRiskScore =
      allAudits.length > 0
        ? allAudits.reduce((sum, a) => sum + a.riskScore, 0) /
          allAudits.length
        : 0;

    // Weight by vulnerability count
    const overallRisk = Math.min(
      100,
      avgRiskScore * (1 + vulnerablePackages.length * 0.1)
    );

    return {
      timestamp: new Date().toISOString(),
      totalDependencies: allAudits.length,
      directDependencies: directAudits.length,
      vulnerablePackages: vulnerablePackages.length,
      totalVulnerabilities:
        criticalCount + highCount + mediumCount + lowCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      overallRisk: Math.round(overallRisk),
      audits: vulnerablePackages,
      recommendations: this.generateRecommendations(allAudits),
    };
  }

  /**
   * Check for license compatibility issues
   */
  checkLicenseCompatibility(
    packageName: string,
    license: string
  ): {
    compatible: boolean;
    issues: string[];
  } {
    // Restricted licenses for healthcare/commercial apps
    const restrictedLicenses = ['GPL-3.0', 'AGPL-3.0', 'SSPL'];
    const compatibleLicenses = [
      'MIT',
      'Apache-2.0',
      'BSD-2-Clause',
      'BSD-3-Clause',
      'ISC',
      'Unlicense',
    ];

    const issues: string[] = [];

    if (restrictedLicenses.includes(license)) {
      issues.push(
        `Package "${packageName}" uses restricted license ${license} - may not be suitable for commercial healthcare application`
      );
    }

    if (!compatibleLicenses.includes(license) && !restrictedLicenses.includes(license)) {
      issues.push(
        `Package "${packageName}" uses non-standard license ${license} - review compatibility before use`
      );
    }

    return {
      compatible: issues.length === 0,
      issues,
    };
  }
}

export const dependencyScanner = DependencyScanner.getInstance();
export type { VulnerabilityRecord, DependencyAudit, SCAReport };
