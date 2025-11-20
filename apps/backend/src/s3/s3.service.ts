import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { PassThrough } from 'stream';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private readonly logger = new Logger(S3Service.name);
  private readonly bucket: string;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });

    this.logger.log(
      `S3Service initialized with bucket: ${this.bucket} in region: ${this.region}`,
    );
  }

  /**
   * Check whether an object exists in the bucket using HeadObject.
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (err: any) {
      // If the object is not found, S3 returns a 404; surface other errors
      const status = err?.$metadata?.httpStatusCode || err?.statusCode;
      if (status === 404) return false;
      // Some SDK errors use Code or name
      if (err?.name === 'NotFound' || err?.Code === 'NotFound') return false;
      throw err;
    }
  }

  /**
   * Get a file from S3 and return its contents as a buffer
   */
  async getFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];

      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`Error retrieving file ${key} from S3:`, error);
      throw error;
    }
  }

  /**
   * Get a file from S3 and return as JSON
   */
  async getFileAsJson(key: string): Promise<any> {
    try {
      const buffer = await this.getFile(key);
      return JSON.parse(buffer.toString('utf-8'));
    } catch (error) {
      this.logger.error(`Error retrieving JSON file ${key} from S3:`, error);
      throw error;
    }
  }

  /**
   * List all files in a specific prefix/folder
   */
  async listFiles(prefix: string = ''): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);
      return (response.Contents || []).map((obj) => obj.Key);
    } catch (error) {
      this.logger.error(`Error listing files with prefix ${prefix}:`, error);
      throw error;
    }
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(key: string, data: Buffer | string): Promise<void> {
    try {
      const body = typeof data === 'string' ? Buffer.from(data) : data;

      // For large buffers use multipart Upload to avoid memory limits and to support large files
      const MULTIPART_THRESHOLD = 5 * 1024 * 1024; // 5MB
      if (Buffer.isBuffer(body) && body.length >= MULTIPART_THRESHOLD) {
        const upload = new Upload({
          client: this.s3Client,
          params: {
            Bucket: this.bucket,
            Key: key,
            Body: body,
          },
        });

        await upload.done();
      } else {
        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
        });

        await this.s3Client.send(command);
      }
      this.logger.log(`File ${key} uploaded successfully`);
    } catch (error) {
      this.logger.error(`Error uploading file ${key} to S3:`, error);
      throw error;
    }
  }

  /**
   * Upload a Buffer (streamed/multipart) to S3 using the higher-level Upload helper.
   */
  async uploadBuffer(key: string, buffer: Buffer, contentType = 'application/octet-stream') {
    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        },
      });

      await upload.done();
      this.logger.log(`Buffer uploaded to ${key} successfully`);
    } catch (error) {
      this.logger.error(`Error uploading buffer ${key} to S3:`, error);
      throw error;
    }
  }

  /**
   * Upload JSON data to S3
   */
  async uploadJson(key: string, data: any): Promise<void> {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      // Use PutObjectCommand directly so we can set ContentType for JSON
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: Buffer.from(jsonString),
        ContentType: 'application/json',
      });

      await this.s3Client.send(command);
    } catch (error) {
      this.logger.error(`Error uploading JSON file ${key} to S3:`, error);
      throw error;
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File ${key} deleted successfully`);
    } catch (error) {
      this.logger.error(`Error deleting file ${key} from S3:`, error);
      throw error;
    }
  }

  /**
   * Generate a signed URL for temporary access to a file
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return url;
    } catch (error) {
      this.logger.error(`Error generating signed URL for ${key}:`, error);
      throw error;
    }
  }
  async getFileStream(pathOrUrl: string): Promise<{ stream: PassThrough; contentType?: string; contentLength?: number }> {
    try {
      let key = pathOrUrl;

      // If a full S3 URL is provided, extract the key
      if (pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('http://')) {
        try {
          const url = new URL(pathOrUrl);
          key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
        } catch (err) {
          this.logger.warn(`Invalid URL provided, using as key: ${pathOrUrl}`);
        }
      }

      // Get metadata
      const head = await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));

      // Get object
      const getObjectResp = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));

      const stream = new PassThrough();
      if (getObjectResp.Body) {
        (getObjectResp.Body as any).pipe(stream);
      }

      return {
        stream,
        contentType: head.ContentType,
        contentLength: head.ContentLength,
      };
    } catch (err) {
      this.logger.error(`Error fetching S3 object from path or URL "${pathOrUrl}":`, err);
      throw err;
    }
  }
}
