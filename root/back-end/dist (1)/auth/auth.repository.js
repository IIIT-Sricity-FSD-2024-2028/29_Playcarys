"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
const common_1 = require("@nestjs/common");
const store_1 = require("../data/store");
let AuthRepository = class AuthRepository {
    findByEmail(email) {
        return store_1.users.find((u) => u.email === email);
    }
    findAllByEmail(email) {
        const target = String(email ?? '').trim().toLowerCase();
        if (!target)
            return [];
        return store_1.users.filter((u) => String(u.email ?? '').trim().toLowerCase() === target);
    }
    findByUsername(username) {
        return store_1.users.find((u) => u.user_name === username);
    }
    findById(user_id) {
        return store_1.users.find((u) => u.user_id === user_id);
    }
    create(user) {
        store_1.users.push(user);
        return user;
    }
    updateLastSeen(user_id) {
        const user = store_1.users.find((u) => u.user_id === user_id);
        if (user)
            user.lastSeen = new Date().toISOString().split('T')[0];
    }
    emailExists(email) {
        return store_1.users.some((u) => u.email === email);
    }
    emailExistsForRole(email, role_id) {
        const target = String(email ?? '').trim().toLowerCase();
        if (!target)
            return false;
        return store_1.users.some((u) => String(u.email ?? '').trim().toLowerCase() === target && u.role_id === role_id);
    }
    nextId() {
        return store_1.users.length === 0 ? 1 : Math.max(...store_1.users.map((u) => u.user_id)) + 1;
    }
};
exports.AuthRepository = AuthRepository;
exports.AuthRepository = AuthRepository = __decorate([
    (0, common_1.Injectable)()
], AuthRepository);
//# sourceMappingURL=auth.repository.js.map