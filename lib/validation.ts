import { z } from "zod";
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeDate,
} from "./sanitization";

// Custom string schema with sanitization
const sanitizedString = (minLen?: number, maxLen?: number) =>
  z
    .string()
    .trim()
    .min(minLen || 1, `Must be at least ${minLen || 1} character(s)`)
    .max(maxLen || 500, `Must be at most ${maxLen || 500} characters`)
    .transform((val) => sanitizeString(val, maxLen || 500));

// Custom email schema with sanitization
const sanitizedEmail = z
  .string()
  .email("Invalid email address")
  .transform(sanitizeEmail);

// Custom phone schema
const sanitizedPhone = z
  .string()
  .refine((phone) => /^\+\d{10,15}$/.test(phone), "Invalid phone number")
  .transform(sanitizePhoneNumber);

export const UserFormValidation = z.object({
  name: sanitizedString(2, 50),
  email: sanitizedEmail,
  phone: sanitizedPhone,
});

export const PatientFormValidation = z.object({
  name: sanitizedString(2, 50),
  email: sanitizedEmail,
  phone: sanitizedPhone,
  birthDate: z.coerce.date().refine(
    (date) => date < new Date(),
    "Birth date must be in the past"
  ),
  gender: z.enum(["Male", "Female", "Other"]),
  address: sanitizedString(5, 500),
  occupation: sanitizedString(2, 500),
  emergencyContactName: sanitizedString(2, 50),
  emergencyContactNumber: sanitizedPhone,
  primaryPhysician: sanitizedString(2, 100),
  insuranceProvider: sanitizedString(2, 50),
  insurancePolicyNumber: sanitizedString(2, 50),
  allergies: sanitizedString(0, 500).optional(),
  currentMedication: sanitizedString(0, 500).optional(),
  familyMedicalHistory: sanitizedString(0, 500).optional(),
  pastMedicalHistory: sanitizedString(0, 500).optional(),
  identificationType: sanitizedString(0, 50).optional(),
  identificationNumber: sanitizedString(0, 100).optional(),
  identificationDocument: z.custom<File[]>().optional(),
  treatmentConsent: z
    .boolean()
    .refine((value) => value === true, {
      message: "You must consent to treatment in order to proceed",
    }),
  disclosureConsent: z
    .boolean()
    .refine((value) => value === true, {
      message: "You must consent to disclosure in order to proceed",
    }),
  privacyConsent: z
    .boolean()
    .refine((value) => value === true, {
      message: "You must consent to privacy in order to proceed",
    }),
});

export const CreateAppointmentSchema = z.object({
  primaryPhysician: sanitizedString(2, 100),
  schedule: z.coerce.date().refine(
    (date) => date > new Date(),
    "Appointment date must be in the future"
  ),
  reason: sanitizedString(2, 500),
  note: sanitizedString(0, 1000).optional(),
  cancellationReason: sanitizedString(0, 500).optional(),
});

export const ScheduleAppointmentSchema = z.object({
  primaryPhysician: sanitizedString(2, 100),
  schedule: z.coerce.date(),
  reason: sanitizedString(0, 500).optional(),
  note: sanitizedString(0, 1000).optional(),
  cancellationReason: sanitizedString(0, 500).optional(),
});

export const CancelAppointmentSchema = z.object({
  primaryPhysician: sanitizedString(2, 100),
  schedule: z.coerce.date(),
  reason: sanitizedString(0, 500).optional(),
  note: sanitizedString(0, 1000).optional(),
  cancellationReason: sanitizedString(2, 500),
});

export function getAppointmentSchema(type: string) {
  switch (type) {
    case "create":
      return CreateAppointmentSchema;
    case "cancel":
      return CancelAppointmentSchema;
    default:
      return ScheduleAppointmentSchema;
  }
}
