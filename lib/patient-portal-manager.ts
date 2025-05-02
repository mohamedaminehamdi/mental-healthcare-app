/**
 * Patient Portal & Self-Service Features
 * =======================================
 * Days 37-40: Enhanced patient engagement and self-service
 */

import { logger } from './logger';

export interface PatientPortal {
  patientId: string;
  medicalRecordsAccess: boolean;
  prescriptionRefills: boolean;
  appointmentScheduling: boolean;
  documentDowloads: boolean;
  messagesWithProvider: boolean;
  billingAccess: boolean;
  preferences: {
    communicationMethod: 'email' | 'sms' | 'app';
    appointmentReminders: boolean;
    healthInsights: boolean;
  };
}

export interface PatientDashboard {
  upcomingAppointments: number;
  pendingPrescriptions: number;
  unreadMessages: number;
  healthGoals: string[];
  recentVitals: { [key: string]: number };
  actionItems: string[];
}

export class PatientPortalManager {
  private portals: Map<string, PatientPortal> = new Map();
  private accessLogs: Array<{
    patientId: string;
    feature: string;
    timestamp: Date;
  }> = [];

  /**
   * Initialize patient portal
   */
  public initializePortal(patientId: string): PatientPortal {
    const portal: PatientPortal = {
      patientId,
      medicalRecordsAccess: true,
      prescriptionRefills: true,
      appointmentScheduling: true,
      documentDowloads: true,
      messagesWithProvider: true,
      billingAccess: true,
      preferences: {
        communicationMethod: 'email',
        appointmentReminders: true,
        healthInsights: true
      }
    };

    this.portals.set(patientId, portal);

    logger.log('Patient portal initialized', {
      patientId,
      features: 6
    });

    return portal;
  }

  /**
   * Get patient dashboard
   */
  public getPatientDashboard(patientId: string): PatientDashboard {
    const portal = this.portals.get(patientId);

    if (!portal) {
      return {
        upcomingAppointments: 0,
        pendingPrescriptions: 0,
        unreadMessages: 0,
        healthGoals: [],
        recentVitals: {},
        actionItems: []
      };
    }

    // Mock data
    return {
      upcomingAppointments: 2,
      pendingPrescriptions: 1,
      unreadMessages: 3,
      healthGoals: [
        'Maintain blood pressure < 130/80',
        'Exercise 30 min, 5 days/week',
        'Reduce sodium intake'
      ],
      recentVitals: {
        bloodPressure: 128,
        heartRate: 72,
        temperature: 98.6,
        weight: 165
      },
      actionItems: [
        'Complete health questionnaire',
        'Schedule annual physical',
        'Update medication list'
      ]
    };
  }

  /**
   * Request prescription refill
   */
  public async requestRefill(
    patientId: string,
    medicationId: string
  ): Promise<{
    success: boolean;
    refillId?: string;
    estimatedReady?: Date;
  }> {
    const portal = this.portals.get(patientId);
    if (!portal || !portal.prescriptionRefills) {
      return { success: false };
    }

    const refillId = `refill_${Date.now()}`;
    const estimatedReady = new Date(
      Date.now() + 2 * 24 * 60 * 60 * 1000
    );

    this.logAccess(patientId, 'prescription_refill');

    logger.log('Refill request submitted', {
      patientId,
      medicationId,
      refillId,
      estimatedReady
    });

    return {
      success: true,
      refillId,
      estimatedReady
    };
  }

  /**
   * Download medical record
   */
  public async downloadMedicalRecord(
    patientId: string,
    recordType: string
  ): Promise<{
    success: boolean;
    documentPath?: string;
    fileName?: string;
  }> {
    const portal = this.portals.get(patientId);
    if (!portal || !portal.medicalRecordsAccess) {
      logger.error('Medical record access denied', { patientId });
      return { success: false };
    }

    this.logAccess(patientId, 'medical_record_download');

    const fileName = `${recordType}_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

    logger.log('Medical record downloaded', {
      patientId,
      recordType,
      fileName
    });

    return {
      success: true,
      documentPath: `/documents/${fileName}`,
      fileName
    };
  }

  /**
   * Send message to provider
   */
  public async sendMessage(
    patientId: string,
    content: string,
    attachment?: string
  ): Promise<{ success: boolean; messageId?: string }> {
    const portal = this.portals.get(patientId);
    if (!portal || !portal.messagesWithProvider) {
      return { success: false };
    }

    const messageId = `msg_${Date.now()}`;

    this.logAccess(patientId, 'send_message');

    logger.log('Patient message sent', {
      patientId,
      messageId,
      contentLength: content.length,
      hasAttachment: !!attachment
    });

    return {
      success: true,
      messageId
    };
  }

  /**
   * Get patient engagement metrics
   */
  public getEngagementMetrics(
    patientId: string
  ): {
    lastAccess: Date | null;
    accessCount: number;
    activeFeatures: number;
    engagementScore: number;
  } {
    const portal = this.portals.get(patientId);
    const patientLogs = this.accessLogs.filter(
      l => l.patientId === patientId
    );

    const lastAccess =
      patientLogs.length > 0
        ? patientLogs[patientLogs.length - 1].timestamp
        : null;

    const activeFeatures = portal
      ? Object.values(portal).filter(v => v === true).length
      : 0;

    // Calculate engagement score (0-100)
    let score = 0;
    if (patientLogs.length > 0) score += 20;
    if (patientLogs.length > 5) score += 20;
    if (lastAccess && new Date().getTime() - lastAccess.getTime() <
      7 * 24 * 60 * 60 * 1000) {
      score += 30;
    }
    score += activeFeatures * 5;

    return {
      lastAccess,
      accessCount: patientLogs.length,
      activeFeatures,
      engagementScore: Math.min(score, 100)
    };
  }

  private logAccess(patientId: string, feature: string): void {
    this.accessLogs.push({
      patientId,
      feature,
      timestamp: new Date()
    });
  }

  /**
   * Update portal preferences
   */
  public updatePreferences(
    patientId: string,
    preferences: Partial<PatientPortal['preferences']>
  ): boolean {
    const portal = this.portals.get(patientId);
    if (!portal) {
      return false;
    }

    portal.preferences = {
      ...portal.preferences,
      ...preferences
    };

    logger.log('Patient preferences updated', {
      patientId,
      preferences
    });

    return true;
  }
}

export const patientPortalManager = new PatientPortalManager();
