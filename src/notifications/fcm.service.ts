import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService {
  private initialized = false;
  private readonly logger = new Logger(FcmService.name);

  constructor(private readonly config: ConfigService) {
    const credPath = config.get<string>('FIREBASE_CREDENTIALS') || process.env.FIREBASE_CREDENTIALS;
    if (credPath) {
      try {
        const serviceAccount = require(credPath);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        this.initialized = true;
      } catch (e) {
        this.logger.warn('Failed to initialize Firebase admin', e as any);
      }
    } else {
      this.logger.warn('FIREBASE_CREDENTIALS not set; FCM disabled');
    }
  }

  async sendToDevice(token: string, payload: admin.messaging.MessagingPayload) {
    if (!this.initialized) return;
    try {
      await admin.messaging().sendToDevice(token, payload as any);
    } catch (e) {
      this.logger.error('FCM send error', e as any);
    }
  }
}
