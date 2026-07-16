import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../infra/queue/queue.constants';

export interface PasswordResetEmailJob {
  type: 'password-reset';
  to: string;
  fullName: string;
  resetUrl: string;
}

export type EmailJob = PasswordResetEmailJob;

@Injectable()
export class EmailService {
  constructor(@InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue<EmailJob>) {}

  async sendPasswordResetEmail(params: {
    to: string;
    fullName: string;
    resetUrl: string;
  }): Promise<void> {
    await this.emailQueue.add('password-reset', {
      type: 'password-reset',
      to: params.to,
      fullName: params.fullName,
      resetUrl: params.resetUrl,
    });
  }
}
