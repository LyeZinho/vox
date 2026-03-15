import EventEmitter from 'events';
import { api, type Message, type User, type Room } from './api.js';
import { rustCore } from './rust-bridge.js';
import { notifications } from './notifications.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface AppState {
    isVaultInitialized: boolean;
    isUnlocked: boolean;
    pubKey: string | null;
    privateKey: Buffer | null;
    totpSecret: string | null;
    currentRoom: string | null;
    rooms: Map<string, { id: string; name: string }>;
    messages: Map<string, Message[]>;
    onlineUsers: string[];
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

type AppEvent =
    | 'state:change'
    | 'vault:initialized'
    | 'vault:unlocked'
    | 'vault:locked'
    | 'room:joined'
    | 'room:left'
    | 'message:received'
    | 'messages:history'
    | 'connection:status'
    | 'error';

class AppStore extends EventEmitter {
    private state: AppState;
    private cleanupSSE: (() => void) | null = null;
    private readonly vaxDir = path.join(os.homedir(), '.vax');
    private readonly historyFile = path.join(os.homedir(), '.vax', 'history.vax');

    constructor() {
        super();
        this.state = {
            isVaultInitialized: false,
            isUnlocked: false,
            pubKey: null,
            privateKey: null,
            totpSecret: null,
            currentRoom: null,
            rooms: new Map(),
            messages: new Map(),
            onlineUsers: [],
            connectionStatus: 'disconnected',
        };
    }

    getState(): AppState {
        return { ...this.state };
    }

    async initialize(): Promise<void> {
        const isVaultInitialized = rustCore.isVaultInitialized();
        this.updateState({
            isVaultInitialized,
            isUnlocked: false,
            pubKey: isVaultInitialized ? rustCore.getVaultPubKey() : null,
        });
    }

    async createVault(password: string, email: string): Promise<string> {
        const pubKey = rustCore.createVault(password, email);
        this.updateState({
            isVaultInitialized: true,
            isUnlocked: true,
            pubKey,
        });
        this.emit('vault:initialized', pubKey);
        return pubKey;
    }

    async unlockVault(password: string): Promise<void> {
        const identity = rustCore.unlockVault(password);
        const pubKey = Buffer.from(identity.publicKey).toString('base64');

        this.updateState({
            isUnlocked: true,
            pubKey,
            privateKey: identity.privateKey,
        });
        this.emit('vault:unlocked', pubKey);
        await this.loadLocalHistory();
    }

    lockVault(): void {
        if (this.cleanupSSE) {
            this.cleanupSSE();
            this.cleanupSSE = null;
        }

        this.updateState({
            isUnlocked: false,
            privateKey: null,
            currentRoom: null,
            connectionStatus: 'disconnected',
        });
        this.emit('vault:locked');
    }

    async joinRoom(roomId: string): Promise<void> {
        if (this.cleanupSSE) {
            this.cleanupSSE();
        }

        this.updateState({
            currentRoom: roomId,
            connectionStatus: 'connecting',
        });

        try {
            const serverHistory = await api.getHistory(roomId);
            const localHistory = this.state.messages.get(roomId) || [];

            // Merge histories, avoiding duplicates by nonce
            const mergedMap = new Map();
            localHistory.forEach(m => mergedMap.set(m.nonce, m));
            serverHistory.forEach(m => mergedMap.set(m.nonce, m));

            const mergedHistory = Array.from(mergedMap.values())
                .sort((a, b) => Number(BigInt(a.timestamp) - BigInt(b.timestamp)));

            this.state.messages.set(roomId, mergedHistory);
            this.emit('messages:history', { roomId, messages: mergedHistory });
            this.saveLocalHistory();

            this.cleanupSSE = api.streamMessages(
                roomId,
                (message) => {
                    const messages = this.state.messages.get(roomId) || [];
                    messages.push(message);
                    this.state.messages.set(roomId, messages);

                    if (this.state.pubKey && message.senderPubKey !== this.state.pubKey) {
                        const content = Buffer.from(message.content, 'base64').toString();
                        const myPubKeyShort = this.state.pubKey.slice(0, 8);

                        if (content.includes(myPubKeyShort) || content.includes('@all')) {
                            notifications.notifyMention(
                                message.senderPubKey.slice(0, 8),
                                roomId
                            );
                        } else {
                            notifications.notifyMessage(
                                message.senderPubKey.slice(0, 8),
                                content
                            );
                        }
                    }

                    this.emit('message:received', message);
                    this.saveLocalHistory();
                },
                (error) => {
                    this.updateState({ connectionStatus: 'error' });
                    this.emit('error', error);
                }
            );

            this.updateState({ connectionStatus: 'connected' });
            this.emit('room:joined', roomId);
        } catch (error) {
            this.updateState({ connectionStatus: 'error' });
            throw error;
        }
    }

