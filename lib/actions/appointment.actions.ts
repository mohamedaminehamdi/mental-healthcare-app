"use server";

import { revalidatePath } from "next/cache";
import { ID, Query } from "node-appwrite";

import type { Appointment } from "@/types/appwrite.types";

import {
  APPOINTMENT_COLLECTION_ID,
  DATABASE_ID,
  PATIENT_COLLECTION_ID,
  databases,
  messaging,
} from "../appwrite.config";
import { requireAdmin, requirePatient, requirePatientOrAdmin } from "../auth";
import { formatDateTime, parseStringify } from "../utils";

//  CREATE APPOINTMENT
export const createAppointment = async (
  appointment: CreateAppointmentParams
) => {
  try {
    await requirePatient(appointment.userId);

    // Link the caller's own patient record rather than trusting the client's id
    const { documents } = await databases.listDocuments(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      [Query.equal("userId", [appointment.userId])]
    );
    if (!documents[0]) throw new Error("Patient is not registered");

    const newAppointment = await databases.createDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      ID.unique(),
      { ...appointment, patient: documents[0].$id }
    );

    revalidatePath("/admin");
    return parseStringify(newAppointment);
  } catch (error) {
    console.error("An error occurred while creating a new appointment:", error);
  }
};

//  GET RECENT APPOINTMENTS
export const getRecentAppointmentList = async () => {
  try {
    await requireAdmin();

    // Count each status with its own query: listDocuments returns 25 documents
    // by default, so counting the returned page under-reported busy clinics.
    const countByStatus = (status: Status) =>
      databases
        .listDocuments(DATABASE_ID!, APPOINTMENT_COLLECTION_ID!, [
          Query.equal("status", [status]),
          Query.limit(1),
        ])
        .then((result) => result.total);

    const [appointments, scheduledCount, pendingCount, cancelledCount] =
      await Promise.all([
        databases.listDocuments(DATABASE_ID!, APPOINTMENT_COLLECTION_ID!, [
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ]),
        countByStatus("scheduled"),
        countByStatus("pending"),
        countByStatus("cancelled"),
      ]);

    return parseStringify({
      totalCount: appointments.total,
      scheduledCount,
      pendingCount,
      cancelledCount,
      documents: appointments.documents,
    });
  } catch (error) {
    console.error(
      "An error occurred while retrieving the recent appointments:",
      error
    );
  }
};

//  SEND SMS NOTIFICATION
// Not exported: an exported function in a "use server" file is a public endpoint
const sendSMSNotification = async (userId: string, content: string) => {
  try {
    // https://appwrite.io/docs/references/1.5.x/server-nodejs/messaging#createSms
    const message = await messaging.createSms(
      ID.unique(),
      content,
      [],
      [userId]
    );
    return parseStringify(message);
  } catch (error) {
    console.error("An error occurred while sending sms:", error);
  }
};

//  UPDATE APPOINTMENT
export const updateAppointment = async ({
  appointmentId,
  timeZone,
  appointment,
  type,
}: UpdateAppointmentParams) => {
  try {
    await requireAdmin();

    // Update appointment to scheduled -> https://appwrite.io/docs/references/cloud/server-nodejs/databases#updateDocument
    const updatedAppointment = await databases.updateDocument<Appointment>(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId,
      appointment
    );

    if (!updatedAppointment) throw Error;

    const smsMessage = `Greetings from ThearapyAI. ${type === "schedule" ? `Your appointment is confirmed for ${formatDateTime(appointment.schedule!, timeZone).dateTime} with Dr. ${appointment.primaryPhysician}` : `We regret to inform that your appointment for ${formatDateTime(appointment.schedule!, timeZone).dateTime} is cancelled. Reason: ${appointment.cancellationReason}`}.`;
    // Text the appointment's owner, not a user id supplied by the client
    await sendSMSNotification(updatedAppointment.userId, smsMessage);

    revalidatePath("/admin");
    return parseStringify(updatedAppointment);
  } catch (error) {
    console.error("An error occurred while scheduling an appointment:", error);
  }
};

// GET APPOINTMENT
export const getAppointment = async (appointmentId: string) => {
  try {
    const appointment = await databases.getDocument<Appointment>(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId
    );
    await requirePatientOrAdmin(appointment.userId);

    return parseStringify(appointment);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the existing patient:",
      error
    );
  }
};
