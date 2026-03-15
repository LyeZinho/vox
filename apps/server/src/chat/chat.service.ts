import { Injectable, MessageEvent, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { ModerationService } from './moderation.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ChatService {
    private redisPublisher: Redis;
    private redisSubscriber: Redis;
    private messageSubject = new Subject<{ roomId: string; data: any }>();
    private readonly uploadsDir = path.join(process.cwd(), 'uploads');

    constructor(
        private readonly prisma: PrismaService,
        private readonly moderation: ModerationService,
    ) {
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
        }
        this.redisPublisher = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
        this.redisSubscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

        // Subscribe to all rooms
        this.redisSubscriber.psubscribe('room:*');
        this.redisSubscriber.on('pmessage', (pattern, channel, message) => {
            const roomId = channel.split(':')[1];
            this.messageSubject.next({ roomId, data: JSON.parse(message) });
        });
    }

    async saveMessage(data: {
        room: string;
        payload: string;
        signature: string;
        nonce: string;
        timestamp: number;
        senderPubKey: string;
    }) {
        // 1. Fetch room to check moderation status
        const room = await this.prisma.room.upsert({
            where: { id: data.room },
            update: {},
            create: { id: data.room, name: `Room ${data.room.substring(0, 8)}` },
        });

        // 2. Apply moderation if needed
        if (room.isModerated) {
            // In moderated rooms, the payload is expected to be readable (e.g., base64 of plain text)
            // For now, we assume it's UTF-8 or we try to decode it.
            const decodedContent = Buffer.from(data.payload, 'base64').toString('utf8');
            const result = this.moderation.validateContent(decodedContent);

            if (!result.safe) {
                throw new BadRequestException(result.reason);
            }
        }

        // 3. Ensure user exists
        await this.prisma.user.upsert({
            where: { pubKey: data.senderPubKey },
            update: {},
            create: { pubKey: data.senderPubKey },
        });

        const msg = await this.prisma.message.create({
            data: {
                content: data.payload,
                signature: data.signature,
                nonce: data.nonce,
                timestamp: BigInt(data.timestamp),
                senderPubKey: data.senderPubKey,
                roomId: data.room,
            },
        });

        // Publish to Redis
        const publishedMsg = JSON.parse(JSON.stringify(msg, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
        await this.redisPublisher.publish(`room:${data.room}`, JSON.stringify(publishedMsg));

        return publishedMsg;
    }

    getMessagesStream(roomId: string): Observable<MessageEvent> {
        return this.messageSubject.asObservable().pipe(
            filter((msg) => msg.roomId === roomId),
            map((msg) => ({
                data: msg.data,
            } as MessageEvent)),
        );
    }

    async getRoomHistory(roomId: string) {
        return this.prisma.message.findMany({
            where: { roomId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    async listRooms() {
        return this.prisma.room.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }

    async createRoom(name: string, isModerated: boolean = false) {
        const roomId = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        return this.prisma.room.upsert({
            where: { id: roomId },
            update: {},
            create: { id: roomId, name, isModerated },
        });
    }

    async getRoomUsers(roomId: string) {
        const messages = await this.prisma.message.findMany({
            where: { roomId },
            select: { senderPubKey: true },
            distinct: ['senderPubKey'],
        });
        return messages.map(m => m.senderPubKey);
    }

    async saveBlob(data: Buffer, fileId: string): Promise<string> {
        const filePath = path.join(this.uploadsDir, fileId);
        await fs.promises.writeFile(filePath, data);
        return fileId;
    }

    async getBlob(fileId: string): Promise<Buffer> {
        const filePath = path.join(this.uploadsDir, fileId);
        if (!fs.existsSync(filePath)) {
            throw new BadRequestException('Blob not found');
        }
        return fs.promises.readFile(filePath);
    }
}
