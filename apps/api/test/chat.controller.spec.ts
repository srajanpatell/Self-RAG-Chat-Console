import { ChatController } from '../src/chat/chat.controller';

describe('ChatController', () => {
  it('delegates to chat service', async () => {
    const service = { chat: jest.fn().mockResolvedValue({ answer: 'ok' }) };
    const controller = new ChatController(service as any);

    const result = await controller.chat({ query: 'q' } as any);

    expect(service.chat).toHaveBeenCalledWith({ query: 'q' });
    expect(result).toEqual({ answer: 'ok' });
  });
});
