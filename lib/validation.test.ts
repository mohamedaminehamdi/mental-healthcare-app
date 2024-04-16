import { describe, expect, it } from "vitest";

import {
  CancelAppointmentSchema,
  CreateAppointmentSchema,
  PatientFormValidation,
  UserFormValidation,
} from "./validation";

const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

describe("UserFormValidation", () => {
  it("normalises a valid user", () => {
    const result = UserFormValidation.parse({
      name: "  Jane Doe ",
      email: "JANE@Example.com",
      phone: "+14155552671",
    });

    expect(result).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "+14155552671",
    });
  });

  it("rejects a short name, a bad email and a bad phone number", () => {
    const result = UserFormValidation.safeParse({
      name: "J",
      email: "nope",
      phone: "555",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      "name",
      "email",
      "phone",
    ]);
  });

  it("strips markup from free text", () => {
    const result = UserFormValidation.parse({
      name: "<b>Jane</b>",
      email: "jane@example.com",
      phone: "+14155552671",
    });

    expect(result.name).toBe("bJane/b");
  });
});

describe("appointment schemas", () => {
  it("requires a future date when creating", () => {
    const result = CreateAppointmentSchema.safeParse({
      primaryPhysician: "John Green",
      schedule: new Date("2020-01-01"),
      reason: "Annual check-up",
      note: "Mornings please",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Appointment date must be in the future"
    );
  });

  it("coerces the schedule to a Date", () => {
    const result = CreateAppointmentSchema.parse({
      primaryPhysician: "John Green",
      schedule: tomorrow().toISOString(),
      reason: "Annual check-up",
      note: "Mornings please",
    });

    expect(result.schedule).toBeInstanceOf(Date);
  });

  it("requires a cancellation reason when cancelling", () => {
    const result = CancelAppointmentSchema.safeParse({
      primaryPhysician: "John Green",
      schedule: tomorrow(),
      cancellationReason: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("optional fields", () => {
  it("accepts an appointment without a note", () => {
    const result = CreateAppointmentSchema.safeParse({
      primaryPhysician: "John Green",
      schedule: tomorrow(),
      reason: "Annual check-up",
      note: "",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a registration with the optional medical fields left blank", () => {
    const result = PatientFormValidation.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "+14155552671",
      birthDate: new Date("1990-05-17"),
      gender: "Female",
      address: "14 Main Street, Springfield",
      occupation: "Teacher",
      emergencyContactName: "John Doe",
      emergencyContactNumber: "+14155552672",
      primaryPhysician: "Leila Cameron",
      insuranceProvider: "BlueCross",
      insurancePolicyNumber: "ABC123456",
      allergies: "",
      currentMedication: "",
      familyMedicalHistory: "",
      pastMedicalHistory: "",
      identificationType: "Passport",
      identificationNumber: "",
      identificationDocument: [],
      treatmentConsent: true,
      disclosureConsent: true,
      privacyConsent: true,
    });

    expect(result.error?.issues).toBeUndefined();
  });
});
