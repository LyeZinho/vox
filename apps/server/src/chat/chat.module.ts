import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AuthModule } from '../auth/auth.module';
import { ModerationService } from './moderation.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ModerationService],
})
export class ChatModule { }
