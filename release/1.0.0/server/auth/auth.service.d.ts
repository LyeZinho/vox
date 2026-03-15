export declare class AuthService {
    private readonly authenticator;
    constructor();
    verifySignature(payload: string, signatureHex: string, pubKeyHex: string): boolean;
    constructPayload(content: string, nonce: string, timestamp: string | number): string;
    generate2FASecret(): string;
    generateQrCodeDataURL(pubKey: string, secret: string): Promise<any>;
    verifyTotp(token: string, secret: string): Promise<boolean>;
}
