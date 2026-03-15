import { MessageEvent } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Observable } from 'rxjs';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    sendMessage(data: any): Promise<{
        id: string;
        createdAt: Date;
        content: string;
        signature: string;
        nonce: string;
        timestamp: bigint;
        senderPubKey: string;
        roomId: string;
    }>;
    streamMessages(roomId: string): Observable<MessageEvent>;
    getHistory(roomId: string): Promise<{
        timestamp: string;
        id: string;
        createdAt: Date;
        content: string;
        signature: string;
        nonce: string;
        senderPubKey: string;
        roomId: string;
    }[]>;
    listRooms(): Promise<{
        id: string;
        name: string | null;
        isModerated: boolean;
        createdAt: Date;
    }[]>;
    createRoom(data: {
        name: string;
        isModerated?: boolean;
    }): Promise<{
        id: string;
        name: string | null;
        isModerated: boolean;
        createdAt: Date;
    }>;
    getRoomUsers(roomId: string): Promise<string[]>;
}
