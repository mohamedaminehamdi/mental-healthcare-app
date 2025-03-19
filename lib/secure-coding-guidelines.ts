/**
 * Secure Coding Guidelines & Best Practices
 * Development standards for writing secure code
 */

interface CodingGuideline {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  language?: string; // 'typescript', 'javascript', 'all'
  codeExample: {
    bad: string;
    good: string;
  };
  whyItMatters: string;
  references: string[]; // OWASP, CWE references
}

interface CodeReviewChecklist {
  id: string;
  name: string;
  items: CodeReviewItem[];
  estimatedDuration: number; // minutes
}

interface CodeReviewItem {
  category: string;
  items: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SecureCodeMetrics {
  totalFunctions: number;
  functionsReviewed: number;
  issuesFound: number;
  issuesBySeverity: Record<string, number>;
  complianceScore: number; // percentage
}

class SecurecodingGuide {
  private static instance: SecurecodingGuide;
  private guidelines: Map<string, CodingGuideline> = new Map();
  private checklists: Map<string, CodeReviewChecklist> = new Map();

  private constructor() {
    this.initializeGuidelines();
    this.initializeChecklists();
  }

  static getInstance(): SecurecodingGuide {
    if (!SecurecodingGuide.instance) {
      SecurecodingGuide.instance = new SecurecodingGuide();
    }
    return SecurecodingGuide.instance;
  }

  /**
   * Get guideline by ID
   */
  getGuideline(id: string): CodingGuideline | undefined {
    return this.guidelines.get(id);
  }

  /**
   * Get all guidelines
   */
  getAllGuidelines(): CodingGuideline[] {
    return Array.from(this.guidelines.values());
  }

  /**
   * Get guidelines by category
   */
  getGuidelinesByCategory(category: string): CodingGuideline[] {
    return Array.from(this.guidelines.values()).filter(
      (g) => g.category === category
    );
  }

  /**
   * Get code review checklist
   */
  getCodeReviewChecklist(type: string): CodeReviewChecklist | undefined {
    return this.checklists.get(type);
  }

