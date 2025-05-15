/**
 * Third-Party System Integration
 * ==============================
 * Days 71-74: Insurance, pharmacy, and lab system integrations
 */

import { logger } from './logger';

export interface ThirdPartyProvider {
  id: string;
  name: string;
  type: 'insurance' | 'pharmacy' | 'lab' | 'ehr';
  endpoint: string;
  apiKey: string;
  active: boolean;
  supportedOperations: string[];
  rateLimitPerMinute: number;
}

export interface ClaimsData {
  claimId: string;
  patientId: string;
  providerId: string;
  serviceDate: Date;
  amount: number;
  status: 'pending' | 'approved' | 'denied' | 'paid';
  insuranceProvider: string;
  denialReason?: string;
}

export interface PharmacyOrder {
  orderId: string;
  patientId: string;
  medications: string[];
  quantity: number;
  deliveryAddress: string;
  status: 'pending' | 'filled' | 'shipped' | 'delivered';
  pharmacyId: string;
  costEstimate: number;
}

export interface LabTest {
  testId: string;
  patientId: string;
  testName: string;
  orderedDate: Date;
  completedDate?: Date;
  results?: string[];
  status: 'ordered' | 'in-progress' | 'completed' | 'failed';
  labProviderId: string;
  referenceRange?: string;
}

export class ThirdPartyIntegrationManager {
  private providers: Map<string, ThirdPartyProvider> = new Map();
  private claims: Map<string, ClaimsData> = new Map();
  private pharmacyOrders: Map<string, PharmacyOrder> = new Map();
  private labTests: Map<string, LabTest> = new Map();
  private rateLimiters: Map<string, number> = new Map();
  private integrationLogs: Array<{
    timestamp: Date;
    provider: string;
    operation: string;
    status: string;
    error?: string;
  }> = [];

  /**
   * Register third-party provider
   */
  public registerProvider(
    providerId: string,
    name: string,
    type: ThirdPartyProvider['type'],
    endpoint: string,
    apiKey: string,
    supportedOps: string[]
  ): boolean {
    try {
      const provider: ThirdPartyProvider = {
        id: providerId,
        name,
        type,
        endpoint,
        apiKey,
        active: true,
        supportedOperations: supportedOps,
        rateLimitPerMinute: 100
      };

      this.providers.set(providerId, provider);
      logger.log(`Provider registered: ${name} (${type})`);
      return true;
    } catch (error) {
      logger.error('Provider registration failed', error);
      return false;
    }
  }

  /**
   * Submit insurance claim
   */
  public async submitClaim(
    patientId: string,
    providerId: string,
    serviceDate: Date,
    amount: number,
    insuranceProvider: string
  ): Promise<ClaimsData | null> {
    try {
      if (!this.checkRateLimit('insurance')) {
        throw new Error('Rate limit exceeded');
      }

      const claim: ClaimsData = {
        claimId: `claim_${Date.now()}`,
        patientId,
        providerId,
        serviceDate,
        amount,
        status: 'pending',
        insuranceProvider
      };

      this.claims.set(claim.claimId, claim);

      this.logIntegration('insurance', 'submit_claim', 'success');
      return claim;
    } catch (error) {
      this.logIntegration(
        'insurance',
        'submit_claim',
        'failed',
        String(error)
      );
      return null;
    }
  }

  /**
   * Check claim status
   */
  public getClaimStatus(claimId: string): ClaimsData | null {
    return this.claims.get(claimId) || null;
  }

  /**
   * Update claim status
   */
  public updateClaimStatus(
    claimId: string,
    status: ClaimsData['status'],
    denialReason?: string
  ): boolean {
    const claim = this.claims.get(claimId);
    if (!claim) return false;

    claim.status = status;
    if (denialReason) {
      claim.denialReason = denialReason;
    }

    logger.log(`Claim status updated: ${claimId} -> ${status}`);
    return true;
  }

