import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: typeof data === 'string' ? Buffer.from(data) : data,
      });

      await this.s3Client.send(command);
      this.logger.log(`File ${key} uploaded successfully`);
    } catch (error) {
      this.logger.error(`Error uploading file ${key} to S3:`, error);
      throw error;
    }
  }

  /**
   * Upload JSON data to S3
   */
  async uploadJson(key: string, data: any): Promise<void> {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      await this.uploadFile(key, jsonString);
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
}
