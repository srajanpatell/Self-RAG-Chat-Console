import { HttpService } from '@nestjs/axios';
import { InternalServerErrorException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ChatService } from '../src/chat/chat.service';

describe('ChatService', () => {
  const post = jest.fn();
  const http = { post } as unknown as HttpService;
  const service = new ChatService(http);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CHATBOT_BASE_URL = 'http://chatbot:8000';
  });

  it('returns chatbot response on success', async () => {
    post.mockReturnValueOnce(of({ data: { answer: 'ok' } }));

    const result = await service.chat({ query: 'hello' });

    expect(post).toHaveBeenCalledWith('http://chatbot:8000/chat', { query: 'hello' });
    expect(result).toEqual({ answer: 'ok' });
  });

  it('throws InternalServerErrorException on failure', async () => {
    post.mockReturnValueOnce(throwError(() => new Error('boom')));

    await expect(service.chat({ query: 'hello' })).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
