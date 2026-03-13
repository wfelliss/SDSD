import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(private readonly configService: ConfigService) {}

  validate(providedKey: string): boolean {
    const expectedKey = this.configService.get<string>('ESP32_API_KEY');
    if (!expectedKey || !providedKey) return false;

    const expected = Buffer.from(expectedKey);
    const provided = Buffer.from(providedKey);
    if (expected.length !== provided.length) return false;

    return crypto.timingSafeEqual(expected, provided);
  }
}
