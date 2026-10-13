import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { bearerFrom, verifyToken } from '../auth/token.util';

/**
 * Roles that can act on other people's data or on the platform itself.
 *
 * These may ONLY be granted by a signed token. The `role` header is written by
 * the caller, so honouring it for these was the whole vulnerability: a player
 * account was escalated to superuser with nothing but
 * `curl -H 'role: admin' -X PATCH /users/9 -d '{"role_id":1}'`.
 */
const PRIVILEGED = new Set(['superuser', 'admin', 'moderator']);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // ── 1. A signed token is authoritative ────────────────────
    // The role comes from a payload this server signed at login, so it cannot
    // be chosen by the caller. Attached to the request so handlers can use the
    // verified identity instead of trusting a body field.
    const payload = verifyToken(bearerFrom(request.headers['authorization']));
    if (payload) {
      request.auth = payload;
      const role = String(payload.role).toLowerCase();
      if (role === 'superuser') return true;
      if (requiredRoles.some((r) => r.toLowerCase() === role)) return true;
      throw new ForbiddenException(
        `Access Denied: Requires one of these roles - [${requiredRoles.join(', ')}]`,
      );
    }

    // ── 2. No token: the legacy header, for non-privileged roles only ──
    // Player and publisher pages still authenticate client-side and have not
    // been migrated, so their header is accepted to keep the app working. It
    // grants nothing that can reach another user's account or platform state.
    const roleHeader = request.headers['role'];
    if (!roleHeader) {
      throw new ForbiddenException('Access Denied: sign in to continue.');
    }

    const incomingRole = String(roleHeader).toLowerCase();

    if (PRIVILEGED.has(incomingRole)) {
      throw new ForbiddenException(
        'Access Denied: staff access requires a signed session. Sign in again to continue.',
      );
    }

    const hasRole = requiredRoles.some((role) => role.toLowerCase() === incomingRole);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access Denied: Requires one of these roles - [${requiredRoles.join(', ')}]`,
      );
    }

    // A claimed player/publisher role can still only reach endpoints that ask
    // for exactly that, and never a privileged one — PRIVILEGED is checked
    // above regardless of what the route requires.
    return true;
  }
}
