import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient | null = null;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private readonly config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL') || process.env.SUPABASE_URL;
    const key = config.get<string>('SUPABASE_KEY') || process.env.SUPABASE_KEY;
    if (url && key) {
      this.client = createClient(url, key);
    } else {
      this.logger.warn('Supabase not configured; storage actions will be no-ops');
    }
  }

  // Generate a signed upload URL or return null if not configured
  async createSignedUpload(bucket: string, path: string, expiresInSeconds = 3600) {
    if (!this.client) return null;
    const { data, error } = await this.client.storage.from(bucket).createSignedUploadUrl(path);
    if (error) {
      this.logger.error('Supabase createSignedUpload error', error);
      return null;
    }
    return data;
  }
}
