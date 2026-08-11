import { Injectable, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { TokensService } from './tokens.service';
import { MailerService } from './mailer.service';
import { SmsService } from '../sms/sms.service';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly tokens: TokensService,
    private readonly mailer: MailerService,
    private readonly sms: SmsService,
    private readonly config: ConfigService,
  ) {}

  hello() {
    return {
      success: true,
      message: 'Hello from Auth API',
    };
  }

  async register(body: any) {
    if (!body || !body.mobile) {
      throw new BadRequestException('mobile is required');
    }

    if (!body.password) {
      throw new BadRequestException('password is required');
    }

    const existing = await this.prisma.user.findUnique({
      where: { mobile: body.mobile },
    });

    if (existing) {
      throw new ConflictException('Mobile number already registered');
    }

    const hashed = await argon2.hash(body.password);

    const user = await this.prisma.user.create({
      data: {
        mobile: body.mobile,
        name: body.name ?? null,
        password: hashed,
      },
    });

    // create and send verification token if email provided
    if (body.email) {
      const token = await this.tokens.createVerificationToken(user.id, 'email_verification', 60 * 60 * 24);
      try {
        await this.mailer.sendVerification(body.email, token);
      } catch (e) {
        // don't fail registration if email sending fails
      }
    }

    return {
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        mobile: user.mobile,
        name: user.name,
      },
    };
  }

  async login(body: any) {
    if (!body || !body.mobile || !body.password) {
      throw new BadRequestException('mobile and password are required');
    }

    const user = await this.prisma.user.findUnique({ where: { mobile: body.mobile } });
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await argon2.verify(user.password, body.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, mobile: user.mobile };
    const accessToken = this.jwtService.sign(payload);
    const refresh = await this.tokens.createRefreshToken(user.id);

    return { accessToken, refreshToken: refresh };
  }

  async refresh(refreshToken: string) {
    const record = await this.tokens.findRefreshTokenByRaw(refreshToken);
    if (!record || record.revoked) throw new UnauthorizedException('Invalid refresh token');
    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) throw new UnauthorizedException('Invalid refresh token');

    const payload = { sub: user.id, mobile: user.mobile };
    const accessToken = this.jwtService.sign(payload);
    // rotate refresh token: revoke old and issue a new one
    await this.tokens.revokeRefreshTokenByRaw(refreshToken);
    const newRefresh = await this.tokens.createRefreshToken(user.id);
    return { accessToken, refreshToken: newRefresh };
  }

  async requestPasswordReset(body: any) {
    const user = body.mobile
      ? await this.prisma.user.findUnique({ where: { mobile: body.mobile } })
      : body.email
      ? await this.prisma.user.findUnique({ where: { email: body.email } })
      : null;

    if (!user) throw new BadRequestException('User not found');

    const token = await this.tokens.createVerificationToken(user.id, 'password_reset', 3600);
    if (user.email) {
      try {
        await this.mailer.sendPasswordReset(user.email, token);
      } catch (e) {}
    }
    // For mobile-based flows, token should be sent via SMS provider (not implemented)
    return { success: true, message: 'Password reset token generated' };
  }

  async resetPassword(body: any) {
    const record = await this.tokens.useVerificationToken(body.token);
    if (!record) throw new BadRequestException('Invalid or expired token');
    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) throw new BadRequestException('User not found');

    const hashed = await argon2.hash(body.newPassword);
    await this.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    return { success: true, message: 'Password reset successful' };
  }

  async verifyToken(body: any) {
    const record = await this.tokens.useVerificationToken(body.token);
    if (!record) throw new BadRequestException('Invalid or expired token');
    if (record.type === 'email_verification') {
      await this.prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } });
    }
    return { success: true };
  }

  // Send OTP to mobile for verification. Does not send SMS in production unless Twilio configured.
  async sendOtp(body: { mobile: string }) {
    const user = await this.prisma.user.findUnique({ where: { mobile: body.mobile } });
    if (!user) throw new BadRequestException('User not found');

    // Generate secure 6-digit OTP
    const rawOtp = (await import('crypto')).randomInt(0, 1000000).toString().padStart(6, '0');
    // Create OTP record storing only the hash
    await this.tokens.createOtpForUser(user.id, rawOtp, 300);

    // If Twilio configured, send SMS; otherwise skip. In development, optionally return OTP in response.
    const twilioConfigured = this.config.get<string>('TWILIO_ACCOUNT_SID') || process.env.TWILIO_ACCOUNT_SID;
    if (twilioConfigured) {
      const to = user.mobile;
      try {
        await this.sms.sendSms(to, `Your verification code is ${rawOtp}`);
      } catch (e) {
        // swallow SMS errors to avoid blocking
      }
      return { success: true, message: 'OTP sent' };
    }

    // Development-only mechanism: return OTP when DEV_OTP enabled
    const devOtpEnabled = this.config.get<string>('DEV_OTP') === 'true' || process.env.DEV_OTP === 'true';
    if (devOtpEnabled) {
      return { success: true, message: 'OTP generated (development only)', dev_otp: rawOtp };
    }

    return { success: true, message: 'OTP generated' };
  }

  // Verify OTP for a mobile number
  async verifyOtp(body: { mobile: string; otp: string }) {
    const user = await this.prisma.user.findUnique({ where: { mobile: body.mobile } });
    if (!user) throw new BadRequestException('User not found');

    // Use tokens service to verify OTP
    const result = await this.tokens.verifyOtpForUser(user.id, body.otp);
    if (!result.ok) {
      if (result.reason === 'not_found') throw new BadRequestException('Invalid OTP');
      if (result.reason === 'used') throw new BadRequestException('OTP already used');
      if (result.reason === 'expired') throw new BadRequestException('OTP expired');
      throw new BadRequestException('Invalid OTP');
    }

    const record = result.record;
    if (!record) throw new BadRequestException('Invalid OTP');

    // Mark user verified in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.verificationToken.update({ where: { id: record.id }, data: { used: true } });
      await tx.user.update({ where: { id: user.id }, data: { isVerified: true } });
    });

    return { success: true, message: 'Mobile verified' };
  }

  async logout(rawRefreshToken: string) {
    if (!rawRefreshToken) return;
    await this.tokens.revokeRefreshTokenByRaw(rawRefreshToken);
  }
}