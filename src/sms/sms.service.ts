import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';

@Injectable()
export class SmsService {
  private client: Twilio.Twilio | null = null;
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {
    const accountSid = config.get<string>('TWILIO_ACCOUNT_SID') || process.env.TWILIO_ACCOUNT_SID;
    const authToken = config.get<string>('TWILIO_AUTH_TOKEN') || process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      this.client = Twilio(accountSid, authToken);
    } else {
      this.logger.warn('Twilio not configured; SMS sending will be skipped');
    }
  }

  async sendSms(to: string, body: string) {
    if (!this.client) return;
    const from = this.config.get<string>('TWILIO_FROM') || process.env.TWILIO_FROM;
    if (!from) return this.logger.warn('TWILIO_FROM not set; skipping SMS');
    await this.client.messages.create({ to, from, body });
  }
}
