import { Controller, Get, Query, Post, Res, Body, BadRequestException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
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
   * GET /s3/file?path=...
   * Returns the file content from S3
   */
  @Get('file')
  async getFile(@Query('path') path: string, @Res() res: Response) {
    if (!path) {
      throw new BadRequestException('Query parameter `path` is required');
    }
    
    try {
      // s3Service.getFileStream should return a Readable stream from S3
      const { stream, contentType, contentLength } = await this.s3Service.getFileStream(path);

      // set headers
      if (contentType) res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.setHeader('Content-Disposition', `attachment; filename="${path.split('/').pop()}"`);

      // pipe the S3 stream to the response
      stream.pipe(res);
    } catch (err) {
      console.error('Error fetching file from S3:', (err as Error).message);
      throw new BadRequestException(`Failed to fetch file: ${(err as Error).message}`);
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

  private parseCsvToColumnArrays(csv: string) {
    const rows = csv.trim().split('\n').map(r => r.split(','));

    const header = rows[0];
    const numCols = header.length;

    // Prepare an array per column
    const columns: any[][] = Array.from({ length: numCols }, () => []);

    // Fill columns
    for (let r = 1; r < rows.length; r++) {
      for (let c = 0; c < numCols; c++) {
        const raw = rows[r][c]?.trim() ?? '';

        // Try to parse JSON array; if fails, use raw value
        try {
          columns[c].push(JSON.parse(raw));
        } catch {
          columns[c].push(raw);
        }
      }
    }

    return columns;
  }

  /**
   * Accept multipart/form-data file upload (field `file`).
   * Extracts metadata from the JSON file itself and creates a DB run record.
   */
  @Post('newRunFile')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async newRunFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('metadata') metadataJson?: string,) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Missing uploaded file in `file` field');
    }
    console.log('📁 CSV received:', file.originalname, `(${file.size} bytes)`);

    // Parse metadata JSON if provided
    let metadata: any = {};
    if (metadataJson) {
      try {
        metadata = JSON.parse(metadataJson);
        console.log('📝 Metadata received:', JSON.stringify(metadata, null, 2));
      } catch (err) {
        console.warn('⚠️  Failed to parse metadata JSON:', (err as Error).message);
      }
    }
    // Convert new csv into json format
    const csvContent = file.buffer.toString('utf-8');
    const columns = this.parseCsvToColumnArrays(csvContent);
    console.log('✅ CSV parsed into columns. Number of columns:', columns.length);

    // build json file
    const json = {
      "data": {
        "gyroscope": {
          "axis1": columns[0] || [],
          "axis2": columns[1] || [],
          "axis3": columns[2] || [],
        },
        "accelerometer": {
          "axis1": columns[3] || [],
          "axis2": columns[4] || [],
          "axis3": columns[5] || [],
        },
        "suspension": {
          "rear_sus": columns[6] || [],
          "front_sus": columns[7] || [],
        },
      },
      metadata,
    };
    const jsonBuffer = Buffer.from(JSON.stringify(json));

    // Determine key: use metadata.run_name or original filename (but store as .json)
    const datePart = new Date().toISOString().slice(0, 10);
    const runName = metadata?.run_name || file.originalname;
    // strip existing extension from runName so we always store a .json file
    const filenameBase = String(runName).replace(/\.[^/.]+$/, '');
    const initialKey = metadata?.key || `run_data/${datePart}/${encodeURIComponent(filenameBase)}.json`;
    console.log('🔑 Initial S3 key:', initialKey);

    try {
      const bucket = this.configService.get<string>('AWS_S3_BUCKET');
      const region = this.configService.get<string>('AWS_REGION', 'us-east-1');

      // build the would-be S3 URL for the initial key so we can check DB uniqueness
      const initialS3Url = `https://${bucket}.s3.${region}.amazonaws.com/${initialKey}`;

      // if a run already exists with this srcPath, do not create/upload a new run
      const existing = await this.runsService.findBySrcPath(initialS3Url);
      if (existing) {
        console.warn('⚠️  Run already exists with srcPath:', initialS3Url);
        console.log('📝 Will generate unique filename instead of rejecting...');
      }

      // ensure we don't overwrite an existing object in S3; this may append a suffix
      const key = await this.ensureUniqueKey(initialKey);
      console.log('✅ Final S3 key (unique):', key);

      console.log('⬆️  Uploading JSON to S3...');
      // Upload the generated JSON buffer as application/json
      await this.s3Service.uploadBuffer(key, jsonBuffer, 'application/json');
      console.log('✅ JSON uploaded to S3 successfully');

      const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

      // Map metadata to DB fields
      const lengthVal = typeof metadata?.run_time === 'number' ? Math.floor(metadata.run_time) : (metadata?.run_time ? Number(metadata.run_time) : 0);

      // Use the filename (last segment of the key) as the run title
      const title = (key.split('/').pop() ?? key).replace(/\.[^.]+$/, '');


      const runData = {
        srcPath: s3Url,
        title,
        comments: metadata?.run_comment ?? metadata?.comments ?? null,
        length: Number.isFinite(lengthVal) ? Math.floor(lengthVal) : 0,
        date: metadata?.date ? new Date(metadata.date) : undefined,
        location: metadata?.location ?? null,
        front_freq: metadata?.front_freq ?? 100, // 100 is the default freq on esp
        rear_freq: metadata?.rear_freq ?? 100,
      };

      console.log('💾 Creating database record with data:', JSON.stringify(runData, null, 2));

      let created;
      try {
        created = await this.runsService.createRun(runData as any);
        console.log('✅ Database record created successfully:', created);
      } catch (err) {
        // if DB insert fails, remove the uploaded S3 object to avoid orphaned files
        console.error('❌ Database record creation failed:', (err as Error).message);
        try {
          await this.s3Service.deleteFile(key);
          console.log('🗑️  Deleted orphaned S3 object');
        } catch (delErr) {
          // swallow deletion error but include info in response
          console.error('❌ Failed to delete orphaned S3 object:', (delErr as Error).message);
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

      console.log('🎉 Request completed successfully');
      return {
        success: true,
        s3Key: key,
        s3Url,
        run: created,
      };
    } catch (error) {
      console.error('❌ Unexpected error:', (error as Error).message);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // `newRun` JSON endpoint removed; `newRunFile` handles uploads now.
}``
