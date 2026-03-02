import { BadRequestException } from '@nestjs/common';
import { IngestController } from '../src/ingest/ingest.controller';

describe('IngestController', () => {
  it('delegates ingestText to service', async () => {
    const service = { ingestText: jest.fn().mockResolvedValue({ ok: true }), ingestFile: jest.fn() };
    const controller = new IngestController(service as any);

    const dto = { title: 'Doc', text: 'Body' } as any;
    const result = await controller.ingestText(dto);

    expect(service.ingestText).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ ok: true });
  });

  it('throws when ingestFile has no file', async () => {
    const service = { ingestText: jest.fn(), ingestFile: jest.fn() };
    const controller = new IngestController(service as any);

    expect(() => controller.ingestFile(undefined as any)).toThrow(BadRequestException);
  });

  it('delegates ingestFile to service when file exists', async () => {
    const service = { ingestText: jest.fn(), ingestFile: jest.fn().mockResolvedValue({ ok: true }) };
    const controller = new IngestController(service as any);

    const file = { originalname: 'doc.txt' } as Express.Multer.File;
    const result = await controller.ingestFile(file);

    expect(service.ingestFile).toHaveBeenCalledWith(file);
    expect(result).toEqual({ ok: true });
  });
});
