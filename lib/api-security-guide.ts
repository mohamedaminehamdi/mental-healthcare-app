/**
 * API Security Best Practices Guide
 * Recommendations and patterns for secure API design
 */

interface APISecurityBestPractice {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  implementation: string[];
  codeExample?: string;
  reference?: string; // OWASP, CWE, RFC reference
}

interface APISecurityGuideline {
  id: string;
  topic: string;
  guidelines: APISecurityBestPractice[];
  checklist: string[];
  commonMistakes: string[];
  bestPractices: string[];
}

class APISecurityGuide {
  private static instance: APISecurityGuide;
  private guidelines: Map<string, APISecurityGuideline> = new Map();

  private constructor() {
    this.initializeGuidelines();
  }

  static getInstance(): APISecurityGuide {
    if (!APISecurityGuide.instance) {
      APISecurityGuide.instance = new APISecurityGuide();
    }
    return APISecurityGuide.instance;
  }

  /**
   * Get guideline by topic
   */
  getGuideline(topic: string): APISecurityGuideline | undefined {
    return this.guidelines.get(topic);
  }

  /**
   * Get all guidelines
   */
  getAllGuidelines(): APISecurityGuideline[] {
    return Array.from(this.guidelines.values());
  }

  /**
   * Initialize security guidelines
   */
  private initializeGuidelines(): void {
    // Authentication Guidelines
    const authGuideline: APISecurityGuideline = {
      id: 'auth-guid-001',
      topic: 'API Authentication',
      guidelines: [
        {
          id: 'auth-001',
          category: 'Authentication',
          title: 'Use OAuth 2.0 or OpenID Connect',
          description:
            'Implement industry-standard authentication protocols',
          severity: 'critical',
          implementation: [
            'Implement OAuth 2.0 with authorization code flow',
            'Use OpenID Connect for user identity',
            'Support PKCE for mobile and SPA applications',
          ],
          reference: 'RFC 6749, RFC 7636',
        },
        {
          id: 'auth-002',
          category: 'Authentication',
          title: 'Implement JWT Properly',
          description: 'Use JWT tokens with proper signing and validation',
          severity: 'high',
          implementation: [
            'Sign JWTs with RS256 (RSA) not HS256 (HMAC)',
            'Include aud (audience) claim for token scope',
            'Set appropriate exp (expiration) times',
            'Validate all required claims on every request',
          ],
          codeExample:
            'const token = jwt.sign({sub, aud, exp}, privateKey, {algorithm: "RS256"})',
          reference: 'RFC 7519, RFC 7518',
        },
        {
          id: 'auth-003',
          category: 'Authentication',
          title: 'Implement Multi-Factor Authentication',
          description: 'Require MFA for sensitive operations',
          severity: 'high',
          implementation: [
            'Support TOTP (Time-based One-Time Password)',
            'Offer backup codes for recovery',
            'Implement adaptive MFA triggered by anomalies',
          ],
        },
      ],
      checklist: [
        '☑️ Use RFC 6749 OAuth 2.0 with PKCE',
        '☑️ Sign JWTs with asymmetric algorithms (RS256)',
        '☑️ Validate JWT claims on each request',
        '☑️ Set reasonable token expiration (15m access, 7d refresh)',
        '☑️ Require HTTPS for token transmission',
        '☑️ Implement token rotation',
      ],
      commonMistakes: [
        '❌ Using HS256 to sign JWTs (server can\'t verify)',
        '❌ Allowing indefinite token validity',
        '❌ Transmitting tokens in URLs or query parameters',
        '❌ Not validating token expiration',
      ],
      bestPractices: [
        '✅ Use security frameworkslike Passport.js, Auth0',
        '✅ Implement token refresh flows',
        '✅ Log all authentication failures',
        '✅ Monitor for brute force attacks',
      ],
    };

    this.guidelines.set('auth', authGuideline);

    // Authorization Guidelines
    const authzGuideline: APISecurityGuideline = {
      id: 'authz-guid-001',
      topic: 'API Authorization',
      guidelines: [
        {
          id: 'authz-001',
          category: 'Authorization',
          title: 'Implement Role-Based Access Control (RBAC)',
          description: 'Control resource access based on user roles',
          severity: 'critical',
          implementation: [
            'Define clear role hierarchy',
            'Apply principle of least privilege',
            'Check permissions on every endpoint',
            'Use resource-based access control for sensitive data',
          ],
        },
        {
          id: 'authz-002',
          category: 'Authorization',
          title: 'Prevent Horizontal Privilege Escalation',
          description: 'Prevent users from accessing other users\' resources',
          severity: 'critical',
          implementation: [
            'Never trust user input for resource ownership',
            'Always check user against resource owner',
            'Use UUIDs instead of sequential IDs',
            'Implement resource-level access checks',
          ],
          codeExample:
            'if (resource.userId !== authenticatedUser.id) throw Forbidden',
        },
        {
          id: 'authz-003',
          category: 'Authorization',
          title: 'Implement Rate Limiting per API Key',
          description: 'Prevent API abuse through rate limiting',
          severity: 'high',
          implementation: [
            'Implement per-API-key rate limits',
            'Use burst allowances for legitimate traffic',
            'Return 429 with Retry-After header',
            'Log excessive usage for analysis',
          ],
        },
      ],
      checklist: [
        '☑️ Implement RBAC with defined roles',
        '☑️ Check permissions on every endpoint',
        '☑️ Use UUIDs for resource identification',
        '☑️ Prevent horizontal privilege escalation',
        '☑️ Implement detailed audit logging',
      ],
      commonMistakes: [
        '❌ Trusting client-provided user IDs',
        '❌ Using predictable sequential IDs',
        '❌ Not checking ownership of resources',
        '❌ Relying only on frontend authorization',
      ],
      bestPractices: [
        '✅ Centralize authorization logic',
        '✅ Use OWASP RBAC patterns',
        '✅ Implement resource-based access control',
        '✅ Default deny principle',
      ],
    };

    this.guidelines.set('authorization', authzGuideline);

    // Input Validation Guidelines
    const inputGuideline: APISecurityGuideline = {
      id: 'input-guid-001',
      topic: 'Input Validation & Sanitization',
      guidelines: [
        {
          id: 'input-001',
          category: 'Input Validation',
          title: 'Validate All Inputs',
          description: 'Implement comprehensive input validation',
          severity: 'critical',
          implementation: [
            'Whitelist acceptable values',
            'Validate data types and formats',
            'Check length restrictions',
            'Validate against business logic rules',
          ],
        },
        {
          id: 'input-002',
          category: 'Input Validation',
          title: 'Prevent Injection Attacks',
          description: 'Block SQL, NoSQL, and command injection',
          severity: 'critical',
          implementation: [
            'Use parameterized queries exclusively',
            'Use ORM frameworks with parameterization',
            'Never concatenate user input into queries',
            'Validate and escape user input',
            'Use allow-lists for dynamic query parts',
          ],
        },
        {
          id: 'input-003',
          category: 'Input Validation',
          title: 'Prevent XSS Attacks',
          description: 'Sanitize and validate for XSS prevention',
          severity: 'high',
          implementation: [
            'Encode output based on context (HTML, JS, URL)',
            'Use templating engines with auto-escape',
            'Implement Content Security Policy',
            'Sanitize HTML user input',
          ],
        },
      ],
      checklist: [
        '☑️ Use schema validation (Zod, Joi)',
        '☑️ Whitelist acceptable values',
        '☑️ Use parameterized queries',
        '☑️ Implement CSP headers',
        '☑️ Escape output by context',
      ],
      commonMistakes: [
        '❌ String concatenation in SQL queries',
        '❌ Not validating array/object inputs',
        '❌ Assuming client-side validation is sufficient',
        '❌ Trusting headers without validation',
      ],
      bestPractices: [
        '✅ Use libraries like Zod or JSON Schema',
        '✅ Implement server-side validation after parsing',
        '✅ Log validation failures',
        '✅ Use ORM/query builders',
      ],
    };

    this.guidelines.set('input', inputGuideline);

    // Data Protection Guidelines
    const dataGuideline: APISecurityGuideline = {
      id: 'data-guid-001',
      topic: 'Data Protection',
      guidelines: [
        {
          id: 'data-001',
          category: 'Data Protection',
          title: 'Encrypt Sensitive Data',
          description: 'Protect PII and sensitive information at rest and in transit',
          severity: 'critical',
          implementation: [
            'Use TLS 1.2+ for transport',
            'Encrypt PII at rest using AES-256',
            'Never log passwords or sensitive tokens',
            'Use secure hashing for passwords',
          ],
        },
        {
          id: 'data-002',
          category: 'Data Protection',
          title: 'Implement Data Minimization',
          description: 'Collect and store only necessary data',
          severity: 'high',
          implementation: [
            'Minimize data collection',
            'Implement data retention policies',
            'Provide data deletion APIs',
            'Mask sensitive data in logs',
          ],
        },
      ],
      checklist: [
        '☑️ Use HTTPS with TLS 1.2+',
        '☑️ Encrypt PII at rest',
        '☑️ Use bcrypt/Argon2 for passwords',
        '☑️ Mask sensitive data in logging',
        '☑️ Implement field-level encryption',
      ],
      commonMistakes: [
        '❌ Storing passwords in plaintext',
        '❌ Transmitting data over HTTP',
        '❌ Logging sensitive information',
        '❌ Using weak encryption algorithms',
      ],
      bestPractices: [
        '✅ Use HSTS headers',
        '✅ Implement TLS certificate pinning',
        '✅ Follow encryption key management best practices',
        '✅ Use hardware security modules for key storage',
      ],
    };

    this.guidelines.set('data', dataGuideline);

    // Error Handling Guidelines
    const errorGuideline: APISecurityGuideline = {
      id: 'error-guid-001',
      topic: 'Error Handling & Logging',
      guidelines: [
        {
          id: 'error-001',
          category: 'Error Handling',
          title: 'Implement Secure Error Handling',
          description: 'Return safe error messages without exposing internals',
          severity: 'high',
          implementation: [
            'Return generic error messages to clients',
            'Log detailed errors on server side only',
            'Never expose stack traces to users',
            'Include request IDs for support',
          ],
        },
        {
          id: 'error-002',
          category: 'Logging',
          title: 'Implement Comprehensive Logging',
          description: 'Log security-relevant events for monitoring',
          severity: 'high',
          implementation: [
            'Log all authentication failures',
            'Log authorization failures',
            'Log security events (rate limit, injection attempts)',
            'Never log sensitive data (passwords, tokens)',
          ],
        },
      ],
      checklist: [
        '☑️ Return generic error messages',
        '☑️ Log details server-side only',
        '☑️ Include request IDs in responses',
        '☑️ Never expose stack traces',
        '☑️ Log auth failures with IPs',
      ],
      commonMistakes: [
        '❌ Exposing database errors to clients',
        '❌ Including stack traces in error responses',
        '❌ Logging passwords or tokens',
        '❌ Insufficient logging of security events',
      ],
      bestPractices: [
        '✅ Use structured logging (JSON)',
        '✅ Centralize log collection and analysis',
        '✅ Implement log retention policies',
        '✅ Monitor logs for suspicious patterns',
      ],
    };

    this.guidelines.set('error-logging', errorGuideline);

    // API Design Guidelines
    const designGuideline: APISecurityGuideline = {
      id: 'design-guid-001',
      topic: 'API Design Security',
      guidelines: [
        {
          id: 'design-001',
          category: 'API Design',
          title: 'Implement Proper API Versioning',
          description: 'Use API versioning to manage breaking changes safely',
          severity: 'medium',
          implementation: [
            'Use versioning in URL path (/api/v1/)',
            'Communicate deprecation timelines',
            'Sunset old versions without warning after notice period',
          ],
        },
        {
          id: 'design-002',
          category: 'API Design',
          title: 'Document Security Requirements',
          description: 'Clearly document all security requirements in API docs',
          severity: 'medium',
          implementation: [
            'Document required authentication method',
            'Document rate limits and quotas',
            'Provide security examples in documentation',
            'List supported encryption and signing algorithms',
          ],
        },
      ],
      checklist: [
        '☑️ Version API endpoints',
        '☑️ Document security requirements',
        '☑️ Provide security examples',
        '☑️ Communicate deprecation schedules',
      ],
      commonMistakes: [
        '❌ Breaking API without versioning',
        '❌ Undocumented security requirements',
        '❌ No deprecation notice period',
      ],
      bestPractices: [
        '✅ Use semantic versioning',
        '✅ Provide migration guides',
        '✅ Test compatibility across versions',
      ],
    };

    this.guidelines.set('design', designGuideline);
  }

