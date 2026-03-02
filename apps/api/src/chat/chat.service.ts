import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ChatDto } from './dto';

@Injectable()
export class ChatService {
  constructor(private readonly http: HttpService) {}

  async chat(dto: ChatDto) {
    const base = process.env.CHATBOT_BASE_URL ?? 'http://localhost:8000';
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${base}/chat`, {
          query: dto.query
        })
      );
      return data;
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Failed to call chatbot service',
        detail: (error as Error).message
      });
    }
  }
}
