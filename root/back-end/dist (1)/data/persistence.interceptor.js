"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersistenceInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const persistence_1 = require("./persistence");
const broadcast_1 = require("./broadcast");
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SILENT_PATHS = [/\/auth\/heartbeat$/, /\/auth\/release$/];
let PersistenceInterceptor = class PersistenceInterceptor {
    intercept(context, next) {
        if (context.getType() !== 'http')
            return next.handle();
        const req = context.switchToHttp().getRequest();
        const method = req?.method;
        if (!MUTATING.has(String(method || '').toUpperCase()))
            return next.handle();
        const path = String(req?.originalUrl || req?.url || '').split('?')[0];
        const silent = SILENT_PATHS.some((re) => re.test(path));
        return next.handle().pipe((0, operators_1.tap)(() => {
            (0, persistence_1.scheduleSave)();
            if (!silent)
                (0, broadcast_1.broadcastStateChanged)();
        }));
    }
};
exports.PersistenceInterceptor = PersistenceInterceptor;
exports.PersistenceInterceptor = PersistenceInterceptor = __decorate([
    (0, common_1.Injectable)()
], PersistenceInterceptor);
//# sourceMappingURL=persistence.interceptor.js.map