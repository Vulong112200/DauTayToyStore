import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../../config/configuration';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Thin wrapper over Resend's HTTP API (no SDK dependency needed — one `fetch` call).
 * Unlike `R2Service`, a missing provider config doesn't throw: outbound email is optional
 * in local/dev environments the way R2 credentials aren't (nothing else depends on it
 * booting), so `send()` logs a clear warning and returns `false` instead of failing the
 * BullMQ job. A real send failure (bad key, Resend API error) still throws, so that
 * failure is visible instead of silently swallowed.
 */
@Injectable()
export class ResendEmailService {
  private readonly logger = new Logger(ResendEmailService.name);

  constructor(private readonly configService: ConfigService<AppConfiguration, true>) {}

  async send(params: SendEmailParams): Promise<boolean> {
    const apiKey = this.configService.get('email.resendApiKey', { infer: true });
    const from = this.configService.get('email.from', { infer: true });

    if (!apiKey || !from) {
      this.logger.warn(
        `Không gửi email tới ${params.to}: thiếu cấu hình RESEND_API_KEY/EMAIL_FROM`,
      );
      return false;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend API trả về lỗi (${response.status}): ${body}`);
    }

    return true;
  }
}
