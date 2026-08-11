import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { createHmac } from 'crypto';

@Injectable()
export class RazorpayService {
  private client: Razorpay | null = null;
  private readonly logger = new Logger(RazorpayService.name);

  constructor(private readonly config: ConfigService) {
    const keyId = config.get<string>('RAZORPAY_KEY_ID') || process.env.RAZORPAY_KEY_ID;
    const keySecret = config.get<string>('RAZORPAY_KEY_SECRET') || process.env.RAZORPAY_KEY_SECRET;
    if (keyId && keySecret) {
      this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    } else {
      this.logger.warn('Razorpay not configured; payment actions will be no-ops');
    }
  }

  async createOrder(amountInPaise: number, currency = 'INR', receipt?: string) {
    if (!this.client) throw new Error('Razorpay not configured');
    const order = await this.client.orders.create({ amount: amountInPaise, currency, receipt });
    return order;
  }

  verifySignature(payload: string, expectedSignature: string) {
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET') || process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error('Razorpay secret not configured');
    const generated = createHmac('sha256', keySecret).update(payload).digest('hex');
    return generated === expectedSignature;
  }
}
