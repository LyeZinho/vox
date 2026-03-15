import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nodeRequire = createRequire(import.meta.url);

const CORE_PATH = path.resolve(__dirname, '../../../../packages/core-rust/tchat-core.linux-x64-gnu.node');

const core = nodeRequire(CORE_PATH);

export interface IdentityKeys {
    publicKey: Buffer;
    privateKey: Buffer;
}

export const rustCore = {
    ping: (): string => core.ping(),

    deriveMasterKey: (password: string, salt: string): Buffer => {
        return core.deriveMasterKey(password, salt);
    },

    generateKeypair: (): IdentityKeys => {
        return core.generateKeypair();
    },

    encryptIdentity: (privateKey: Buffer, masterKey: Buffer): Buffer => {
        return core.encryptIdentity(privateKey, masterKey);
    },

    decryptIdentity: (encryptedData: Buffer, masterKey: Buffer): Buffer => {
        return core.decryptIdentity(encryptedData, masterKey);
    },

    signPayload: (payload: Buffer, privateKey: Buffer): Buffer => {
        return core.signPayload(payload, privateKey);
    },

    isVaultInitialized: (): boolean => {
        return core.isVaultInitialized();
    },

    createVault: (password: string, email: string): string => {
        return core.createVault(password, email);
    },

    unlockVault: (password: string): IdentityKeys => {
        return core.unlockVault(password);
    },

    deleteVault: (): void => {
        return core.deleteVault();
    },

    getVaultPubKey: (): string => {
        return core.getVaultPubKey();
    },

    generateTotpSecret: (): string => {
        return core.generateTotpSecret();
    },

    generateTotpUri: (issuer: string, accountName: string): string => {
        return core.generateTotpUri(issuer, accountName);
    },

    verifyTotp: (secret: string, code: string): boolean => {
        return core.verifyTotp(secret, code);
    },

    generateMnemonic: (): string => core.generateMnemonic(),

    generateIdenticon: (pubkey: string): string => core.generateIdenticon(pubkey),

    renderImage: (path: string, x: number, y: number, width: number, height: number): void => {
        return core.renderImage(path, x, y, width, height);
    },

    getAuditInfo: (): string => core.getAuditInfo(),

    copyToClipboard: (text: string): void => core.copyToClipboard(text),
};
