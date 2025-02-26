/**
 * Server-side Appwrite utilities
 * This file should only be used in Server Components and Server Actions
 */

import * as sdk from "node-appwrite";
import { APPWRITE_CONFIG } from "./appwrite.config";

// Create server-side client with API key
function getServerClient(): sdk.Client {
  if (typeof window !== "undefined") {
    throw new Error(
      "getServerClient() can only be called on the server side"
    );
  }

  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
  }

  const client = new sdk.Client();
  client
    .setEndpoint(APPWRITE_CONFIG.endpoint!)
    .setProject(APPWRITE_CONFIG.projectId!)
    .setKey(process.env.API_KEY);

  return client;
}

// Create cached server-side instances
let serverDatabases: sdk.Databases | null = null;
let serverUsers: sdk.Users | null = null;
let serverMessaging: sdk.Messaging | null = null;
let serverStorage: sdk.Storage | null = null;

export function getServerDatabases(): sdk.Databases {
  if (!serverDatabases) {
    const client = getServerClient();
    serverDatabases = new sdk.Databases(client);
  }
  return serverDatabases;
}

export function getServerUsers(): sdk.Users {
  if (!serverUsers) {
    const client = getServerClient();
    serverUsers = new sdk.Users(client);
  }
  return serverUsers;
}

export function getServerMessaging(): sdk.Messaging {
  if (!serverMessaging) {
    const client = getServerClient();
    serverMessaging = new sdk.Messaging(client);
  }
  return serverMessaging;
}

export function getServerStorage(): sdk.Storage {
  if (!serverStorage) {
    const client = getServerClient();
    serverStorage = new sdk.Storage(client);
  }
  return serverStorage;
}
