import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefreshTokenCleanupService {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);
  constructor(private readonly prisma: PrismaService) {}

  // Run daily at 03:00
  @Cron('0 3 * * *')
  async handleCron() {
    try {
      const result = await this.prisma.refreshToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { revoked: true }] } });
      this.logger.log(`Cleaned up ${result.count} expired/revoked refresh tokens`);
    } catch (e) {
      this.logger.error('Error cleaning refresh tokens', e as any);
    }
  }
}