  /**
   * Initialize guidelines
   */
  private initializeGuidelines(): void {
    // Input Validation Guidelines
    this.guidelines.set('input-001', {
      id: 'input-001',
      title: 'Always Validate User Input',
      description:
        'Never trust user input - always validate, sanitize, and whitelist',
      severity: 'critical',
      category: 'Input Validation',
      language: 'all',
      codeExample: {
        bad: `
        const userId = req.params.id;
        const user = await db.findUser(userId);
        `,
        good: `
        const idSchema = z.string().uuid();
        const userId = idSchema.parse(req.params.id);
        const user = await db.findUser(userId);
        `,
      },
      whyItMatters:
        'Unvalidated input is the root cause of injection attacks, XSS, and business logic errors',
      references: [
        'OWASP A03:2021 - Injection',
        'CWE-20: Improper Input Validation',
      ],
    });

    // Error Handling
    this.guidelines.set('error-001', {
      id: 'error-001',
      title: 'Never Expose Error Details to Users',
      description: 'Log errors securely server-side, return generic messages',
      severity: 'high',
      category: 'Error Handling',
      language: 'all',
      codeExample: {
        bad: `
        try {
          await operation();
        } catch (error) {
          res.json({ error: error.message });
        }
        `,
        good: `
        try {
          await operation();
        } catch (error) {
          logger.error('Operation failed', { error });
          res.status(500).json({ error: 'Internal server error' });
        }
        `,
      },
      whyItMatters:
        'Stack traces reveal system architecture and can expose SQL queries, file paths, internal IP addresses',
      references: [
        'OWASP A09:2021 - Logging and Monitoring Failures',
        'CWE-209: Information Exposure',
      ],
    });

    // Authentication
    this.guidelines.set('auth-001', {
      id: 'auth-001',
      title: 'Never Store Plaintext Passwords',
      description: 'Always use strong hashing algorithms like bcrypt or Argon2',
      severity: 'critical',
      category: 'Authentication',
      language: 'all',
      codeExample: {
        bad: `
        const hash = crypto.createHash('md5').update(password).digest('hex');
        db.saveUser({ password: hash });
        `,
        good: `
        import bcrypt from 'bcrypt';
        const hash = await bcrypt.hash(password, 12);
        db.saveUser({ passwordHash: hash });
        `,
      },
      whyItMatters:
        'Weak hashing algorithms like MD5 and SHA1 can be cracked with modern hardware',
      references: [
        'OWASP A02:2021 - Cryptographic Failures',
        'CWE-327: Use of Broken Cryptographic Algorithm',
      ],
    });

    // SQL Injection
    this.guidelines.set('sql-001', {
      id: 'sql-001',
      title: 'Always Use Parameterized Queries',
      description: 'Never concatenate user input into SQL queries',
      severity: 'critical',
      category: 'Injection',
      language: 'all',
      codeExample: {
        bad: `
        const query = "SELECT * FROM users WHERE email = '" + email + "'";
        const user = await db.query(query);
        `,
        good: `
        const query = "SELECT * FROM users WHERE email = $1";
        const user = await db.query(query, [email]);
        `,
      },
      whyItMatters:
        'Concatenation allows attackers to inject SQL commands and access/modify any data',
      references: [
        'OWASP A03:2021 - Injection',
        'CWE-89: SQL Injection',
      ],
    });

    // XSS Prevention
    this.guidelines.set('xss-001', {
      id: 'xss-001',
      title: 'Always Encode Output',
      description: 'Encode data based on context (HTML, JS, URL, CSS)',
      severity: 'high',
      category: 'XSS Prevention',
      language: 'javascript',
      codeExample: {
        bad: `
        <div>{userData.comment}</div>
        `,
        good: `
        import { escapeHtml } from 'secure-lib';
        <div>{escapeHtml(userData.comment)}</div>
        `,
      },
      whyItMatters:
        'Unencoded output allows attackers to inject scripts that run in user browsers',
      references: [
        'OWASP A03:2021 - Injection (XSS)',
        'CWE-79: Cross-site Scripting',
      ],
    });

    // Secrets Management
    this.guidelines.set('secrets-001', {
      id: 'secrets-001',
      title: 'Never Commit Secrets to Version Control',
      description:
        'Use environment variables and secrets management tools',
      severity: 'critical',
      category: 'Secrets Management',
      language: 'all',
      codeExample: {
        bad: `
        const apiKey = 'sk-1234567890abcdef';
        const response = await fetch('https://api', { headers: { apiKey } });
        `,
        good: `
        const apiKey = process.env.EXTERNAL_API_KEY;
        if (!apiKey) throw new Error('API key not configured');
        const response = await fetch('https://api', { headers: { apiKey } });
        `,
      },
      whyItMatters:
        'Exposed secrets in repositories can be exploited to access external services',
      references: [
        'OWASP A02:2021 - Cryptographic Failures',
        'CWE-798: Use of Hard-Coded Credentials',
      ],
    });

    // Race Conditions
    this.guidelines.set('race-001', {
      id: 'race-001',
      title: 'Prevent Race Conditions',
      description: 'Use database transactions for concurrent operations',
      severity: 'medium',
      category: 'Concurrency',
      language: 'all',
      codeExample: {
        bad: `
        const balance = await db.getBalance(accountId);
        if (balance >= amount) {
          await db.updateBalance(accountId, balance - amount);
        }
        `,
        good: `
        await db.transaction(async (trx) => {
          const balance = await db.getBalance(accountId).forUpdate();
          if (balance >= amount) {
            await db.updateBalance(accountId, balance - amount);
          }
        });
        `,
      },
      whyItMatters:
        'Race conditions can lead to double-spending, data corruption, and authorization bypasses',
      references: [
        'CWE-362: Concurrent Execution using Shared Resource',
      ],
    });

    // HTTPS Requirements
    this.guidelines.set('https-001', {
      id: 'https-001',
      title: 'Always Use HTTPS',
      description: 'Never use HTTP for sensitive data or authentication',
      severity: 'critical',
      category: 'Transport Security',
      language: 'all',
      codeExample: {
        bad: `
        const session = getSession(req);
        // Could be intercepted over HTTP
        `,
        good: `
        if (req.protocol !== 'https' && process.env.NODE_ENV === 'production') {
          return res.status(403).send('HTTPS required');
        }
        const session = getSession(req);
        `,
      },
      whyItMatters:
        'HTTP traffic can be intercepted and credentials/cookies stolen',
      references: [
        'OWASP A02:2021 - Cryptographic Failures',
        'CWE-295: Improper Certificate Validation',
      ],
    });

    // Add CSRF Protection
    this.guidelines.set('csrf-001', {
      id: 'csrf-001',
      title: 'Implement CSRF Protection',
      description: 'Verify token origin for state-changing operations',
      severity: 'high',
      category: 'CSRF Protection',
      language: 'all',
      codeExample: {
        bad: `
        app.post('/transfer', (req, res) => {
          const { amount, toAccount } = req.body;
          // No CSRF protection
          db.transfer(amount, toAccount);
        });
        `,
        good: `
        app.post('/transfer', csrfProtection, (req, res) => {
          const { amount, toAccount } = req.body;
          // CSRF token validated automatically by middleware
          db.transfer(amount, toAccount);
        });
        `,
      },
      whyItMatters:
        'CSRF attacks trick authenticated users into performing actions they didn\'t intend',
      references: [
        'OWASP A01:2021 - Broken Access Control (CSRF)',
        'CWE-352: Cross-Site Request Forgery',
      ],
    });
  }

