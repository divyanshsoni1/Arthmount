/**
 * Central role-based routing.
 *
 * Single source of truth for every "go to dashboard" redirect in the app.
 * Import and call getDashboardRoute(role) instead of hardcoding "/dashboard".
 */

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

/**
 * Returns the correct dashboard route for a given role.
 * Works in both server (proxy) and client contexts.
 */
export function getDashboardRoute(role: string): string {
  return ADMIN_ROLES.has(role) ? "/admin" : "/dashboard";
}

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.has(role);
}
