import { Controller, Get, Query } from '@nestjs/common';
import { S3Service } from './s3.service';

@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Get('list')
  async listFiles(@Query('prefix') prefix: string = '') {
    try {
      const files = await this.s3Service.listFiles(prefix);
      return {
        success: true,
        prefix,
        files,
        count: files.length,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
