import { ResendEmailService } from '../../infra/email/resend-email.service';
import { EmailProcessor } from './email.processor';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let resendEmailService: { send: jest.Mock };

  beforeEach(() => {
    resendEmailService = { send: jest.fn().mockResolvedValue(true) };
    processor = new EmailProcessor(
      resendEmailService as unknown as ResendEmailService,
    );
  });

  it('sends a password-reset email with the reset link in the HTML body', async () => {
    await processor.process({
      data: {
        type: 'password-reset',
        to: 'a@example.com',
        fullName: 'Nguyen Van A',
        resetUrl: 'https://dautaytoystore.vn/reset-password?token=abc',
      },
    } as never);

    expect(resendEmailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'a@example.com',
        subject: expect.stringContaining('Đặt lại mật khẩu'),
        html: expect.stringContaining('https://dautaytoystore.vn/reset-password?token=abc'),
      }),
    );
  });

  it('does nothing for an unknown job type', async () => {
    await processor.process({ data: { type: 'unknown' } } as never);

    expect(resendEmailService.send).not.toHaveBeenCalled();
  });
});
