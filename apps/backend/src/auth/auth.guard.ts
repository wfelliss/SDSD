import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY, IS_API_KEY_AUTH } from './decorator';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private apiKeyService: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const isApiKeyAuth = this.reflector.getAllAndOverride<boolean>(IS_API_KEY_AUTH, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isApiKeyAuth) {
      const request = context.switchToHttp().getRequest();
      const apiKey = request.headers['x-api-key'] as string | undefined;
      if (!apiKey || !this.apiKeyService.validate(apiKey)) {
        this.logger.warn('API key validation failed');
        throw new UnauthorizedException();
      }
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token =
      request.cookies?.access_token ?? this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(token);
      request['user'] = payload;
    } catch (error) {
      this.logger.warn(`JWT verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractBearerToken(request: Record<string, any>): string | undefined {
    const authHeader = request.headers?.authorization as string | undefined;
    if (!authHeader) return undefined;
    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
    return token;
  }
}
