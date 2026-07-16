import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../../config/configuration';
import { ResendEmailService } from './resend-email.service';

describe('ResendEmailService', () => {
  let service: ResendEmailService;
  let configService: { get: jest.Mock };
  let fetchMock: jest.Mock;

  const configuredValues: Record<string, string> = {
    'email.resendApiKey': 're_test_key',
    'email.from': 'DauTayToy Store <no-reply@dautaytoystore.vn>',
  };

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    configService = { get: jest.fn((key: string) => configuredValues[key]) };
    service = new ResendEmailService(
      configService as unknown as ConfigService<AppConfiguration, true>,
    );
  });

  it('returns false without calling the API when RESEND_API_KEY/EMAIL_FROM are not configured', async () => {
    configService.get.mockImplementation((key: string) =>
      key === 'email.resendApiKey' ? '' : configuredValues[key],
    );

    const result = await service.send({ to: 'a@example.com', subject: 'Hi', html: '<p>Hi</p>' });

    expect(result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the email via the Resend API when configured', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    const result = await service.send({ to: 'a@example.com', subject: 'Hi', html: '<p>Hi</p>' });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer re_test_key' }),
      }),
    );
  });

  it('throws when the Resend API responds with a non-ok status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid api key' });

    await expect(
      service.send({ to: 'a@example.com', subject: 'Hi', html: '<p>Hi</p>' }),
    ).rejects.toThrow('Resend API trả về lỗi (401)');
  });
});
