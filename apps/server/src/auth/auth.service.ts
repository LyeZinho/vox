import { Injectable } from '@nestjs/common';
import * as nacl from 'tweetnacl';
import { OTP } from 'otplib';
import * as qrcode from 'qrcode';

@Injectable()
export class AuthService {
    private readonly authenticator: OTP;

    constructor() {
        this.authenticator = new OTP({ strategy: 'totp' });
    }
    verifySignature(
        payload: string,
        signatureBase64: string,
        pubKeyBase64: string,
    ): boolean {
        try {
            const signature = Buffer.from(signatureBase64, 'base64');
            const pubKey = Buffer.from(pubKeyBase64, 'base64');
            const message = Buffer.from(payload);

            return nacl.sign.detached.verify(
                new Uint8Array(message),
                new Uint8Array(signature),
                new Uint8Array(pubKey),
            );
        } catch (e) {
            return false;
        }
    }

    // Utility to help reconstruction of payload for verification
    // if we follow the specific pattern: sign(content + nonce + timestamp)
    constructPayload(content: string, nonce: string, timestamp: string | number): string {
        return `${content}${nonce}${timestamp}`;
    }

    generate2FASecret() {
        return this.authenticator.generateSecret();
    }

    async generateQrCodeDataURL(pubKey: string, secret: string) {
        const otpauth = this.authenticator.generateURI({
            issuer: 'tchat',
            label: pubKey.substring(0, 8),
            secret,
        });
        return qrcode.toDataURL(otpauth);
    }

    async verifyTotp(token: string, secret: string): Promise<boolean> {
        const result = await this.authenticator.verify({ token, secret });
        // VerifyResult in v13 is an object.
        return !!result;
    }
}
