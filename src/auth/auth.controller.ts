import { Body, Controller, Get, Post, HttpCode, HttpStatus, Res, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import type { Response, Request } from 'express';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('hello')
  hello() {
    return this.authService.hello();
  }

  @Get('register')
  registerForm() {
    return {
      message: 'Use POST /auth/register with a JSON body to register a user.',
      example: {
        username: 'your-username',
        password: 'your-password'
      }
    };
  }
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body);
    // Set refresh token in HttpOnly cookie; do not return it in body
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    res.cookie('refresh_token', result.refreshToken, cookieOptions);
    return { accessToken: result.accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.refresh_token || req.body?.refreshToken;
    if (!raw) {
      throw new UnauthorizedException('No refresh token provided');
    }
    const result = await this.authService.refresh(raw);
    // rotate cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    };
    res.cookie('refresh_token', result.refreshToken, cookieOptions);
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.refresh_token || null;
    if (raw) {
      await this.authService.logout(raw);
    }
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
    return { success: true };
  }

  @Post('password/request')
  @HttpCode(HttpStatus.OK)
  requestPasswordReset(@Body() body: RequestResetDto) {
    return this.authService.requestPasswordReset(body);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(@Body() body: VerifyTokenDto) {
    return this.authService.verifyToken(body);
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60 } })
  async sendOtp(@Body() body: SendOtpDto) {
    return this.authService.sendOtp(body);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 6, ttl: 300 } })
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body);
  }
}