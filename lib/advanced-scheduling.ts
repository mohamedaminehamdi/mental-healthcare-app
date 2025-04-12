/**
 * Advanced Appointment Scheduling & Calendar Integration
 * ========================================================
 * Days 18-20: Intelligent scheduling with conflict detection
 */

import { logger } from './logger';

export interface TimeSlot {
  id: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  available: boolean;
  patientId?: string;
  appointmentType: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  availableSlots: TimeSlot[];
  workingHours: {
    start: string; // HH:mm
    end: string; // HH:mm
    daysPerWeek: number;
  };
}

export class AdvancedSchedulingEngine {
  private doctors: Map<string, Doctor> = new Map();
  private appointments: Map<string, TimeSlot> = new Map();
  private waitlist: Array<{
    patientId: string;
    preferredDates: Date[];
    specialty: string;
    priority: number;
  }> = [];

  /**
   * Add doctor with availability
   */
  public addDoctor(doctor: Doctor): void {
    this.doctors.set(doctor.id, doctor);
    this.generateWeeklySlots(doctor);
    logger.log('Doctor added to scheduling system', {
      doctorId: doctor.id,
      specialty: doctor.specialty
    });
  }

  /**
   * Generate weekly time slots
   */
  private generateWeeklySlots(doctor: Doctor): void {
    const slots: TimeSlot[] = [];
    const slotDuration = 30; // minutes
    const startHour = parseInt(doctor.workingHours.start);
    const endHour = parseInt(doctor.workingHours.end);

    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);

      for (let hour = startHour; hour < endHour; hour += 1) {
        for (let min = 0; min < 60; min += slotDuration) {
          const startTime = new Date(date);
          startTime.setHours(hour, min, 0);

          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + slotDuration);

          slots.push({
            id: `slot_${doctor.id}_${startTime.getTime()}`,
            doctorId: doctor.id,
            startTime,
            endTime,
            available: true,
            appointmentType: 'consultation'
          });
        }
      }
    }

    doctor.availableSlots = slots;
  }

  /**
   * Find available slots
   */
  public findAvailableSlots(
    specialty: string,
    preferredDate: Date,
    duration: number = 30
  ): TimeSlot[] {
    const availableSlots: TimeSlot[] = [];

    this.doctors.forEach(doctor => {
      if (doctor.specialty === specialty) {
        doctor.availableSlots.forEach(slot => {
          // Check if date matches and slot is available
          if (
            slot.available &&
            slot.startTime.toDateString() ===
            preferredDate.toDateString()
          ) {
            availableSlots.push(slot);
          }
        });
      }
    });

    return availableSlots.sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );
  }

  /**
   * Book appointment with conflict detection
   */
  public async bookAppointment(
    patientId: string,
    slotId: string
  ): Promise<{ success: boolean; error?: string; appointmentId?: string }> {
    const slot = this.appointments.get(slotId) ||
      this.doctors
        .get('')
        ?.availableSlots.find(s => s.id === slotId);

    if (!slot) {
      return { success: false, error: 'Slot not found' };
    }

    if (!slot.available) {
      return {
        success: false,
        error: 'Slot is no longer available'
      };
    }

    // Check for patient double-booking
    const patientAppointments = Array.from(
      this.appointments.values()
    ).filter(a => a.patientId === patientId);

    for (const appointment of patientAppointments) {
      if (
        appointment.startTime.getTime() <
        slot.endTime.getTime() &&
        appointment.endTime.getTime() >
        slot.startTime.getTime()
      ) {
        return {
          success: false,
          error: 'Patient has conflicting appointment'
        };
      }
    }

    // Book the appointment
    slot.available = false;
    slot.patientId = patientId;
    this.appointments.set(slotId, slot);

    logger.log('Appointment booked successfully', {
      appointmentId: slotId,
      patientId,
      doctorId: slot.doctorId,
      time: slot.startTime
    });

    return { success: true, appointmentId: slotId };
  }

  /**
   * Intelligent waiting list management
   */
  public addToWaitlist(
    patientId: string,
    specialty: string,
    preferredDates: Date[]
  ): void {
    this.waitlist.push({
      patientId,
      preferredDates,
      specialty,
      priority: this.calculatePriority(patientId)
    });

    logger.log('Patient added to waitlist', {
      patientId,
      specialty,
      position: this.waitlist.length
    });
  }

  /**
   * Auto-book from waitlist when slot becomes available
   */
  public async autoBookFromWaitlist(slotId: string): Promise<void> {
    const slot = this.appointments.get(slotId);
    if (!slot) return;

    // Find matching waitlist entry
    const doctor = this.doctors.get(slot.doctorId);
    const matching = this.waitlist.find(
      w => w.specialty === doctor?.specialty &&
        w.preferredDates.some(
          d => d.toDateString() === slot.startTime.toDateString()
        )
    );

    if (matching) {
      await this.bookAppointment(matching.patientId, slotId);
      this.waitlist = this.waitlist.filter(
        w => w.patientId !== matching.patientId
      );
    }
  }

  private calculatePriority(patientId: string): number {
    // Mock implementation - could consider patient history, condition severity, etc.
    return Math.random() * 100;
  }

  /**
   * Get scheduling analytics
   */
  public getAnalytics(): {
    utilizationRate: number;
    averageWaitTime: number;
    totalAppointments: number;
    cancelledAppointments: number;
  } {
    const totalSlots = Array.from(this.doctors.values()).reduce(
      (sum, d) => sum + d.availableSlots.length,
      0
    );
    const bookedSlots = Array.from(this.appointments.values()).filter(
      a => !a.available
    ).length;

    return {
      utilizationRate: (bookedSlots / totalSlots) * 100,
      averageWaitTime: this.calculateAverageWaitTime(),
      totalAppointments: this.appointments.size,
      cancelledAppointments: 0
    };
  }

  private calculateAverageWaitTime(): number {
    if (this.waitlist.length === 0) return 0;
    // Mock calculation
    return 120; // minutes
  }
}

export const schedulingEngine = new AdvancedSchedulingEngine();
