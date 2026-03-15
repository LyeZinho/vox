import { EventSource } from 'eventsource';

const API_URL = process.env.TCHAT_API_URL || 'http://localhost:3000';

export interface Message {
    id: string;
    content: string;
    signature: string;
    nonce: string;
    timestamp: string;
    senderPubKey: string;
    roomId: string;
    createdAt: string;
}

export interface User {
    pubKey: string;
    username?: string;
    createdAt: string;
    totpEnabled: boolean;
}

export interface Room {
    id: string;
    name?: string;
    createdAt: string;
}

export interface TOTPSetup {
    secret: string;
    qrCode: string;
}

class TchatAPI {
    private baseUrl: string;

    constructor(baseUrl: string = API_URL) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API Error: ${response.status} - ${error}`);
        }

        return response.json();
    }

    async sendMessage(data: {
        channelId: string;
        payload: string;
        signature: string;
        nonce: string;
        timestamp: number;
        senderPubKey: string;
    }): Promise<Message> {
        return this.request<Message>('/chat/messages', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getHistory(roomId: string): Promise<Message[]> {
        return this.request<Message[]>(`/chat/history/${roomId}`);
    }

    streamMessages(roomId: string, onMessage: (data: Message) => void, onError?: (error: Error) => void): () => void {
        const eventSource = new EventSource(`${this.baseUrl}/chat/stream?roomId=${roomId}`);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onMessage(data);
            } catch (e) {
                console.error('Failed to parse SSE message:', e);
            }
        };

        eventSource.onerror = (e) => {
            if (onError) {
                onError(new Error('SSE connection error'));
            }
        };

        return () => eventSource.close();
    }

    async getUser(pubKey: string): Promise<User> {
        return this.request<User>(`/users/${pubKey}`);
    }

    async setup2FA(pubKey: string): Promise<TOTPSetup> {
        return this.request<TOTPSetup>(`/users/${pubKey}/2fa/setup`, {
            method: 'POST',
        });
    }

    async enable2FA(pubKey: string, code: string): Promise<{ success: boolean }> {
        return this.request<{ success: boolean }>(`/users/${pubKey}/2fa/enable`, {
            method: 'POST',
            body: JSON.stringify({ code }),
        });
    }

    async disable2FA(pubKey: string, code: string): Promise<{ success: boolean }> {
        return this.request<{ success: boolean }>(`/users/${pubKey}/2fa/disable`, {
            method: 'POST',
            body: JSON.stringify({ code }),
        });
    }

    async get2FAStatus(pubKey: string): Promise<{ enabled: boolean }> {
        return this.request<{ enabled: boolean }>(`/users/${pubKey}/2fa/status`);
    }

    async listRooms(): Promise<Room[]> {
        return this.request<Room[]>('/chat/rooms');
    }

    async createRoom(name: string, isModerated?: boolean): Promise<Room> {
        return this.request<Room>('/chat/rooms', {
            method: 'POST',
            body: JSON.stringify({ name, isModerated }),
        });
    }

    async getRoomUsers(roomId: string): Promise<string[]> {
        return this.request<string[]>(`/chat/rooms/${roomId}/users`);
    }

    async getVersion(): Promise<{ version: string }> {
        return this.request<{ version: string }>('/chat/version');
    }

    async uploadBlob(fileId: string, buffer: Buffer): Promise<{ fileId: string }> {
        return this.request<{ fileId: string }>(`/chat/blobs/${fileId}`, {
            method: 'POST',
            body: JSON.stringify({ buffer: buffer.toString('base64') }),
        });
    }

    async downloadBlob(fileId: string): Promise<Buffer> {
        const response = await fetch(`${this.baseUrl}/chat/blobs/${fileId}`);
        if (!response.ok) throw new Error('Failed to download blob');
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
}

export const api = new TchatAPI();
