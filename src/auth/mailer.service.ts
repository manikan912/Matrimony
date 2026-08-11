import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST') || process.env.SMTP_HOST;
    const port = parseInt(config.get<string>('SMTP_PORT') || process.env.SMTP_PORT || '587', 10);
    const user = config.get<string>('SMTP_USER') || process.env.SMTP_USER;
    const pass = config.get<string>('SMTP_PASS') || process.env.SMTP_PASS;

    if (host && user) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
    }
  }

  async sendMail(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.warn('Transporter not configured; skipping email send');
      return;
    }

    const from = this.config.get<string>('EMAIL_FROM') || process.env.EMAIL_FROM || 'no-reply@example.com';
    await this.transporter.sendMail({ from, to, subject, html });
  }

  async sendVerification(to: string, token: string) {
    const url = `${this.config.get<string>('APP_URL') || process.env.APP_URL || 'http://localhost:3000'}/auth/verify?token=${token}`;
    const html = `<p>Please verify your account by clicking <a href="${url}">here</a>.</p>`;
    await this.sendMail(to, 'Verify your account', html);
  }

  async sendPasswordReset(to: string, token: string) {
    const url = `${this.config.get<string>('APP_URL') || process.env.APP_URL || 'http://localhost:3000'}/auth/password/reset?token=${token}`;
    const html = `<p>Reset your password by clicking <a href="${url}">here</a>.</p>`;
    await this.sendMail(to, 'Reset your password', html);
  }
}