  /**
   * Order medication from pharmacy
   */
  public async orderMedication(
    patientId: string,
    medications: string[],
    quantity: number,
    deliveryAddress: string,
    pharmacyId: string
  ): Promise<PharmacyOrder | null> {
    try {
      if (!this.checkRateLimit('pharmacy')) {
        throw new Error('Rate limit exceeded');
      }

      const order: PharmacyOrder = {
        orderId: `pharm_${Date.now()}`,
        patientId,
        medications,
        quantity,
        deliveryAddress,
        status: 'pending',
        pharmacyId,
        costEstimate: quantity * 25 // placeholder calculation
      };

      this.pharmacyOrders.set(order.orderId, order);
      this.logIntegration('pharmacy', 'place_order', 'success');
      return order;
    } catch (error) {
      this.logIntegration(
        'pharmacy',
        'place_order',
        'failed',
        String(error)
      );
      return null;
    }
  }

  /**
   * Track pharmacy order
   */
  public trackOrder(orderId: string): PharmacyOrder | null {
    return this.pharmacyOrders.get(orderId) || null;
  }

  /**
   * Order lab test
   */
  public async orderLabTest(
    patientId: string,
    testName: string,
    labProviderId: string,
    referenceRange?: string
  ): Promise<LabTest | null> {
    try {
      if (!this.checkRateLimit('lab')) {
        throw new Error('Rate limit exceeded');
      }

      const test: LabTest = {
        testId: `lab_${Date.now()}`,
        patientId,
        testName,
        orderedDate: new Date(),
        status: 'ordered',
        labProviderId,
        referenceRange
      };

      this.labTests.set(test.testId, test);
      this.logIntegration('lab', 'order_test', 'success');
      return test;
    } catch (error) {
      this.logIntegration('lab', 'order_test', 'failed', String(error));
      return null;
    }
  }

  /**
   * Get lab results
   */
  public getLabResults(testId: string): LabTest | null {
    return this.labTests.get(testId) || null;
  }

  /**
   * Update lab test status
   */
  public updateLabTestStatus(
    testId: string,
    status: LabTest['status'],
    results?: string[]
  ): boolean {
    const test = this.labTests.get(testId);
    if (!test) return false;

    test.status = status;
    if (results) {
      test.results = results;
      test.completedDate = new Date();
    }

    return true;
  }

  private checkRateLimit(providerType: string): boolean {
    const key = `rateLimitCounter_${providerType}`;
    const count = this.rateLimiters.get(key) ?? 0;

    if (count >= 100) {
      return false;
    }

    this.rateLimiters.set(key, count + 1);

    // Reset counter every minute
    setTimeout(() => {
      this.rateLimiters.set(key, 0);
    }, 60000);

    return true;
  }

  private logIntegration(
    provider: string,
    operation: string,
    status: string,
    error?: string
  ): void {
    this.integrationLogs.push({
      timestamp: new Date(),
      provider,
      operation,
      status,
      error
    });

    // Keep only last 1000 logs
    if (this.integrationLogs.length > 1000) {
      this.integrationLogs = this.integrationLogs.slice(-1000);
    }
  }

  /**
   * Get integration statistics
   */
  public getIntegrationStats(): {
    totalClaims: number;
    totalOrders: number;
    totalTests: number;
    pendingOperations: number;
    failureRate: number;
  } {
    const pendingClaims = Array.from(this.claims.values()).filter(
      c => c.status === 'pending'
    ).length;
    const pendingOrders = Array.from(
      this.pharmacyOrders.values()
    ).filter(o => o.status === 'pending').length;
    const pendingTests = Array.from(this.labTests.values()).filter(
      t => t.status === 'ordered' || t.status === 'in-progress'
    ).length;

    const totalOps = this.integrationLogs.length;
    const failedOps = this.integrationLogs.filter(
      l => l.status === 'failed'
    ).length;
    const failureRate =
      totalOps > 0 ? (failedOps / totalOps) * 100 : 0;

    return {
      totalClaims: this.claims.size,
      totalOrders: this.pharmacyOrders.size,
      totalTests: this.labTests.size,
      pendingOperations:
        pendingClaims + pendingOrders + pendingTests,
      failureRate: parseFloat(failureRate.toFixed(2))
    };
  }
}

export const thirdPartyIntegrationManager =
  new ThirdPartyIntegrationManager();
