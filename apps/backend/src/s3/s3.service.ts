import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from 'bun';
import { Readable } from 'node:stream';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private readonly logger = new Logger(S3Service.name);
  private readonly bucket: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET');

    if (!accessKeyId || !secretAccessKey || !this.bucket) {
      const errorMessage = 'Missing AWS Configuration in environment variables! S3Service cannot be initialized.';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Initialize Bun's native S3 Client
    this.s3Client = new S3Client({
      accessKeyId,
      secretAccessKey,
      bucket: this.bucket,
      region,
      // endpoint: '...' // Optional if using MinIO or R2
    });

    this.logger.log(`S3Service initialized with bucket: ${this.bucket} in region: ${region}`);
  }

  /**
   * Helper to handle and log Bun's AggregateError
   */
  private handleError(operation: string, key: string, error: any): never {
    if (error instanceof AggregateError) {
      this.logger.error(`AggregateError detected during ${operation} on key: ${key}`);
      error.errors.forEach((e, index) => {
        this.logger.error(`Inner Error ${index + 1}: ${e.message}`, e);
      });
    } else {
      this.logger.error(`Error during ${operation} on key: ${key}`, error);
    }
    throw error;
  }

  /**
   * Check whether an object exists in the bucket.
   * Returns false ONLY if the file is missing (404).
   * Throws errors for connectivity, auth, or other failures.
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      const file = this.s3Client.file(key);
      return await file.exists();
    } catch (err: any) {
      // 2. Unwrap and Log AggregateErrors (common in Bun S3)
      if (err instanceof AggregateError) {
        this.logger.error(`AggregateError checking existence of ${key}:`);
        err.errors.forEach((e) => this.logger.error(`Inner error: ${e.message}`));
      } else {
        // 3. Log standard errors
        this.logger.error(`Error checking existence of ${key}:`, err);
      }

      // 4. 🚨 CRITICAL CHANGE: Propagate the error.
      // Do not return false here. The caller must know that the check failed.
      throw err;
    }
  }

  /**
   * Get a file from S3 and return its contents as a buffer.
   */
  async getFile(key: string): Promise<Buffer> {
    try {
      const file = this.s3Client.file(key);
      const arrayBuffer = await file.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.handleError('retrieving file', key, error);
    }
  }

  /**
   * Get a file from S3 and return as JSON.
   */
  async getFileAsJson(key: string): Promise<any> {
    try {
      const file = this.s3Client.file(key);
      return await file.json();
    } catch (error) {
      this.handleError('retrieving JSON file', key, error);
    }
  }

  /**
   * List all files in a specific prefix/folder
   */
  async listFiles(prefix: string = ''): Promise<string[]> {
    try {
      // Bun Native S3 List
      const response = await this.s3Client.list({prefix});

      // Bun returns .contents (lowercase) and each file has a .key (lowercase)
      return (response.contents ?? []).map((file) => file.key);
    } catch (error) {
      this.handleError('listing files', prefix, error);
    }
  }

  /**
   * Upload a file to S3.
   * Bun automatically handles multipart uploads for large files.
   */
  async uploadFile(key: string, data: Buffer | string): Promise<void> {
    try {
      // Bun.write / s3.write automatically handles Buffer, String, or Blob
      await this.s3Client.write(key, data);
      this.logger.log(`File ${key} uploaded successfully`);
    } catch (error) {
      this.handleError('uploading file', key, error);
    }
  }

  /**
   * Upload a Buffer.
   */
  async uploadBuffer(key: string, buffer: Buffer, contentType = 'application/octet-stream') {
    try {
      // For basic write with Content-Type metadata
      await this.s3Client.write(key, buffer, { type: contentType });
      this.logger.log(`Buffer uploaded to ${key} successfully`);
    } catch (error) {
      this.handleError('uploading buffer', key, error);
    }
  }

  /**
   * Upload JSON data to S3.
   */
  async uploadJson(key: string, data: any): Promise<void> {
    try {
      await this.s3Client.write(key, JSON.stringify(data, null, 2), {
        type: 'application/json',
      });
    } catch (error) {
      this.handleError('uploading JSON', key, error);
    }
  }

  /**
   * Delete a file from S3.
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3Client.file(key).delete();
      this.logger.log(`File ${key} deleted successfully`);
    } catch (error) {
      this.handleError('deleting file', key, error);
    }
  }

  /**
   * Generate a signed URL for temporary access.
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const file = this.s3Client.file(key);
      return await file.presign({ expiresIn });
    } catch (error) {
      this.handleError('generating signed URL', key, error);
    }
  }

  /**
   * Stream handling requires converting Web Streams (Bun) to Node Streams (NestJS).
   */
  async getFileStream(
    pathOrUrl: string,
  ): Promise<{ stream: Readable; contentType?: string; contentLength?: number }> {
    try {
      let key = pathOrUrl;
      if (pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('http://')) {
        try {
          const url = new URL(pathOrUrl);
          key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
        } catch (err) {
          this.logger.warn(`Invalid URL provided, using as key: ${pathOrUrl}`, err);
        }
      }

      const file = this.s3Client.file(key);

      // Bun returns a Web Standard ReadableStream
      const webStream = file.stream();

      // Convert to Node.js Readable for NestJS compatibility
      const nodeStream = Readable.fromWeb(webStream as any);

      return {
        stream: nodeStream,
        contentType: file.type,
        contentLength: file.size,
      };
    } catch (err) {
      this.handleError('fetching S3 stream', pathOrUrl, err);
    }
  }
}