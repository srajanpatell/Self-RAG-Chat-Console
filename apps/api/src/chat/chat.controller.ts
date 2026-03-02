import { Body, Controller, Post } from '@nestjs/common';
import { ChatDto } from './dto';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Post()
  chat(@Body() dto: ChatDto) {
    return this.service.chat(dto);
  }
}
