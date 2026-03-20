import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPlatformTriple(): string {
    const platform = process.platform;
    const arch = process.arch;

    const map: Record<string, string> = {
        'linux-x64':   'x86_64-unknown-linux-gnu',
        'linux-arm64':  'aarch64-unknown-linux-gnu',
        'darwin-x64':   'x86_64-apple-darwin',
        'darwin-arm64': 'aarch64-apple-darwin',
        'win32-x64':    'x86_64-pc-windows-msvc',
    };

    const key = `${platform}-${arch}`;
    const triple = map[key];

    if (!triple) {
        throw new Error(`Unsupported platform: ${platform}-${arch}. Supported: ${Object.keys(map).join(', ')}`);
    }

    return triple;
}

function findCoreBinary(): string {
    const triple = getPlatformTriple();
    const binaryName = `vax-core.${triple}.node`;

    const candidates = [
        path.resolve(__dirname, '../../../../../packages/core-rust', binaryName),
        path.resolve(__dirname, '../../../../core-rust', binaryName),
        path.resolve(process.env.VAX_HOME || path.join(os.homedir(), '.vax'), binaryName),
    ];

    for (const candidate of candidates) {
        try {
            require('fs').accessSync(candidate);
            return candidate;
        } catch {}
    }

    throw new Error(
        `vax-core not found (expected: ${binaryName}). ` +
        `Install with: curl -sSL https://raw.githubusercontent.com/LyeZinho/vox/main/install.sh | bash`
    );
}

const CORE_PATH = findCoreBinary();
const core = createRequire(import.meta.url)(CORE_PATH);

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
