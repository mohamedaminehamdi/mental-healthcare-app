import * as sdk from "node-appwrite";
import { getEnvConfig } from "./env.config";

// Get environment configuration with validation
const {
  endpoint,
  projectId,
  databaseId,
  patientCollectionId,
  doctorCollectionId,
  appointmentCollectionId,
  bucketId,
} = getEnvConfig();

// Server-side client - should only be used in Server Components and Server Actions
const client = new sdk.Client();

// Only set API key on server side
if (typeof window === "undefined" && process.env.API_KEY) {
  client
    .setEndpoint(endpoint!)
    .setProject(projectId!)
    .setKey(process.env.API_KEY); // Never expose API_KEY to client
} else if (typeof window === "undefined") {
  console.warn("API_KEY not configured for server-side operations");
}

// Export configuration - use these constants throughout the app
export const APPWRITE_CONFIG = {
  endpoint,
  projectId,
  databaseId,
  patientCollectionId,
  doctorCollectionId,
  appointmentCollectionId,
  bucketId,
};

// Export Appwrite SDK instances
export const databases = new sdk.Databases(client);
export const users = new sdk.Users(client);
export const messaging = new sdk.Messaging(client);
export const storage = new sdk.Storage(client);

// Deprecated exports for backwards compatibility
export const {
  NEXT_PUBLIC_ENDPOINT: ENDPOINT,
  PROJECT_ID,
  DATABASE_ID,
  PATIENT_COLLECTION_ID,
  DOCTOR_COLLECTION_ID,
  APPOINTMENT_COLLECTION_ID,
  NEXT_PUBLIC_BUCKET_ID: BUCKET_ID,
} = process.env;

