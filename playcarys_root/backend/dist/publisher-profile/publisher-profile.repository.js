"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublisherProfileRepository = void 0;
const common_1 = require("@nestjs/common");
const store_1 = require("../data/store");
let PublisherProfileRepository = class PublisherProfileRepository {
    findAll() {
        return [...store_1.publisher_profiles];
    }
    findByUserId(user_id) {
        return store_1.publisher_profiles.find((p) => p.user_id === user_id);
    }
    update(user_id, partial) {
        const idx = store_1.publisher_profiles.findIndex((p) => p.user_id === user_id);
        if (idx === -1)
            return undefined;
        Object.assign(store_1.publisher_profiles[idx], partial);
        return store_1.publisher_profiles[idx];
    }
    increment(user_id, field, by = 1) {
        const idx = store_1.publisher_profiles.findIndex((p) => p.user_id === user_id);
        if (idx === -1)
            return;
        store_1.publisher_profiles[idx][field] = Math.max(0, store_1.publisher_profiles[idx][field] + by);
    }
};
exports.PublisherProfileRepository = PublisherProfileRepository;
exports.PublisherProfileRepository = PublisherProfileRepository = __decorate([
    (0, common_1.Injectable)()
], PublisherProfileRepository);
//# sourceMappingURL=publisher-profile.repository.js.map