import { Module } from '@nestjs/common';
import { QueueModule } from '../../infra/queue/queue.module';
import { EmailProcessor } from './email.processor';
import { EmailService } from './email.service';

@Module({
  imports: [QueueModule],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService],
})
export class NotificationsModule {}
