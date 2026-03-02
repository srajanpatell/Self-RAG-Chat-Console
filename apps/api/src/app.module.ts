import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ChatController } from './chat/chat.controller';
import { ChatService } from './chat/chat.service';
import { IngestController } from './ingest/ingest.controller';
import { IngestService } from './ingest/ingest.service';

@Module({
  imports: [HttpModule],
  controllers: [ChatController, IngestController],
  providers: [ChatService, IngestService]
})
export class AppModule {}
