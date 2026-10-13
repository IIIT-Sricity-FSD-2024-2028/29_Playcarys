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
exports.RegisterDto = exports.ChangePasswordDto = exports.LoginDto = exports.ResetPasswordDto = exports.ForgotPasswordDto = exports.SessionPingDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class SessionPingDto {
}
exports.SessionPingDto = SessionPingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Internal ID of the signed-in user', example: 7 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SessionPingDto.prototype, "user_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The session token issued when this tab signed in' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SessionPingDto.prototype, "session_token", void 0);
class ForgotPasswordDto {
}
exports.ForgotPasswordDto = ForgotPasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email address on the account', example: 'dragon@example.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], ForgotPasswordDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Which account, when one address holds both (4 = Player, 5 = Publisher).',
        example: 4,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ForgotPasswordDto.prototype, "role_id", void 0);
class ResetPasswordDto {
}
exports.ResetPasswordDto = ResetPasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email address on the account', example: 'dragon@example.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The 6-digit one-time code', example: '482913' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The new password (min 8 characters)', example: 'n3wPassw0rd!' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "new_password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: 4 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ResetPasswordDto.prototype, "role_id", void 0);
class LoginDto {
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The email address of the user', example: 'dragon@example.com', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Alternatively, the username', example: 'GodMode', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The password data', example: 'yourSecurePassw0rd!' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Optional. Which account to sign in to when one email holds more than one ' +
            '(4 = Player, 5 = Publisher). Omit and the password decides.',
        example: 5,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], LoginDto.prototype, "role_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Take the account even though another session currently holds it. Only meant ' +
            'to be sent after the caller has confirmed that with a human (handoff approval ' +
            'or an explicit "sign in anyway") — omit it for a normal login attempt.',
        example: false,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], LoginDto.prototype, "force", void 0);
class ChangePasswordDto {
}
exports.ChangePasswordDto = ChangePasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Account whose password is changing', example: 9 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ChangePasswordDto.prototype, "user_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The password currently on the account' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "current_password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Replacement password (min 8 characters)', example: 'N3wPassw0rd!' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "new_password", void 0);
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Desired username', example: 'NewPlayer99' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "user_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User contact email', example: 'hello@example.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Strong password', example: 'Testings123!' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Identifier mapping to internal DB roles (default: 4 = Player, 5 = Publisher)', example: 4, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsIn)([4, 5]),
    __metadata("design:type", Number)
], RegisterDto.prototype, "role_id", void 0);
//# sourceMappingURL=auth.dto.js.map