  /**
   * Get security checklist for topic
   */
  getChecklist(topic: string): string[] {
    const guideline = this.guidelines.get(topic);
    return guideline?.checklist ?? [];
  }

  /**
   * Get common mistakes for topic
   */
  getCommonMistakes(topic: string): string[] {
    const guideline = this.guidelines.get(topic);
    return guideline?.commonMistakes ?? [];
  }

  /**
   * Get best practices for topic
   */
  getBestPractices(topic: string): string[] {
    const guideline = this.guidelines.get(topic);
    return guideline?.bestPractices ?? [];
  }

  /**
   * Generate API security audit summary
   */
  generateAuditSummary(): {
    totalGuidelines: number;
    byCategory: Record<string, number>;
    criticalItems: number;
  } {
    let critical = 0;
    const byCategory: Record<string, number> = {};

    for (const guideline of this.guidelines.values()) {
      for (const practice of guideline.guidelines) {
        byCategory[practice.category] = (byCategory[practice.category] ?? 0) + 1;

        if (practice.severity === 'critical') {
          critical++;
        }
      }
    }

    return {
      totalGuidelines: Array.from(this.guidelines.values()).reduce(
        (sum, g) => sum + g.guidelines.length,
        0
      ),
      byCategory,
      criticalItems: critical,
    };
  }
}

export const apiSecurityGuide = APISecurityGuide.getInstance();
export type { APISecurityBestPractice, APISecurityGuideline };
