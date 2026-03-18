import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(private readonly configService: ConfigService) {}

  validate(providedKey: string): boolean {
    const expectedKey = this.configService.get<string>('ESP32_API_KEY');
    if (!expectedKey || !providedKey) return false;

    const expectedKeyHash = crypto.createHash('sha256').update(expectedKey).digest();
    const providedKeyHash = crypto.createHash('sha256').update(providedKey).digest();

    return crypto.timingSafeEqual(expectedKeyHash, providedKeyHash);
  }
}
