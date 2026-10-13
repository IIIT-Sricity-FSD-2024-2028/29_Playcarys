"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersRepository = void 0;
const common_1 = require("@nestjs/common");
const store_1 = require("../data/store");
let UsersRepository = class UsersRepository {
    findAll() {
        return [...store_1.users];
    }
    findById(user_id) {
        return store_1.users.find((u) => u.user_id === user_id);
    }
    findByRole(role_id) {
        return store_1.users.filter((u) => u.role_id === role_id);
    }
    findByEmail(email) {
        return store_1.users.find((u) => u.email === email);
    }
    findByEmailForRole(email, role_id, excludeUserId) {
        const target = String(email ?? '').trim().toLowerCase();
        if (!target)
            return undefined;
        return store_1.users.find((u) => String(u.email ?? '').trim().toLowerCase() === target &&
            u.role_id === role_id &&
            u.user_id !== excludeUserId);
    }
    create(user) {
        store_1.users.push(user);
        return user;
    }
    update(user_id, partial) {
        const idx = store_1.users.findIndex((u) => u.user_id === user_id);
        if (idx === -1)
            return undefined;
        Object.assign(store_1.users[idx], partial);
        return store_1.users[idx];
    }
    remove(user_id) {
        const idx = store_1.users.findIndex((u) => u.user_id === user_id);
        if (idx === -1)
            return false;
        store_1.users.splice(idx, 1);
        return true;
    }
    nextId() {
        return store_1.users.length === 0 ? 1 : Math.max(...store_1.users.map((u) => u.user_id)) + 1;
    }
    resolveRoleName(role_id) {
        return store_1.roles.find((r) => r.role_id === role_id)?.role_name ?? String(role_id);
    }
};
exports.UsersRepository = UsersRepository;
exports.UsersRepository = UsersRepository = __decorate([
    (0, common_1.Injectable)()
], UsersRepository);
//# sourceMappingURL=users.repository.js.map