    leaveRoom(): void {
        if (this.cleanupSSE) {
            this.cleanupSSE();
            this.cleanupSSE = null;
        }

        const roomId = this.state.currentRoom;
        this.updateState({
            currentRoom: null,
            connectionStatus: 'disconnected',
        });

        if (roomId) {
            this.emit('room:left', roomId);
        }
    }

    async sendMessage(content: string): Promise<void> {
        if (!this.state.isUnlocked || !this.state.privateKey || !this.state.currentRoom) {
            throw new Error('Vault not unlocked or no room selected');
        }

        const timestamp = Date.now();
        const nonce = crypto.randomUUID();

        let finalContent = content;

        // Auto-upload images if content looks like a local path
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        if (imageExtensions.some(ext => content.toLowerCase().endsWith(ext)) && fs.existsSync(content)) {
            try {
                const fileId = crypto.randomBytes(16).toString('hex') + path.extname(content);
                const buffer = await fs.promises.readFile(content);
                await api.uploadBlob(fileId, buffer);
                finalContent = `[blob:${fileId}]`;
            } catch (err) {
                console.error('Failed to upload image:', err);
                // Fallback to local path if upload fails
            }
        }

        const payload = JSON.stringify({ content: finalContent, timestamp });
        const payloadBase64 = Buffer.from(payload).toString('base64');

        // Server expects signature of: payload_base64 + nonce + timestamp
        const dataToSign = `${payloadBase64}${nonce}${timestamp}`;

        const signature = rustCore.signPayload(
            Buffer.from(dataToSign),
            this.state.privateKey
        );

        await api.sendMessage({
            channelId: this.state.currentRoom,
            payload: payloadBase64,
            signature: signature.toString('base64'),
            nonce,
            timestamp,
            senderPubKey: this.state.pubKey!,
        });
    }

    addRoom(room: { id: string; name: string }): void {
        this.state.rooms.set(room.id, room);
        this.emit('state:change');
    }

    setRooms(rooms: { id: string; name: string }[]): void {
        this.state.rooms = new Map(rooms.map(r => [r.id, r]));
        this.emit('state:change');
    }

    setOnlineUsers(users: string[]): void {
        this.state.onlineUsers = users;
        this.emit('state:change');
    }

    getMessages(roomId: string): Message[] {
        return this.state.messages.get(roomId) || [];
    }

    async listRooms(): Promise<Room[]> {
        return api.listRooms();
    }

    async generateMnemonic(): Promise<string> {
        return rustCore.generateMnemonic();
    }

    async generateIdenticon(pubkey: string): Promise<string> {
        return rustCore.generateIdenticon(pubkey);
    }

    async renderImage(path: string, x: number, y: number, width: number, height: number): Promise<void> {
        return rustCore.renderImage(path, x, y, width, height);
    }

    async createRoom(name: string): Promise<Room> {
        return api.createRoom(name);
    }

    getAuditInfo(): string {
        return rustCore.getAuditInfo();
    }

    copyToClipboard(text: string): void {
        return rustCore.copyToClipboard(text);
    }

    private lastActivity: number = Date.now();
    private lockTimeout: NodeJS.Timeout | null = null;

    private updateActivity() {
        this.lastActivity = Date.now();
        if (this.lockTimeout) clearTimeout(this.lockTimeout);
        this.lockTimeout = setTimeout(() => {
            if (this.state.isUnlocked) {
                this.lockVault();
                this.emit('error', new Error('Cofre bloqueado por inatividade'));
            }
        }, 10 * 60 * 1000); // 10 minutes
    }

    private updateState(partial: Partial<AppState>): void {
        this.state = { ...this.state, ...partial };
        this.emit('state:change', this.state);
        this.updateActivity();
    }

    private async saveLocalHistory(): Promise<void> {
        if (!this.state.isUnlocked || !this.state.privateKey) return;

        try {
            if (!fs.existsSync(this.vaxDir)) fs.mkdirSync(this.vaxDir, { recursive: true });

            const historyData = JSON.stringify(Array.from(this.state.messages.entries()));
            // Use private key as "master key" for message cache for simplicity 
            // since it's already sensitive and encrypted in the vault.
            const encrypted = rustCore.encryptIdentity(Buffer.from(historyData), this.state.privateKey.slice(0, 32));
            await fs.promises.writeFile(this.historyFile, encrypted);
        } catch (err) {
            console.error('Failed to save history:', err);
        }
    }

    private async loadLocalHistory(): Promise<void> {
        if (!this.state.isUnlocked || !this.state.privateKey || !fs.existsSync(this.historyFile)) return;

        try {
            const encrypted = await fs.promises.readFile(this.historyFile);
            const decrypted = rustCore.decryptIdentity(encrypted, this.state.privateKey.slice(0, 32));
            const historyArray = JSON.parse(decrypted.toString());
            this.state.messages = new Map(historyArray);
        } catch (err) {
            console.error('Failed to load history:', err);
        }
    }
}

export const store = new AppStore();
