import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ResendEmailService } from '../../infra/email/resend-email.service';
import { QUEUE_NAMES } from '../../infra/queue/queue.constants';
import { EmailJob } from './email.service';

function passwordResetHtml(fullName: string, resetUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Đặt lại mật khẩu</h2>
      <p>Xin chào ${fullName},</p>
      <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản DauTayToy Store của bạn.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#f97316;color:#fff;border-radius:8px;text-decoration:none;">
          Đặt lại mật khẩu
        </a>
      </p>
      <p>Nếu bạn không yêu cầu việc này, vui lòng bỏ qua email này.</p>
    </div>
  `;
}

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly resendEmailService: ResendEmailService) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<void> {
    switch (job.data.type) {
      case 'password-reset': {
        const sent = await this.resendEmailService.send({
          to: job.data.to,
          subject: 'Đặt lại mật khẩu DauTayToy Store',
          html: passwordResetHtml(job.data.fullName, job.data.resetUrl),
        });
        if (sent) {
          this.logger.log(`Password reset email sent to ${job.data.to}`);
        }
        return;
      }
      default:
        this.logger.warn(`Unknown email job type: ${JSON.stringify(job.data)}`);
    }
  }
}
