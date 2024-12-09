/**
 * Middleware for authentication and authorization
 * Protects sensitive routes and validates requests
 */

import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_SESSION,
  ADMIN_SUBJECT,
  PATIENT_SESSION,
  patientSubject,
  verifySessionToken,
} from "./lib/session";

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/api/health",
  "/patients",
];

// Patient pages (/patients/<userId>/...): only the session of that patient may open them
const PATIENT_ROUTE = /^\/patients\/([^/]+)\/(register|new-appointment)(\/|$)/;

// Admin only routes
const ADMIN_ROUTES = [
  "/admin",
  "/api/appointments/list",
];

/**
 * Check if a route is admin only
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => {
    const pattern = new RegExp(`^${route.replace("[userId]", "[^/]+")}(/|$)`);
    return pattern.test(pathname);
  });
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Patient page - must carry a signed session for the patient in the URL
  // (set by signInPatient / verifyPatientCode)
  const patientId = PATIENT_ROUTE.exec(pathname)?.[1];
  if (
    patientId &&
    !(await verifySessionToken(
      request.cookies.get(PATIENT_SESSION.cookie)?.value,
      patientSubject(patientId),
      process.env.SESSION_SECRET
    ))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Admin route - must carry a valid signed admin session (set by verifyAdminPasskey)
  if (
    isAdminRoute(pathname) &&
    !(await verifySessionToken(
      request.cookies.get(ADMIN_SESSION.cookie)?.value,
      ADMIN_SUBJECT,
      process.env.SESSION_SECRET
    ))
  ) {
    return NextResponse.redirect(new URL("/?admin=true", request.url));
  }

  // Prevent access to sensitive paths
  if (
    pathname.includes("/.env") ||
    pathname.includes("/config") ||
    pathname.includes("/admin/api")
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

// Configure which routes to apply middleware to
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
