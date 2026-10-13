"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesRepository = void 0;
const common_1 = require("@nestjs/common");
const store_1 = require("../data/store");
let RolesRepository = class RolesRepository {
    findAll() {
        return [...store_1.roles];
    }
    findById(role_id) {
        return store_1.roles.find((r) => r.role_id === role_id);
    }
    findByName(role_name) {
        return store_1.roles.find((r) => r.role_name === role_name);
    }
};
exports.RolesRepository = RolesRepository;
exports.RolesRepository = RolesRepository = __decorate([
    (0, common_1.Injectable)()
], RolesRepository);
//# sourceMappingURL=roles.repository.js.map