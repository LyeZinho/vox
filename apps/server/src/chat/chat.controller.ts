import {
    Controller,
    Post,
    Body,
    UseGuards,
    Sse,
    Query,
    MessageEvent,
    Get,
    Param,
    Res,
} from '@nestjs/common';
import * as express from 'express';
import { ChatService } from './chat.service';
import { SignatureGuard } from '../auth/guards/signature.guard';
import { Observable } from 'rxjs';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post('messages')
    @UseGuards(SignatureGuard)
    async sendMessage(@Body() data: any) {
        return this.chatService.saveMessage({
            room: data.channelId,
            payload: data.payload,
            signature: data.signature,
            nonce: data.nonce,
            timestamp: data.timestamp,
            senderPubKey: data.senderPubKey,
        });
    }

    @Sse('stream')
    streamMessages(@Query('roomId') roomId: string): Observable<MessageEvent> {
        return this.chatService.getMessagesStream(roomId);
    }

    @Get('history/:roomId')
    async getHistory(@Param('roomId') roomId: string) {
        const history = await this.chatService.getRoomHistory(roomId);
        return JSON.parse(JSON.stringify(history, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
    }

    @Get('rooms')
    async listRooms() {
        return this.chatService.listRooms();
    }

    @Post('rooms')
    @UseGuards(SignatureGuard)
    async createRoom(@Body() data: { name: string; isModerated?: boolean }) {
        return this.chatService.createRoom(data.name, data.isModerated);
    }

    @Get('rooms/:roomId/users')
    async getRoomUsers(@Param('roomId') roomId: string) {
        return this.chatService.getRoomUsers(roomId);
    }

    @Get('version')
    async getVersion() {
        return { version: '1.0.0' };
    }

    @Post('blobs/:fileId')
    async uploadBlob(@Param('fileId') fileId: string, @Body() data: { buffer: string }) {
        const buffer = Buffer.from(data.buffer, 'base64');
        return { fileId: await this.chatService.saveBlob(buffer, fileId) };
    }

    @Get('blobs/:fileId')
    async downloadBlob(@Param('fileId') fileId: string, @Res() res: express.Response) {
        const buffer = await this.chatService.getBlob(fileId);
        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-Length': buffer.length,
        });
        res.send(buffer);
    }
}
