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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const signature_guard_1 = require("../auth/guards/signature.guard");
let UsersController = class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async getUser(pubKey) {
        return this.usersService.getUser(pubKey);
    }
    async setup2FA(pubKey) {
        return this.usersService.setup2FA(pubKey);
    }
    async enable2FA(pubKey, code) {
        return this.usersService.enable2FA(pubKey, code);
    }
    async disable2FA(pubKey, code) {
        return this.usersService.disable2FA(pubKey, code);
    }
    async get2FAStatus(pubKey) {
        return this.usersService.get2FAStatus(pubKey);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(':pubKey'),
    __param(0, (0, common_1.Param)('pubKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUser", null);
__decorate([
    (0, common_1.Post)(':pubKey/2fa/setup'),
    (0, common_1.UseGuards)(signature_guard_1.SignatureGuard),
    __param(0, (0, common_1.Param)('pubKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "setup2FA", null);
__decorate([
    (0, common_1.Post)(':pubKey/2fa/enable'),
    (0, common_1.UseGuards)(signature_guard_1.SignatureGuard),
    __param(0, (0, common_1.Param)('pubKey')),
    __param(1, (0, common_1.Body)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "enable2FA", null);
__decorate([
    (0, common_1.Post)(':pubKey/2fa/disable'),
    (0, common_1.UseGuards)(signature_guard_1.SignatureGuard),
    __param(0, (0, common_1.Param)('pubKey')),
    __param(1, (0, common_1.Body)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "disable2FA", null);
__decorate([
    (0, common_1.Get)(':pubKey/2fa/status'),
    __param(0, (0, common_1.Param)('pubKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "get2FAStatus", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map