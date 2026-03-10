import { Controller, Post, Get, Body, UnauthorizedException, Res, Req, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { Response, Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService, 
    private jwtService: JwtService ){}

    async signIn(
      email: string,
      password: string,
    ): Promise<{ access_token: string}>{     
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Sign JWT
    const payload = { sub: user.id, username: user.name};
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}

  