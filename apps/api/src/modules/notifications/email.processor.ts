import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../infra/queue/queue.constants';
import { EmailJob } from './email.service';

/**
 * Phase 1 stub: logs the email that would be sent instead of calling a real
 * provider (e.g. SES/SendGrid). Swap the `process` body for a real provider
 * call in a later phase without touching producers.
 */
@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJob>): Promise<void> {
    switch (job.data.type) {
      case 'password-reset':
        this.logger.log(
          `[stub email] Password reset for ${job.data.to} (${job.data.fullName}): ${job.data.resetUrl}`,
        );
        return;
      default:
        this.logger.warn(`Unknown email job type: ${JSON.stringify(job.data)}`);
    }
  }
}
