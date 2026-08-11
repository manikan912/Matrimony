import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

@Injectable()
export class TokensService {
  constructor(private readonly prisma: PrismaService) {}

  // Create a raw token, store its SHA256 hash in DB, return the raw token
  async createRefreshToken(userId: string, expiresInDays = 30) {
    const token = uuidv4();
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 3600 * 1000);
    await this.prisma.refreshToken.create({ data: { hashedToken, userId, expiresAt } });
    return token;
  }

  async revokeRefreshTokenByRaw(token: string) {
    const hashedToken = createHash('sha256').update(token).digest('hex');
    await this.prisma.refreshToken.updateMany({ where: { hashedToken }, data: { revoked: true } });
  }

  async findRefreshTokenByRaw(token: string) {
    const hashedToken = createHash('sha256').update(token).digest('hex');
    return this.prisma.refreshToken.findUnique({ where: { hashedToken } });
  }

  async createVerificationToken(userId: string, type: string, expiresInSeconds = 3600) {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    await this.prisma.verificationToken.create({
      data: { token, userId, type, expiresAt },
    });
    return token;
  }

  // Revoke any active verification tokens of a given type for a user
  async revokeActiveVerificationTokens(userId: string, type: string) {
    await this.prisma.verificationToken.updateMany({ where: { userId, type, used: false, expiresAt: { gt: new Date() } }, data: { used: true } });
  }

  // Create an OTP: store only the SHA256 hash in the token field, return the raw otp
  async createOtpForUser(userId: string, rawOtp: string, expiresInSeconds = 300) {
    const hashed = createHash('sha256').update(rawOtp).digest('hex');
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    // ensure no active OTPs remain
    await this.revokeActiveVerificationTokens(userId, 'otp');
    // token field is unique; use idempotent create
    return this.prisma.verificationToken.create({ data: { token: hashed, userId, type: 'otp', expiresAt } });
  }

  // Verify raw OTP for a user: returns the record if successful and marks it used
  async verifyOtpForUser(userId: string, rawOtp: string) {
    const hashed = createHash('sha256').update(rawOtp).digest('hex');
    const record = await this.prisma.verificationToken.findFirst({ where: { userId, type: 'otp', token: hashed } });
    if (!record) return { ok: false, reason: 'not_found' };
    if (record.used) return { ok: false, reason: 'used' };
    if (record.expiresAt < new Date()) return { ok: false, reason: 'expired' };
    // mark used
    await this.prisma.verificationToken.update({ where: { id: record.id }, data: { used: true } });
    return { ok: true, record };
  }

  async useVerificationToken(token: string) {
    const record = await this.prisma.verificationToken.findUnique({ where: { token } });
    if (!record) return null;
    if (record.used) return null;
    if (record.expiresAt < new Date()) return null;
    await this.prisma.verificationToken.update({ where: { token }, data: { used: true } });
    return record;
  }
}
