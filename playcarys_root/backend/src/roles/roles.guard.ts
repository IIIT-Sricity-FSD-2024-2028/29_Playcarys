import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

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
    // Retrieve role from the custom header 'role'
    const roleHeader = request.headers['role'];
    
    if (!roleHeader) {
      throw new ForbiddenException('Access Denied: Role header is missing.');
    }

    const incomingRole = roleHeader.toLowerCase();

    // GodMode / Superuser always has access to everything
    if (incomingRole === 'superuser') {
       return true;
    }

    const hasRole = requiredRoles.some((role) => role.toLowerCase() === incomingRole);
    if (!hasRole) {
      throw new ForbiddenException(`Access Denied: Requires one of these roles - [${requiredRoles.join(', ')}]`);
    }

    return true;
  }
}
