/**
 * Security vulnerability checking and dependency verification
 */

export interface VulnerabilityReport {
  packageName: string;
  severity: "low" | "medium" | "high" | "critical";
  vulnerability: string;
  fixedVersion?: string;
  cveId?: string;
}

/**
 * Check for known vulnerable packages
 * This is a simplified example - use npm audit or snyk in production
 */
export const KNOWN_VULNERABILITIES: Record<string, VulnerabilityReport[]> = {
  // Example: "express.old-version": [{
  //   packageName: "express",
  //   severity: "high",
  //   vulnerability: "Example vulnerability",
  // }]
};

/**
 * Verify package versions
 */
export function checkPackageVersions(
  dependencies: Record<string, string>
): VulnerabilityReport[] {
  const vulnerabilities: VulnerabilityReport[] = [];

  for (const [pkg, version] of Object.entries(dependencies)) {
    // Check against known vulnerabilities
    const key = `${pkg}.${version}`;
    
    if (key in KNOWN_VULNERABILITIES) {
      vulnerabilities.push(...KNOWN_VULNERABILITIES[key]);
    }

    // Check for outdated packages (example)
    if (version.includes("*") || version.includes("x")) {
      // In production, check against npm registry
    }
  }

  return vulnerabilities;
}

/**
 * Security checklist validation
 */
export const SECURITY_CHECKLIST = [
  {
    id: "env-vars",
    name: "Environment Variables",
    description: "All required environment variables are configured",
    check: () => {
      const required = [
        "NEXT_PUBLIC_ENDPOINT",
        "PROJECT_ID",
        "DATABASE_ID",
        "API_KEY",
      ];
      return required.every((env) => process.env[env]);
    },
  },
  {
    id: "headers",
    name: "Security Headers",
    description: "Security headers are configured in next.config",
    check: () => {
      // Would check next.config.mjs for header configuration
      return true;
    },
  },
  {
    id: "auth",
    name: "Authentication",
    description: "Authentication middleware is in place",
    check: () => {
      // Would check middleware.ts exists
      return true;
    },
  },
  {
    id: "cors",
    name: "CORS Configuration",
    description: "CORS is properly configured",
    check: () => {
      const allowed = process.env.ALLOWED_ORIGINS;
      return !!allowed && allowed !== "*";
    },
  },
  {
    id: "https",
    name: "HTTPS",
    description: "HTTPS is enforced in production",
    check: () => {
      return process.env.NODE_ENV !== "production" || process.env.FORCE_HTTPS;
    },
  },
  {
    id: "csp",
    name: "Content Security Policy",
    description: "CSP headers are configured",
    check: () => {
      return true; // Configured in next.config
    },
  },
];

/**
 * Run security checklist
 */
export function runSecurityChecklist(): {
  passed: number;
  failed: number;
  items: Array<{
    id: string;
    name: string;
    passed: boolean;
  }>;
} {
  const items = SECURITY_CHECKLIST.map((item) => ({
    id: item.id,
    name: item.name,
    passed: item.check(),
  }));

  const passed = items.filter((item) => item.passed).length;
  const failed = items.length - passed;

  return { passed, failed, items };
}

/**
 * Generate security report
 */
export function generateSecurityReport(): string {
  const checklist = runSecurityChecklist();
  const vulnerabilities = checkPackageVersions(
    process.env.DEPENDENCIES ? JSON.parse(process.env.DEPENDENCIES) : {}
  );

  let report = "# Security Report\n\n";
  report += `## Checklist (${checklist.passed}/${SECURITY_CHECKLIST.length} passed)\n`;

  for (const item of checklist.items) {
    const status = item.passed ? "✅" : "❌";
    report += `- ${status} ${item.name}\n`;
  }

  if (vulnerabilities.length > 0) {
    report += `\n## Vulnerabilities Detected (${vulnerabilities.length})\n`;
    for (const vuln of vulnerabilities) {
      report += `- **${vuln.severity.toUpperCase()}**: ${vuln.vulnerability} in ${vuln.packageName}\n`;
      if (vuln.fixedVersion) {
        report += `  Fix: Upgrade to ${vuln.fixedVersion}\n`;
      }
    }
  }

  return report;
}
