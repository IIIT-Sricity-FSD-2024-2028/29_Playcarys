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
exports.LiftBanDto = exports.HandleViolationDto = exports.CreateModeratorActionDto = void 0;
const class_validator_1 = require("class-validator");
class CreateModeratorActionDto {
}
exports.CreateModeratorActionDto = CreateModeratorActionDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateModeratorActionDto.prototype, "moderator_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateModeratorActionDto.prototype, "report_id", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['warning', 'restrict', 'ban', 'review']),
    __metadata("design:type", String)
], CreateModeratorActionDto.prototype, "action_type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateModeratorActionDto.prototype, "action_reason", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateModeratorActionDto.prototype, "target_user_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateModeratorActionDto.prototype, "ban_duration", void 0);
class HandleViolationDto {
}
exports.HandleViolationDto = HandleViolationDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], HandleViolationDto.prototype, "moderator_id", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], HandleViolationDto.prototype, "target_user_id", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['warning', 'restrict', 'ban']),
    __metadata("design:type", String)
], HandleViolationDto.prototype, "action_type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HandleViolationDto.prototype, "action_reason", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HandleViolationDto.prototype, "violation_type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HandleViolationDto.prototype, "ban_duration", void 0);
class LiftBanDto {
}
exports.LiftBanDto = LiftBanDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], LiftBanDto.prototype, "moderator_id", void 0);
//# sourceMappingURL=moderator-action.dto.js.map