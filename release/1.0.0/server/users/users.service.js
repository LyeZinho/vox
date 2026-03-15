"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const otplib = __importStar(require("otplib"));
const QRCode = __importStar(require("qrcode"));
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUser(pubKey) {
        return this.prisma.user.findUnique({
            where: { pubKey },
            select: {
                pubKey: true,
                username: true,
                createdAt: true,
                totpEnabled: true,
            },
        });
    }
    async setup2FA(pubKey) {
        let user = await this.prisma.user.findUnique({ where: { pubKey } });
        if (!user) {
            user = await this.prisma.user.create({ data: { pubKey } });
        }
        const secret = otplib.generateSecret();
        const uri = otplib.generateURI({
            secret,
            issuer: 'tchat',
            label: pubKey.slice(0, 8),
        });
        const qrCode = await QRCode.toDataURL(uri);
        await this.prisma.user.update({
            where: { pubKey },
            data: { totpSecret: secret },
        });
        return {
            secret,
            qrCode,
        };
    }
    async enable2FA(pubKey, code) {
        const user = await this.prisma.user.findUnique({ where: { pubKey } });
        if (!user || !user.totpSecret) {
            throw new common_1.BadRequestException('2FA not set up');
        }
        const result = await otplib.verify({ token: code, secret: user.totpSecret });
        if (!result.valid) {
            throw new common_1.BadRequestException('Invalid code');
        }
        await this.prisma.user.update({
            where: { pubKey },
            data: { totpEnabled: true },
        });
        return { success: true };
    }
    async disable2FA(pubKey, code) {
        const user = await this.prisma.user.findUnique({ where: { pubKey } });
        if (!user || !user.totpEnabled) {
            throw new common_1.BadRequestException('2FA not enabled');
        }
        const result = await otplib.verify({ token: code, secret: user.totpSecret });
        if (!result.valid) {
            throw new common_1.BadRequestException('Invalid code');
        }
        await this.prisma.user.update({
            where: { pubKey },
            data: { totpEnabled: false, totpSecret: null },
        });
        return { success: true };
    }
    async get2FAStatus(pubKey) {
        const user = await this.prisma.user.findUnique({ where: { pubKey } });
        return { enabled: user?.totpEnabled ?? false };
    }
    async verify2FA(pubKey, code) {
        const user = await this.prisma.user.findUnique({ where: { pubKey } });
        if (!user || !user.totpEnabled || !user.totpSecret) {
            return true;
        }
        const result = await otplib.verify({ token: code, secret: user.totpSecret });
        return result.valid;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map