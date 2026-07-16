import { Module } from '@nestjs/common';
import { ResendEmailService } from '../../infra/email/resend-email.service';
import { QueueModule } from '../../infra/queue/queue.module';
import { EmailProcessor } from './email.processor';
import { EmailService } from './email.service';

@Module({
  imports: [QueueModule],
  providers: [EmailService, EmailProcessor, ResendEmailService],
  exports: [EmailService],
})
export class NotificationsModule {}
