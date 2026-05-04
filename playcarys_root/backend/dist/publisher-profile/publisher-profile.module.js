"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublisherProfileModule = void 0;
const common_1 = require("@nestjs/common");
const publisher_profile_controller_1 = require("./publisher-profile.controller");
const publisher_profile_service_1 = require("./publisher-profile.service");
const publisher_profile_repository_1 = require("./publisher-profile.repository");
let PublisherProfileModule = class PublisherProfileModule {
};
exports.PublisherProfileModule = PublisherProfileModule;
exports.PublisherProfileModule = PublisherProfileModule = __decorate([
    (0, common_1.Module)({
        controllers: [publisher_profile_controller_1.PublisherProfileController],
        providers: [publisher_profile_service_1.PublisherProfileService, publisher_profile_repository_1.PublisherProfileRepository],
        exports: [publisher_profile_service_1.PublisherProfileService, publisher_profile_repository_1.PublisherProfileRepository],
    })
], PublisherProfileModule);
//# sourceMappingURL=publisher-profile.module.js.map