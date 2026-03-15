import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
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
}
