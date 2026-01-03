import { Controller, Post,Get,Req, Body, HttpException, HttpStatus,UnauthorizedException, Res } from '@nestjs/common';
import { UsersService } from './users/users.service';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Request as ExpressRequest } from 'express';
import bcrypt from 'bcryptjs';

@Controller()
export class AuthController {
  constructor(private usersService: UsersService,
    private jwtService: JwtService,) {}

    @Post('login')
    async login(@Body() body: { email: string; password: string }) {
      const { email, password } = body;
    
      const user = await this.usersService.findByEmail(email);
      if (!user) throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    
      // Sign JWT
      const token = this.jwtService.sign({ sub: user.id, email: user.email });
    
      return {
        token,
        user: { id: user.id, email: user.email, name: user.name },
      };
    } 

    @Get('me')
async me(@Req() req: ExpressRequest) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    throw new UnauthorizedException();
  }

  const token = auth.replace('Bearer ', '');

  try {
    const payload = this.jwtService.verify(token);
    return { id: payload.sub, email: payload.email };
  } catch {
    throw new UnauthorizedException();
  }
}

  }