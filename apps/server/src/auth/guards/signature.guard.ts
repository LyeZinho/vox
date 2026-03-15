import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class SignatureGuard implements CanActivate {
    constructor(private readonly authService: AuthService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const body = request.body;
        const pubKey = request.headers['x-pubkey'] || body.senderPubKey;

        if (!pubKey || !body.signature || !body.payload || !body.nonce || !body.timestamp) {
            throw new UnauthorizedException('Missing cryptographic proof in request');
        }

        // Reconstruction of the payload that was signed
        // We expect the client to sign: payload + nonce + timestamp
        const dataToVerify = this.authService.constructPayload(
            body.payload,
            body.nonce,
            body.timestamp,
        );

        const isValid = this.authService.verifySignature(
            dataToVerify,
            body.signature,
            pubKey,
        );

        if (!isValid) {
            throw new UnauthorizedException('Invalid digital signature');
        }

        // Attach pubKey to request for later use in controllers
        request.userPubKey = pubKey;

        return true;
    }
}
