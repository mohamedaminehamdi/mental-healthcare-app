/**
 * Environment validation and configuration
 * Ensures all required environment variables are present and valid
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_ENDPOINT',
  'PROJECT_ID',
  'DATABASE_ID',
  'PATIENT_COLLECTION_ID',
  'DOCTOR_COLLECTION_ID',
  'APPOINTMENT_COLLECTION_ID',
  'NEXT_PUBLIC_BUCKET_ID',
];

// Validate environment variables at build time
function validateEnvironment() {
  const missing: string[] = [];
  
  requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `Please check your .env.local file.`
    );
  }

  // Warn if running in production without secure environment
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.API_KEY) {
      throw new Error(
        'API_KEY environment variable is required in production'
      );
    }
  }
}

// Only validate on server side
if (typeof window === 'undefined') {
  validateEnvironment();
}

export const getEnvConfig = () => {
  return {
    endpoint: process.env.NEXT_PUBLIC_ENDPOINT,
    projectId: process.env.PROJECT_ID,
    databaseId: process.env.DATABASE_ID,
    patientCollectionId: process.env.PATIENT_COLLECTION_ID,
    doctorCollectionId: process.env.DOCTOR_COLLECTION_ID,
    appointmentCollectionId: process.env.APPOINTMENT_COLLECTION_ID,
    bucketId: process.env.NEXT_PUBLIC_BUCKET_ID,
  };
};
