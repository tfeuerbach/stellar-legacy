import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ArchiveService } from './archive.service';

@Controller('api/archive')
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Delete('purge')
  async purgeAll() {
    const count = await this.archiveService.purgeAllScreenshots();
    return { ok: true, purged: count };
  }

  @Get()
  async listRenders(
    @Query('station') station?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.archiveService.listRenders({
      station,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      startDate,
      endDate,
    });
  }

  @Get('by-station')
  async listByStation() {
    return this.archiveService.listRendersByStation();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('screenshot'))
  async uploadScreenshot(
    @UploadedFile() file: Express.Multer.File,
    @Body('station') station: string,
    @Body('mode') mode: string,
    @Body('seed') seed: string,
    @Body('credit') credit: string,
    @Body('width') width: string,
    @Body('height') height: string,
  ) {
    if (!file || !station) {
      return { ok: false, error: 'missing file or station' };
    }
    const record = await this.archiveService.saveScreenshot(
      station,
      mode || 'noise',
      parseFloat(seed) || 0,
      credit || '',
      file.buffer,
      parseInt(width) || 1920,
      parseInt(height) || 1080,
    );
    return { ok: !!record, id: record?.id };
  }

  @Get(':id')
  async getRender(@Param('id') id: string) {
    return this.archiveService.getRender(id);
  }

  @Get(':id/image')
  async serveImage(@Param('id') id: string, @Res() res: Response) {
    const render = await this.archiveService.getRender(id);
    const filePath = this.archiveService.getRenderFilePath(render);

    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      mp4: 'video/mp4',
      webm: 'video/webm',
    };

    res.setHeader(
      'Content-Type',
      mimeTypes[render.file_type] || 'application/octet-stream',
    );
    res.sendFile(filePath);
  }

  @Get(':id/download')
  async downloadRender(@Param('id') id: string, @Res() res: Response) {
    const render = await this.archiveService.getRender(id);
    const filePath = this.archiveService.getRenderFilePath(render);

    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      mp4: 'video/mp4',
      png: 'image/png',
      gif: 'image/gif',
      webm: 'video/webm',
    };

    res.setHeader(
      'Content-Type',
      mimeTypes[render.file_type] || 'application/octet-stream',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="stellar-legacy-${render.station_code}-${render.seed_value.toFixed(2)}.${render.file_type}"`,
    );
    res.sendFile(filePath);
  }
}
