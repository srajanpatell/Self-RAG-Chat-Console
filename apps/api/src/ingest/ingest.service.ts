import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as FormData from 'form-data';
import { firstValueFrom } from 'rxjs';
import { IngestTextDto } from './dto';

@Injectable()
export class IngestService {
  constructor(private readonly http: HttpService) {}

  async ingestText(dto: IngestTextDto) {
    const base = process.env.CHATBOT_BASE_URL ?? 'http://localhost:8000';
    try {
      const { data } = await firstValueFrom(this.http.post(`${base}/ingest/text`, dto));
      return data;
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Failed to ingest text',
        detail: (error as Error).message
      });
    }
  }

  async ingestFile(file: Express.Multer.File) {
    const base = process.env.CHATBOT_BASE_URL ?? 'http://localhost:8000';
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype || 'application/octet-stream'
    });

    try {
      const { data } = await firstValueFrom(
        this.http.post(`${base}/ingest/file`, form, {
          headers: form.getHeaders()
        })
      );
      return data;
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Failed to ingest file',
        detail: (error as Error).message
      });
    }
  }
}
