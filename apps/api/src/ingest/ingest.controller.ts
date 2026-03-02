import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IngestTextDto } from './dto';
import { IngestService } from './ingest.service';

@Controller('ingest')
export class IngestController {
  constructor(private readonly service: IngestService) {}

  @Post('text')
  ingestText(@Body() dto: IngestTextDto) {
    return this.service.ingestText(dto);
  }

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  ingestFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.service.ingestFile(file);
  }
}
