import { Controller, Get, Query, Post, Body, BadRequestException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { S3Service } from './s3.service';
import { RunsService } from '../runs/runs.service';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

@Controller('s3')
export class S3Controller {
  constructor(
    private readonly s3Service: S3Service,
    private readonly runsService: RunsService,
    private readonly configService: ConfigService,
  ) {}

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

  /**
   * Ensure the provided key does not already exist in the bucket. If it does,
   * append a numeric suffix before the extension (or at end) to make it unique.
   */
  private async ensureUniqueKey(originalKey: string): Promise<string> {
    let candidate = originalKey;
    let i = 1;
    while (true) {
      try {
        const exists = await this.s3Service.objectExists(candidate);
        if (!exists) return candidate;
      } catch (err) {
        // If objectExists threw due to other errors, rethrow
        throw err;
      }

      // build next candidate with suffix
      const extIndex = originalKey.lastIndexOf('.');
      if (extIndex > 0) {
        const base = originalKey.slice(0, extIndex);
        const ext = originalKey.slice(extIndex);
        candidate = `${base}-${i}${ext}`;
      } else {
        candidate = `${originalKey}-${i}`;
      }
      i += 1;
    }
  }

  /**
   * Accept multipart/form-data file upload (field `file`) and metadata (optional `metadata` JSON string).
   * This endpoint streams the file buffer to S3 using multipart upload and creates a DB run record.
   */
  @Post('newRunFile')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async newRunFile(@UploadedFile() file: Express.Multer.File, @Body('metadata') metadataJson?: string) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Missing uploaded file in `file` field');
    }

    let metadata: any = {};
    try {
      if (metadataJson) metadata = JSON.parse(metadataJson);
    } catch (e) {
      // ignore parse error and use empty metadata
    }

    // Determine key: use metadata.run_name or original filename or generated
    const datePart = new Date().toISOString().slice(0, 10);
    const runName = metadata?.run_name || file.originalname;
    const initialKey = metadata?.key || `run_data/${datePart}/${encodeURIComponent(String(runName))}`;

    try {
      const bucket = this.configService.get<string>('AWS_S3_BUCKET');
      const region = this.configService.get<string>('AWS_REGION', 'us-east-1');

      // build the would-be S3 URL for the initial key so we can check DB uniqueness
      const initialS3Url = `https://${bucket}.s3.${region}.amazonaws.com/${initialKey}`;

      // if a run already exists with this srcPath, do not create/upload a new run
      const existing = await this.runsService.findBySrcPath(initialS3Url);
      if (existing) {
        return {
          success: false,
          error: 'A run with this srcPath already exists',
          existingRun: existing,
        };
      }

      // ensure we don't overwrite an existing object in S3; this may append a suffix
      const key = await this.ensureUniqueKey(initialKey);

      await this.s3Service.uploadBuffer(key, file.buffer, file.mimetype || 'application/octet-stream');

      const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

      // Map metadata to DB fields
      const lengthVal = typeof metadata?.run_time === 'number' ? Math.floor(metadata.run_time) : (metadata?.run_time ? Number(metadata.run_time) : 0);

      // Use the filename (last segment of the key) as the run title
      const title = key.split('/').pop() ?? key;

      const runData = {
        srcPath: s3Url,
        title,
        comments: metadata?.run_comment ?? metadata?.comments ?? null,
        length: Number.isFinite(lengthVal) ? Math.floor(lengthVal) : 0,
        date: metadata?.date ? new Date(metadata.date) : undefined,
        location: metadata?.location ?? null,
      };

      let created;
      try {
        created = await this.runsService.createRun(runData as any);
      } catch (err) {
        // if DB insert fails, remove the uploaded S3 object to avoid orphaned files
        try {
          await this.s3Service.deleteFile(key);
        } catch (delErr) {
          // swallow deletion error but include info in response
          return {
            success: false,
            error: `Run creation failed: ${(err as Error).message}; additionally failed to delete uploaded S3 object: ${(delErr as Error).message}`,
          };
        }

        return {
          success: false,
          error: `Run creation failed: ${(err as Error).message}`,
        };
      }

      return {
        success: true,
        s3Key: key,
        s3Url,
        run: created,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // `newRun` JSON endpoint removed; `newRunFile` handles uploads now.
}
