/**
 * Enhanced Prescription Management & Drug Interaction Checking
 * ==============================================================
 * Days 20-21: Advanced prescription features with safety checks
 */

import { logger } from './logger';

export interface Medication {
  id: string;
  name: string;
  doseAmount: number;
  doseUnit: string;
  frequency: string;
  duration: string;
  instructions?: string;
  prescribedDate: Date;
  prescribedBy: string;
}

export interface DrugInteraction {
  drugIds: string[];
  severity: 'critical' | 'major' | 'moderate' | 'minor';
  description: string;
  recommendation: string;
}

export interface PatientMedications {
  patientId: string;
  activeMedications: Medication[];
  allergies: string[];
  lastUpdated: Date;
}

export class PrescriptionManager {
  private patientMedications: Map<string, PatientMedications> = new Map();
  private knownInteractions: DrugInteraction[] = this.initializeInteractions();
  private prescriptionHistory: Array<{
    patientId: string;
    medication: Medication;
    status: 'filled' | 'pending' | 'expired';
    filledDate?: Date;
  }> = [];

  /**
   * Add medication to patient profile
   */
  public addMedication(
    patientId: string,
    medication: Medication
  ): { success: boolean; interactions?: DrugInteraction[] } {
    if (!this.patientMedications.has(patientId)) {
      this.patientMedications.set(patientId, {
        patientId,
        activeMedications: [],
        allergies: [],
        lastUpdated: new Date()
      });
    }

    const patientData = this.patientMedications.get(patientId)!;

    // Check for interactions
    const interactions = this.checkInteractions(
      medication.id,
      patientData.activeMedications.map(m => m.id)
    );

    if (interactions.some(i => i.severity === 'critical')) {
      logger.error('Critical drug interaction detected', {
        patientId,
        newDrug: medication.name,
        interactions: interactions.map(i => ({
          severity: i.severity,
          description: i.description
        }))
      });

      return {
        success: false,
        interactions
      };
    }

    patientData.activeMedications.push(medication);
    patientData.lastUpdated = new Date();

    this.prescriptionHistory.push({
      patientId,
      medication,
      status: 'filled',
      filledDate: new Date()
    });

    logger.log('Medication added to patient profile', {
      patientId,
      medicationName: medication.name,
      dose: `${medication.doseAmount} ${medication.doseUnit}`,
      frequency: medication.frequency,
      interactionsChecked: interactions.length
    });

    return {
      success: true,
      interactions: interactions.length > 0 ? interactions : undefined
    };
  }

  /**
   * Check for drug interactions
   */
  private checkInteractions(
    newDrugId: string,
    existingDrugIds: string[]
  ): DrugInteraction[] {
    const foundInteractions: DrugInteraction[] = [];

    this.knownInteractions.forEach(interaction => {
      if (
        interaction.drugIds.includes(newDrugId) &&
        interaction.drugIds.some(id => existingDrugIds.includes(id))
      ) {
        foundInteractions.push(interaction);
      }
    });

    return foundInteractions;
  }

  /**
   * Get patient medications
   */
  public getPatientMedications(
    patientId: string
  ): PatientMedications | null {
    return this.patientMedications.get(patientId) || null;
  }

  /**
   * Remove medication
   */
  public removeMedication(
    patientId: string,
    medicationId: string
  ): boolean {
    const patientData = this.patientMedications.get(patientId);
    if (!patientData) {
      return false;
    }

    const index = patientData.activeMedications.findIndex(
      m => m.id === medicationId
    );
    if (index === -1) {
      return false;
    }

    const removed = patientData.activeMedications.splice(index, 1)[0];
    patientData.lastUpdated = new Date();

    logger.log('Medication removed from patient', {
      patientId,
      medicationName: removed.name
    });

    return true;
  }

  /**
   * Check allergy contraindications
   */
  public checkAllergyContraindications(
    patientId: string,
    medicationName: string
  ): { hasCon traindication: boolean; details?: string } {
    const patientData = this.patientMedications.get(patientId);
    if (!patientData) {
      return { hasContraindication: false };
    }

    const hasAllergy = patientData.allergies.some(
      allergy =>
        medicationName.toLowerCase().includes(allergy.toLowerCase()) ||
        allergy.toLowerCase().includes(medicationName.toLowerCase())
    );

    if (hasAllergy) {
      logger.error('Allergy contraindication detected', {
        patientId,
        medication: medicationName,
        allergen: patientData.allergies.find(a =>
          medicationName.toLowerCase().includes(a.toLowerCase())
        )
      });

      return {
        hasContraindication: true,
        details: `Patient has reported allergy to ${medicationName}`
      };
    }

    return { hasContraindication: false };
  }

  /**
   * Refill prescription
   */
  public async refillPrescription(
    patientId: string,
    medicationId: string
  ): Promise<{ success: boolean; message: string }> {
    const patientData = this.patientMedications.get(patientId);
    if (!patientData) {
      return {
        success: false,
        message: 'Patient record not found'
      };
    }

    const medication = patientData.activeMedications.find(
      m => m.id === medicationId
    );
    if (!medication) {
      return {
        success: false,
        message: 'Medication not found in patient profile'
      };
    }

    logger.log('Prescription refill processed', {
      patientId,
      medication: medication.name,
      nextRefillDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    return {
      success: true,
      message: 'Prescription refilled successfully'
    };
  }

  /**
   * Initialize common drug interactions
   */
  private initializeInteractions(): DrugInteraction[] {
    return [
      {
        drugIds: ['warfarin', 'aspirin'],
        severity: 'major',
        description:
          'Increased risk of bleeding when combined',
        recommendation:
          'Monitor for signs of bleeding, consider alternative to aspirin'
      },
      {
        drugIds: ['lisinopril', 'potassium-supplements'],
        severity: 'major',
        description: 'Risk of hyperkalemia',
        recommendation:
          'Monitor potassium levels, adjust dosage if necessary'
      },
      {
        drugIds: ['metformin', 'contrast-dye'],
        severity: 'critical',
        description:
          'Risk of acute kidney injury',
        recommendation:
          'Discontinue metformin before imaging, resume after renal function verified'
      }
    ];
  }

  /**
   * Get medication statistics
   */
  public getMedicationStats(patientId: string): {
    totalActiveMedications: number;
    averageInteractionsPerMedication: number;
    lastPrescriptionDate?: Date;
  } {
    const patientData = this.patientMedications.get(patientId);
    if (!patientData) {
      return {
        totalActiveMedications: 0,
        averageInteractionsPerMedication: 0
      };
    }

    let totalInteractions = 0;
    patientData.activeMedications.forEach(med => {
      totalInteractions += this.checkInteractions(
        med.id,
        patientData.activeMedications
          .filter(m => m.id !== med.id)
          .map(m => m.id)
      ).length;
    });

    const history = this.prescriptionHistory.filter(
      h => h.patientId === patientId
    );

    return {
      totalActiveMedications: patientData.activeMedications.length,
      averageInteractionsPerMedication:
        patientData.activeMedications.length > 0
          ? totalInteractions / patientData.activeMedications.length
          : 0,
      lastPrescriptionDate:
        history.length > 0
          ? history[history.length - 1].filledDate
          : undefined
    };
  }
}

export const prescriptionManager = new PrescriptionManager();
