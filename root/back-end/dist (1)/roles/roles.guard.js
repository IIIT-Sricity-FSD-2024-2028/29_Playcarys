"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const roles_decorator_1 = require("./roles.decorator");
const token_util_1 = require("../auth/token.util");
const PRIVILEGED = new Set(['superuser', 'admin', 'moderator']);
let RolesGuard = class RolesGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(roles_decorator_1.ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const payload = (0, token_util_1.verifyToken)((0, token_util_1.bearerFrom)(request.headers['authorization']));
        if (payload) {
            request.auth = payload;
            const role = String(payload.role).toLowerCase();
            if (role === 'superuser')
                return true;
            if (requiredRoles.some((r) => r.toLowerCase() === role))
                return true;
            throw new common_1.ForbiddenException(`Access Denied: Requires one of these roles - [${requiredRoles.join(', ')}]`);
        }
        const roleHeader = request.headers['role'];
        if (!roleHeader) {
            throw new common_1.ForbiddenException('Access Denied: sign in to continue.');
        }
        const incomingRole = String(roleHeader).toLowerCase();
        if (PRIVILEGED.has(incomingRole)) {
            throw new common_1.ForbiddenException('Access Denied: staff access requires a signed session. Sign in again to continue.');
        }
        const hasRole = requiredRoles.some((role) => role.toLowerCase() === incomingRole);
        if (!hasRole) {
            throw new common_1.ForbiddenException(`Access Denied: Requires one of these roles - [${requiredRoles.join(', ')}]`);
        }
        return true;
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RolesGuard);
//# sourceMappingURL=roles.guard.js.map