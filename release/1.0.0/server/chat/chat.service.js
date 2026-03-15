"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const ioredis_1 = __importDefault(require("ioredis"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const moderation_service_1 = require("./moderation.service");
let ChatService = class ChatService {
    prisma;
    moderation;
    redisPublisher;
    redisSubscriber;
    messageSubject = new rxjs_1.Subject();
    constructor(prisma, moderation) {
        this.prisma = prisma;
        this.moderation = moderation;
        this.redisPublisher = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
        this.redisSubscriber = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
        this.redisSubscriber.psubscribe('room:*');
        this.redisSubscriber.on('pmessage', (pattern, channel, message) => {
            const roomId = channel.split(':')[1];
            this.messageSubject.next({ roomId, data: JSON.parse(message) });
        });
    }
    async saveMessage(data) {
        const room = await this.prisma.room.upsert({
            where: { id: data.room },
            update: {},
            create: { id: data.room, name: `Room ${data.room.substring(0, 8)}` },
        });
        if (room.isModerated) {
            const decodedContent = Buffer.from(data.payload, 'base64').toString('utf8');
            const result = this.moderation.validateContent(decodedContent);
            if (!result.safe) {
                throw new common_1.BadRequestException(result.reason);
            }
        }
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
        await this.redisPublisher.publish(`room:${data.room}`, JSON.stringify(msg, (key, value) => typeof value === 'bigint' ? value.toString() : value));
        return msg;
    }
    getMessagesStream(roomId) {
        return this.messageSubject.asObservable().pipe((0, operators_1.filter)((msg) => msg.roomId === roomId), (0, operators_1.map)((msg) => ({
            data: msg.data,
        })));
    }
    async getRoomHistory(roomId) {
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
    async createRoom(name, isModerated = false) {
        const roomId = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        return this.prisma.room.upsert({
            where: { id: roomId },
            update: {},
            create: { id: roomId, name, isModerated },
        });
    }
    async getRoomUsers(roomId) {
        const messages = await this.prisma.message.findMany({
            where: { roomId },
            select: { senderPubKey: true },
            distinct: ['senderPubKey'],
        });
        return messages.map(m => m.senderPubKey);
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        moderation_service_1.ModerationService])
], ChatService);
//# sourceMappingURL=chat.service.js.map