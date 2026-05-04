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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublisherProfileController = void 0;
const common_1 = require("@nestjs/common");
const publisher_profile_service_1 = require("./publisher-profile.service");
let PublisherProfileController = class PublisherProfileController {
    constructor(publisherProfileService) {
        this.publisherProfileService = publisherProfileService;
    }
    findAll() {
        return this.publisherProfileService.findAll();
    }
    findOne(userId) {
        return this.publisherProfileService.findOne(userId);
    }
};
exports.PublisherProfileController = PublisherProfileController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublisherProfileController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':userId'),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], PublisherProfileController.prototype, "findOne", null);
exports.PublisherProfileController = PublisherProfileController = __decorate([
    (0, common_1.Controller)('publisher-profiles'),
    __metadata("design:paramtypes", [publisher_profile_service_1.PublisherProfileService])
], PublisherProfileController);
//# sourceMappingURL=publisher-profile.controller.js.map