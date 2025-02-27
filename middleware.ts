/**
 * Middleware for authentication and authorization
 * Protects sensitive routes and validates requests
 */

import { NextRequest, NextResponse } from "next/server";

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/api/health",
  "/patients",
];

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/admin",
  "/api/appointments",
  "/patients/[userId]/register",
  "/patients/[userId]/new-appointment",
];

// Admin only routes
const ADMIN_ROUTES = [
  "/admin",
  "/api/appointments/list",
];

/**
 * Check if a route requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => {
    const pattern = new RegExp(`^${route.replace("[userId]", "[^/]+")}(/|$)`);
    return pattern.test(pathname);
  });
}

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
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for session/auth token
  const authToken = request.cookies.get("authToken")?.value;
  const userRole = request.cookies.get("userRole")?.value;

  // Protected route - must have auth token
  if (isProtectedRoute(pathname) && !authToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Admin route - must have admin role
  if (isAdminRoute(pathname) && userRole !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
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
