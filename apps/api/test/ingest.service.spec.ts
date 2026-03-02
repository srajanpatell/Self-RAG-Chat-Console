import { HttpService } from '@nestjs/axios';
import { InternalServerErrorException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { IngestService } from '../src/ingest/ingest.service';

describe('IngestService', () => {
  const post = jest.fn();
  const http = { post } as unknown as HttpService;
  const service = new IngestService(http);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CHATBOT_BASE_URL = 'http://chatbot:8000';
  });

  it('ingestText returns chatbot response on success', async () => {
    post.mockReturnValueOnce(of({ data: { document_id: 'doc-1' } }));

    const result = await service.ingestText({ title: 'Doc', text: 'text' });

    expect(post).toHaveBeenCalledWith('http://chatbot:8000/ingest/text', { title: 'Doc', text: 'text' });
    expect(result).toEqual({ document_id: 'doc-1' });
  });

  it('ingestText throws InternalServerErrorException on failure', async () => {
    post.mockReturnValueOnce(throwError(() => new Error('boom')));

    await expect(service.ingestText({ title: 'Doc', text: 'text' })).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('ingestFile posts multipart form to chatbot', async () => {
    post.mockReturnValueOnce(of({ data: { document_id: 'doc-file' } }));

    const file = {
      buffer: Buffer.from('hello'),
      originalname: 'note.txt',
      mimetype: 'text/plain'
    } as Express.Multer.File;

    const result = await service.ingestFile(file);

    expect(post).toHaveBeenCalledTimes(1);
    const [url] = post.mock.calls[0];
    expect(url).toBe('http://chatbot:8000/ingest/file');
    expect(result).toEqual({ document_id: 'doc-file' });
  });
});
