"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ID, InputFile, Query } from "node-appwrite";

import {
  BUCKET_ID,
  DATABASE_ID,
  ENDPOINT,
  PATIENT_COLLECTION_ID,
  PROJECT_ID,
  account,
  databases,
  storage,
  users,
} from "../appwrite.config";
import { endPatientSession, requirePatient, startPatientSession } from "../auth";
import {
  getFileConfigForType,
  matchesFileSignature,
  validateFile,
} from "../file-validation";
import { checkRateLimit } from "../rate-limit";
import { parseStringify } from "../utils";

// ponytail: in-memory limits are per server instance; use a shared store (Redis) if you scale out
const CODE_SEND_LIMIT = { windowMs: 15 * 60 * 1000, maxRequests: 3 };
const CODE_VERIFY_LIMIT = { windowMs: 15 * 60 * 1000, maxRequests: 5 };

const withinLimit = async (
  key: string,
  limit: { windowMs: number; maxRequests: number }
) => {
  const request = new Request("http://internal", { headers: await headers() });
  return checkRateLimit(request, { ...limit, keyGenerator: () => key }).allowed;
};

type SignInResult =
  | { status: "signed-in"; userId: string }
  | { status: "verify"; userId: string }
  | { status: "error"; error: string };

// SIGN IN OR SIGN UP
// New patients are signed in as soon as their account exists. Existing accounts
// must confirm a code that Appwrite emails them, so knowing an email isn't enough.
export const signInPatient = async (
  user: CreateUserParams
): Promise<SignInResult> => {
  try {
    // https://appwrite.io/docs/references/1.5.x/server-nodejs/users#create
    const newUser = await users.create(
      ID.unique(),
      user.email,
      user.phone,
      undefined,
      user.name
    );
    await startPatientSession(newUser.$id);
    return { status: "signed-in", userId: newUser.$id };
  } catch (error: any) {
    if (error?.code !== 409) {
      console.error("An error occurred while creating a new user:", error);
      return { status: "error", error: "Something went wrong. Please try again." };
    }
  }

  // 409: the email or the phone number is already registered
  try {
    const existing = await users.list([Query.equal("email", [user.email])]);
    const existingUser = existing.users[0];
    if (!existingUser) {
      return {
        status: "error",
        error: "This phone number is already registered with another email.",
      };
    }

    if (!(await withinLimit(`code-send:${existingUser.$id}`, CODE_SEND_LIMIT))) {
      return {
        status: "error",
        error: "Too many codes requested. Please wait a few minutes.",
      };
    }

    // Emails the account a 6-digit code (valid for 15 minutes)
    await account.createEmailToken(existingUser.$id, user.email);
    return { status: "verify", userId: existingUser.$id };
  } catch (error) {
    console.error("An error occurred while sending a sign-in code:", error);
    return {
      status: "error",
      error: "We couldn't send a sign-in code. Please try again.",
    };
  }
};

// VERIFY EMAILED CODE
export const verifyPatientCode = async (
  userId: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (!(await withinLimit(`code-verify:${userId}`, CODE_VERIFY_LIMIT))) {
    return {
      ok: false,
      error: "Too many attempts. Please request a new code later.",
    };
  }

  try {
    const session = await account.createSession(userId, code);
    // Only the check matters: the app uses its own cookie, so drop Appwrite's session
    await users.deleteSession(userId, session.$id);
  } catch {
    return { ok: false, error: "That code is invalid or has expired." };
  }

  await startPatientSession(userId);
  return { ok: true };
};

// SIGN OUT
export const signOutPatient = async () => {
  await endPatientSession();
  redirect("/");
};

// GET USER
export const getUser = async (userId: string) => {
  try {
    await requirePatient(userId);
    const user = await users.get(userId);

    return parseStringify(user);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the user details:",
      error
    );
  }
};

// REGISTER PATIENT
export const registerPatient = async ({
  identificationDocument,
  ...patient
}: RegisterUserParams) => {
  try {
    await requirePatient(patient.userId);

    // Upload file ->  // https://appwrite.io/docs/references/cloud/client-web/storage#createFile
    let file;
    if (identificationDocument) {
      const blob = identificationDocument.get("blobFile") as Blob;
      const fileName = identificationDocument.get("fileName") as string;

      // The uploader restricts type and size in the browser; enforce it here too
      const { valid, error } = validateFile(
        new File([blob], fileName, { type: blob.type }),
        getFileConfigForType("identification")
      );
      if (!valid) throw new Error(error);
      if (!(await matchesFileSignature(blob))) {
        throw new Error("File content does not match its type");
      }

      file = await storage.createFile(
        BUCKET_ID!,
        ID.unique(),
        InputFile.fromBlob(blob, fileName)
      );
    }

    // Create new patient document -> https://appwrite.io/docs/references/cloud/server-nodejs/databases#createDocument
    const newPatient = await databases.createDocument(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      ID.unique(),
      {
        identificationDocumentId: file?.$id ? file.$id : null,
        identificationDocumentUrl: file?.$id
          ? `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${PROJECT_ID}`
          : null,
        ...patient,
      }
    );

    return parseStringify(newPatient);
  } catch (error) {
    console.error("An error occurred while creating a new patient:", error);
  }
};

// GET PATIENT
export const getPatient = async (userId: string) => {
  try {
    await requirePatient(userId);
    const patients = await databases.listDocuments(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      [Query.equal("userId", [userId])]
    );

    return parseStringify(patients.documents[0]);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the patient details:",
      error
    );
  }
};
