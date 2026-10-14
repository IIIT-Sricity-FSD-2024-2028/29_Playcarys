/*
 * ============================================================
 * TEMPORARY DEVELOPMENT IDENTITIES CONFIGURATION
 * ============================================================
 *
 * IMPORTANT SECURITY AND ARCHITECTURAL NOTICE:
 * Real frontend authentication has not yet been connected to the UI.
 * For local development and testing, the Superuser and Moderator
 * pages require a real user identity from the live NestJS backend.
 *
 * These identities are verified from real records returned by:
 * GET http://localhost:3000/api/v1/users
 *
 * Do NOT use fictional usernames, fake IDs, or arbitrary mock roles.
 * Do NOT treat these identities as proof of authentication.
 * Do NOT use these temporary identities as a security boundary.
 *
 * ============================================================
 * TEMPORARY SUPERUSER IDENTITY
 * ============================================================
 * TEMPORARY DEVELOPMENT IDENTITY — AUTHENTICATION NOT CONNECTED.
 *
 * This identity is selected from an existing backend user solely to allow
 * Superuser pages to be developed and tested before real authentication
 * is integrated.
 *
 * Selected backend user ID: 0
 * Selected backend username: GodMode
 * Selected backend role: superuser (role_id: 1)
 * Selected backend email: godmode@playcarys.com
 * Verified against backend store: Yes (user_id: 0)
 *
 * FUTURE AUTHENTICATION INTEGRATION:
 * Remove this temporary identity selection and obtain the authenticated
 * user from the real authentication/session/token mechanism.
 *
 * Do not treat this temporary identity as proof of authentication.
 * Do not use it as a security boundary.
 *
 * ============================================================
 * TEMPORARY MODERATOR IDENTITY
 * ============================================================
 * TEMPORARY DEVELOPMENT IDENTITY — AUTHENTICATION NOT CONNECTED.
 *
 * This identity is selected from an existing backend user solely to allow
 * Moderator pages to be developed and tested before real authentication
 * is integrated.
 *
 * Selected backend user ID: 3
 * Selected backend username: ModeratorOne
 * Selected backend role: moderator (role_id: 3)
 * Selected backend email: mod1@example.com
 * Verified against backend store: Yes (user_id: 3)
 *
 * FUTURE AUTHENTICATION INTEGRATION:
 * Remove this temporary identity selection and obtain the authenticated
 * user from the real authentication/session/token mechanism.
 *
 * Do not treat this temporary identity as proof of authentication.
 * Do not use it as a security boundary.
 * ============================================================
 */

export const DEVELOPMENT_IDENTITIES = {
  superuser: {
    userId: 0,
    user_id: 0,
    id: '0',
    username: 'GodMode',
    user_name: 'GodMode',
    role: 'superuser',
    role_id: 1,
    role_name: 'superuser',
    email: 'godmode@playcarys.com',
    avatar: 'GM',
    status: 'active',
    isDev: true,
    // Backend mints session tokens at /api/v1/auth/login.
    // In dev mode, a verified token allows accessing staff-guarded endpoints
    // (such as /economy/platform, /users/:id/status, /games/:id/approve).
    sessionToken: '99963c28-6ad2-4d3f-a12c-2967a194e9f0',
    apiToken: 'eyJzdWIiOjAsInJvbGVfaWQiOjEsInJvbGUiOiJzdXBlcnVzZXIiLCJpYXQiOjE3OTIwMDY3NzA5NDUsImV4cCI6MTc5MjA0OTk3MDk0NX0.IYD8MZ9IIMePynJQ4cJ2qSJ0PdBbPMqJQefjbF7XR9w'
  },

  moderator: {
    userId: 3,
    user_id: 3,
    id: '3',
    username: 'ModeratorOne',
    user_name: 'ModeratorOne',
    role: 'moderator',
    role_id: 3,
    role_name: 'moderator',
    email: 'mod1@example.com',
    avatar: 'M1',
    status: 'active',
    isDev: true,
    // Backend-minted session token for ModeratorOne from /api/v1/auth/login
    sessionToken: '3374098b-6303-4669-a04f-fc0fa99a642c',
    apiToken: 'eyJzdWIiOjMsInJvbGVfaWQiOjMsInJvbGUiOiJtb2RlcmF0b3IiLCJpYXQiOjE3OTIwMDY3NzczNzEsImV4cCI6MTc5MjA0OTk3NzM3MX0.ZFOl6h5tXzJECgUSJNJTsZIBGjQFc3vw3HdoGP4WnyE'
  }
};

/**
 * Returns the temporary development identity for a specified role.
 * Only intended for development mode before real authentication is connected.
 *
 * @param {'superuser' | 'moderator'} role
 * @returns {object|null}
 */
export function getDevelopmentIdentity(role) {
  const normalized = (role || '').toLowerCase();
  return DEVELOPMENT_IDENTITIES[normalized] || null;
}

export default DEVELOPMENT_IDENTITIES;