  /**
   * Initialize checklists
   */
  private initializeChecklists(): void {
    const securityReview: CodeReviewChecklist = {
      id: 'security-review',
      name: 'Security-Focused Code Review',
      estimatedDuration: 30,
      items: [
        {
          category: 'Authentication & Authorization',
          items: [
            '☑️ All authentication is centralized',
            '☑️ Authorization checks on every protected endpoint',
            '☑️ No hardcoded credentials or API keys',
            '☑️ Sessions expire appropriately',
          ],
          severity: 'critical',
        },
        {
          category: 'Input Validation',
          items: [
            '☑️ All user input is validated and sanitized',
            '☑️ No SQL injection vulnerabilities',
            '☑️ No XSS vulnerabilities',
            '☑️ Proper error handling for validation failures',
          ],
          severity: 'critical',
        },
        {
          category: 'Data Protection',
          items: [
            '☑️ Sensitive data encrypted at rest',
            '☑️ TLS/HTTPS enforced',
            '☑️ No sensitive data in logs',
            '☑️ Proper file permissions',
          ],
          severity: 'high',
        },
        {
          category: 'Error Handling & Logging',
          items: [
            '☑️ Errors don\'t expose system details',
            '☑️ Security events are logged',
            '☑️ Logs are not accessible to users',
            '☑️ Sensitive data is masked in logs',
          ],
          severity: 'high',
        },
        {
          category: 'Dependencies',
          items: [
            '☑️ No known vulnerabilities in dependencies',
            '☑️ Dependencies are kept up to date',
            '☑️ Unnecessary dependencies removed',
            '☑️ Third-party code is reviewed',
          ],
          severity: 'high',
        },
      ],
    };

    this.checklists.set('security-review', securityReview);

    const dataflowReview: CodeReviewChecklist = {
      id: 'dataflow-review',
      name: 'Data Flow Security Review',
      estimatedDuration: 20,
      items: [
        {
          category: 'Data Transmissions',
          items: [
            '☑️ All data transmitted over HTTPS',
            '☑️ No sensitive data in URLs or query parameters',
            '☑️ Proper content-type headers set',
            '☑️ CORS policies properly configured',
          ],
          severity: 'high',
        },
        {
          category: 'Data Storage',
          items: [
            '☑️ Sensitive data is encrypted',
            '☑️ Database access controls enforced',
            '☑️ Backup encryption enabled',
            '☑️ Data retention policies implemented',
          ],
          severity: 'high',
        },
      ],
    };

    this.checklists.set('dataflow-review', dataflowReview);
  }

  /**
   * Get all guidelines for a language
   */
  getGuidelinesForLanguage(language: string): CodingGuideline[] {
    return Array.from(this.guidelines.values()).filter(
      (g) => !g.language || g.language === language || g.language === 'all'
    );
  }

  /**
   * Calculate code compliance score
   */
  calculateComplianceScore(
    issuesFound: number,
    severity: Record<string, number>
  ): number {
    let score = 100;

    score -=severity.critical ? severity.critical * 20 : 0;
    score -= severity.high ? severity.high * 10 : 0;
    score -= severity.medium ? severity.medium * 5 : 0;
    score -= severity.low ? severity.low * 1 : 0;

    return Math.max(0, score);
  }
}

export const secureCodeGuide = SecurecodingGuide.getInstance();
export type {
  CodingGuideline,
  CodeReviewChecklist,
  CodeReviewItem,
  SecureCodeMetrics,
};
