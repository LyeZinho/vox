import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getUser(pubKey: string): Promise<{
        createdAt: Date;
        pubKey: string;
        username: string | null;
        totpEnabled: boolean;
    } | null>;
    setup2FA(pubKey: string): Promise<{
        secret: string;
        qrCode: any;
    }>;
    enable2FA(pubKey: string, code: string): Promise<{
        success: boolean;
    }>;
    disable2FA(pubKey: string, code: string): Promise<{
        success: boolean;
    }>;
    get2FAStatus(pubKey: string): Promise<{
        enabled: boolean;
    }>;
    verify2FA(pubKey: string, code: string): Promise<boolean>;
}
