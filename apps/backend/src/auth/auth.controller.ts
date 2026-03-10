
import { Body, Controller,Get,Request, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorator';
import { SignInDto } from './dto/sign-in.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto:SignInDto ) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @Get('me')
  getCurrentUser(@Request() req) {
    return req.user;
  }
  
}
