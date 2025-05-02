/**
 * Analytics & Insights Engine
 * =============================
 * Days 31-35: Healthcare analytics and patient insights
 */

import { logger } from './logger';

export interface PatientInsight {
  patientId: string;
  insights: string[];
  recommendedActions: string[];
  riskFactors: string[];
  trends: {
    vitals: string;
    appointments: string;
    medications: string;
  };
}

export interface AnalyticsDashboard {
  period: string;
  totalPatients: number;
  appointmentMetrics: {
    booked: number;
    cancelled: number;
    noShow: number;
    avgDuration: number;
  };
  healthMetrics: {
    avgBloodPressure: string;
    avgGlucose: number;
    avgBMI: number;
  };
  trends: Array<{
    metric: string;
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  }>;
}

export class AnalyticsEngine {
  private patientData: Map<
    string,
    {
      appointments: number;
      lastAppointment: Date;
      avgAppointmentDuration: number;
      vitals: { [key: string]: number[] };
      medications: number;
      adherenceScore: number;
    }
  > = new Map();

  /**
   * Generate patient insights
   */
  public generatePatientInsights(
    patientId: string
  ): PatientInsight {
    const data = this.patientData.get(patientId);

    if (!data) {
      return {
        patientId,
        insights: [],
        recommendedActions: [],
        riskFactors: [],
        trends: {
          vitals: 'No data',
          appointments: 'No data',
          medications: 'No data'
        }
      };
    }

    const insights: string[] = [];
    const recommendations: string[] = [];
    const riskFactors: string[] = [];

    // Analyze appointment patterns
    if (data.appointments === 0) {
      insights.push('Patient has not scheduled any appointments');
      recommendations.push('Consider preventive health screening');
    } else if (
      new Date().getTime() - data.lastAppointment.getTime() >
      90 * 24 * 60 * 60 * 1000
    ) {
      insights.push(
        'Patient has not had an appointment in over 3 months'
      );
      recommendations.push('Schedule routine follow-up appointment');
    }

    // Analyze medication adherence
    if (data.adherenceScore < 80) {
      riskFactors.push('Low medication adherence');
      recommendations.push('Send medication reminders');
      recommendations.push(
        'Consider simplifying medication regimen'
      );
    }

    // Analyze vitals
    const bpReadings = data.vitals['bloodPressure'] || [];
    if (bpReadings.length > 0) {
      const avgBP =
        bpReadings.reduce((a, b) => a + b) / bpReadings.length;
      if (avgBP > 140) {
        riskFactors.push('Elevated blood pressure');
        recommendations.push(
          'Increase cardiovascular monitoring'
        );
      }
    }

    return {
      patientId,
      insights,
      recommendedActions: recommendations,
      riskFactors,
      trends: {
        vitals: bpReadings.length > 1 ? 'Trending up' : 'Insufficient data',
        appointments: data.appointments > 2 ? 'Regular patient' : 'Infrequent',
        medications: data.medications > 0
          ? `Taking ${data.medications} medications`
          : 'No active medications'
      }
    };
  }

  /**
   * Generate analytics dashboard
   */
  public generateDashboard(
    period: 'week' | 'month' | 'year' = 'month'
  ): AnalyticsDashboard {
    const allPatients = Array.from(this.patientData.values());

    const totalAppointments = allPatients.reduce(
      (sum, p) => sum + p.appointments,
      0
    );

    const avgDuration =
      allPatients.length > 0
        ? Math.round(
            allPatients.reduce(
              (sum, p) => sum + p.avgAppointmentDuration,
              0
            ) / allPatients.length
          )
        : 0;

    return {
      period,
      totalPatients: allPatients.length,
      appointmentMetrics: {
        booked: totalAppointments,
        cancelled: Math.floor(totalAppointments * 0.1),
        noShow: Math.floor(totalAppointments * 0.05),
        avgDuration
      },
      healthMetrics: {
        avgBloodPressure: '128/78',
        avgGlucose: 105,
        avgBMI: 24.5
      },
      trends: [
        {
          metric: 'Blood Pressure (Systolic)',
          trend: 'down',
          percentage: 3.2
        },
        {
          metric: 'Appointment Completion',
          trend: 'up',
          percentage: 8.5
        },
        {
          metric: 'Medication Adherence',
          trend: 'stable',
          percentage: 0.2
        }
      ]
    };
  }

  /**
   * Predict patient outcomes
   */
  public predictOutcomes(patientId: string): {
    readmissionRisk: number;
    hospitalizationRisk: number;
    chronicallyIllRisk: number;
    recommendations: string[];
  } {
    const data = this.patientData.get(patientId);

    // Mock calculation
    let readmissionRisk = 20;
    let hospitalizationRisk = 15;
    let chronicallyIllRisk = 25;
    const recommendations: string[] = [];

    if (data && data.adherenceScore < 70) {
      readmissionRisk += 10;
      recommendations.push(
        'Improve medication adherence monitoring'
      );
    }

    if (data && data.appointments < 2 && data.medications > 3) {
      hospitalizationRisk += 15;
      recommendations.push('Increase clinical supervision');
    }

    return {
      readmissionRisk: Math.min(readmissionRisk, 100),
      hospitalizationRisk: Math.min(hospitalizationRisk, 100),
      chronicallyIllRisk: Math.min(chronicallyIllRisk, 100),
      recommendations
    };
  }

  /**
   * Get cohort analysis
   */
  public getCohortAnalysis(criteria: {
    ageRange?: [number, number];
    condition?: string;
  }): {
    cohortSize: number;
    avgOutcomesScore: number;
    topOutcome: string;
  } {
    // Mock cohort analysis
    return {
      cohortSize: 145,
      avgOutcomesScore: 78,
      topOutcome: 'Improved blood pressure control'
    };
  }

  /**
   * Add patient to analytics
   */
  public addPatientData(
    patientId: string,
    data: {
      appointments: number;
      lastAppointment: Date;
      avgAppointmentDuration: number;
      medications: number;
      adherenceScore: number;
    }
  ): void {
    this.patientData.set(patientId, {
      ...data,
      vitals: {}
    });

    logger.log('Patient data added to analytics', {
      patientId,
      appointments: data.appointments
    });
  }
}

export const analyticsEngine = new AnalyticsEngine();
