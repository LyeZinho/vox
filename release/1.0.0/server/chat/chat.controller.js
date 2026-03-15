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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const signature_guard_1 = require("../auth/guards/signature.guard");
const rxjs_1 = require("rxjs");
let ChatController = class ChatController {
    chatService;
    constructor(chatService) {
        this.chatService = chatService;
    }
    async sendMessage(data) {
        return this.chatService.saveMessage({
            room: data.channelId,
            payload: data.payload,
            signature: data.signature,
            nonce: data.nonce,
            timestamp: data.timestamp,
            senderPubKey: data.senderPubKey,
        });
    }
    streamMessages(roomId) {
        return this.chatService.getMessagesStream(roomId);
    }
    async getHistory(roomId) {
        const history = await this.chatService.getRoomHistory(roomId);
        return history.map(msg => ({
            ...msg,
            timestamp: msg.timestamp.toString()
        }));
    }
    async listRooms() {
        return this.chatService.listRooms();
    }
    async createRoom(data) {
        return this.chatService.createRoom(data.name, data.isModerated);
    }
    async getRoomUsers(roomId) {
        return this.chatService.getRoomUsers(roomId);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)('messages'),
    (0, common_1.UseGuards)(signature_guard_1.SignatureGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Sse)('stream'),
    __param(0, (0, common_1.Query)('roomId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", rxjs_1.Observable)
], ChatController.prototype, "streamMessages", null);
__decorate([
    (0, common_1.Get)('history/:roomId'),
    __param(0, (0, common_1.Param)('roomId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('rooms'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "listRooms", null);
__decorate([
    (0, common_1.Post)('rooms'),
    (0, common_1.UseGuards)(signature_guard_1.SignatureGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createRoom", null);
__decorate([
    (0, common_1.Get)('rooms/:roomId/users'),
    __param(0, (0, common_1.Param)('roomId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getRoomUsers", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)('chat'),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map