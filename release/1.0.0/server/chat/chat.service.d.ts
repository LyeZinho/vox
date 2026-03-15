import { MessageEvent } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Observable } from 'rxjs';
import { ModerationService } from './moderation.service';
export declare class ChatService {
    private readonly prisma;
    private readonly moderation;
    private redisPublisher;
    private redisSubscriber;
    private messageSubject;
    constructor(prisma: PrismaService, moderation: ModerationService);
    saveMessage(data: {
        room: string;
        payload: string;
        signature: string;
        nonce: string;
        timestamp: number;
        senderPubKey: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        content: string;
        signature: string;
        nonce: string;
        timestamp: bigint;
        senderPubKey: string;
        roomId: string;
    }>;
    getMessagesStream(roomId: string): Observable<MessageEvent>;
    getRoomHistory(roomId: string): Promise<{
        id: string;
        createdAt: Date;
        content: string;
        signature: string;
        nonce: string;
        timestamp: bigint;
        senderPubKey: string;
        roomId: string;
    }[]>;
    listRooms(): Promise<{
        id: string;
        name: string | null;
        isModerated: boolean;
        createdAt: Date;
    }[]>;
    createRoom(name: string, isModerated?: boolean): Promise<{
        id: string;
        name: string | null;
        isModerated: boolean;
        createdAt: Date;
    }>;
    getRoomUsers(roomId: string): Promise<string[]>;
}
