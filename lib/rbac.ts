/**
 * Role-Based Access Control (RBAC) utilities
 */

export type UserRole = "admin" | "doctor" | "patient" | "staff";

export interface Permission {
  resource: string;
  action: string;
}

export interface Role {
  name: UserRole;
  permissions: Permission[];
  description: string;
}

/**
 * Role definitions with associated permissions
 */
export const ROLES: Record<UserRole, Role> = {
  admin: {
    name: "admin",
    description: "Administrator with full access",
    permissions: [
      { resource: "users", action: "*" },
      { resource: "appointments", action: "*" },
      { resource: "reports", action: "*" },
      { resource: "settings", action: "*" },
      { resource: "audit_logs", action: "read" },
    ],
  },
  doctor: {
    name: "doctor",
    description: "Doctor with patient and appointment access",
    permissions: [
      { resource: "patients", action: "read" },
      { resource: "patients", action: "update" },
      { resource: "appointments", action: "read" },
      { resource: "appointments", action: "update" },
      { resource: "appointments", action: "cancel" },
      { resource: "medical_records", action: "read" },
      { resource: "medical_records", action: "write" },
    ],
  },
  patient: {
    name: "patient",
    description: "Patient with limited access to own records",
    permissions: [
      { resource: "profile", action: "read" },
      { resource: "profile", action: "update" },
      { resource: "appointments", action: "read" },
      { resource: "appointments", action: "create" },
      { resource: "appointments", action: "cancel" },
      { resource: "medical_records", action: "read" },
    ],
  },
  staff: {
    name: "staff",
    description: "Staff with appointment and scheduling access",
    permissions: [
      { resource: "patients", action: "read" },
      { resource: "appointments", action: "read" },
      { resource: "appointments", action: "create" },
      { resource: "appointments", action: "update" },
      { resource: "appointments", action: "cancel" },
    ],
  },
};

/**
 * Check if user has permission
 */
export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: string
): boolean {
  const role = ROLES[userRole];

  if (!role) {
    return false;
  }

  return role.permissions.some((perm) => {
    // Check resource match
    if (perm.resource !== resource && perm.resource !== "*") {
      return false;
    }

    // Check action match
    if (perm.action !== action && perm.action !== "*") {
      return false;
    }

    return true;
  });
}

/**
 * Require permission middleware
 */
export function requirePermission(
  userRole: UserRole | undefined,
  resource: string,
  action: string
): boolean {
  if (!userRole || !(userRole in ROLES)) {
    return false;
  }

  return hasPermission(userRole, resource, action);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLES[role]?.permissions || [];
}

/**
 * Check if role can access resource
 */
export function canAccessResource(
  userRole: UserRole,
  resource: string
): boolean {
  const role = ROLES[userRole];

  if (!role) {
    return false;
  }

  return role.permissions.some(
    (perm) => perm.resource === resource || perm.resource === "*"
  );
}

/**
 * Filter data based on user role
 */
export function filterDataByRole<T extends Record<string, any>>(
  data: T[],
  userRole: UserRole,
  resource: string
): T[] {
  // Patient can only see their own data
  if (userRole === "patient") {
    // This would need to be customized based on your data structure
    // Example: filter by userId matching current user
    return data;
  }

  // Staff can see limited data
  if (userRole === "staff") {
    // Remove sensitive fields
    return data.map((item) => {
      const filtered = { ...item };
      delete filtered.medicalHistory;
      delete filtered.sensitiveInfo;
      return filtered;
    });
  }

  // Doctors and admins can see all
  return data;
}

/**
 * Validate access before operation
 */
export function validateAccess(
  userRole: UserRole | undefined,
  resource: string,
  action: string,
  targetUserId?: string,
  currentUserId?: string
): { allowed: boolean; reason?: string } {
  // User must be authenticated
  if (!userRole) {
    return { allowed: false, reason: "User not authenticated" };
  }

  // Check role-based permission
  if (!hasPermission(userRole, resource, action)) {
    return {
      allowed: false,
      reason: `User role '${userRole}' does not have permission to ${action} ${resource}`,
    };
  }

  // Patient can only access their own data
  if (userRole === "patient" && targetUserId && currentUserId) {
    if (targetUserId !== currentUserId) {
      return {
        allowed: false,
        reason: "Patients can only access their own data",
      };
    }
  }

  return { allowed: true };
}
