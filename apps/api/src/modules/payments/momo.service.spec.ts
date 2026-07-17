import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildMomoCallbackSignature } from '../../common/utils/momo.util';
import { AppConfiguration } from '../../config/configuration';
import { MomoService } from './momo.service';

describe('MomoService', () => {
  let service: MomoService;
  let configService: { get: jest.Mock };
  let fetchMock: jest.Mock;

  const ACCESS_KEY = 'F8BBA842ECF85';
  const SECRET_KEY = 'test-momo-secret';
  const configuredValues: Record<string, string> = {
    'momo.partnerCode': 'MOMO',
    'momo.accessKey': ACCESS_KEY,
    'momo.secretKey': SECRET_KEY,
    'momo.endpoint': 'https://test-payment.momo.vn/v2/gateway/api/create',
    'momo.redirectUrl': 'http://localhost:4000/api/payments/momo/return',
    'momo.ipnUrl': 'http://localhost:4000/api/payments/momo/ipn',
  };

  beforeEach(() => {
    configService = { get: jest.fn((key: string) => configuredValues[key]) };
    service = new MomoService(configService as unknown as ConfigService<AppConfiguration, true>);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('createPayment', () => {
    it('returns payUrl on a successful MoMo response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ resultCode: 0, payUrl: 'https://test-payment.momo.vn/pay/abc' }),
      });

      const payUrl = await service.createPayment({ orderNumber: 'DTT1', amount: 230_000 });

      expect(payUrl).toBe('https://test-payment.momo.vn/pay/abc');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://test-payment.momo.vn/v2/gateway/api/create',
        expect.objectContaining({ method: 'POST' }),
      );
      const [, requestInit] = fetchMock.mock.calls[0];
      const requestBody = JSON.parse(requestInit.body);
      expect(requestBody.orderId).toBe('DTT1');
      expect(requestBody.requestId).toBe('DTT1');
      expect(requestBody.amount).toBe(230_000);
      expect(requestBody.requestType).toBe('captureWallet');
      expect(typeof requestBody.signature).toBe('string');
    });

    it('throws when MoMo credentials are not configured', async () => {
      configService.get.mockImplementation((key: string) =>
        key === 'momo.partnerCode' ? '' : configuredValues[key],
      );

      await expect(service.createPayment({ orderNumber: 'DTT1', amount: 100_000 })).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws when the amount is below the minimum (1,000 VND)', async () => {
      await expect(service.createPayment({ orderNumber: 'DTT1', amount: 500 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when the amount exceeds the maximum (50,000,000 VND)', async () => {
      await expect(
        service.createPayment({ orderNumber: 'DTT1', amount: 60_000_000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when MoMo returns a non-zero resultCode', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ resultCode: 1017, message: 'Transaction rejected' }),
      });

      await expect(service.createPayment({ orderNumber: 'DTT1', amount: 100_000 })).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws when the HTTP call itself is not ok', async () => {
      fetchMock.mockResolvedValue({ ok: false, json: () => Promise.resolve(null) });

      await expect(service.createPayment({ orderNumber: 'DTT1', amount: 100_000 })).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('parseAndVerifyCallback', () => {
    const callbackFields = {
      partnerCode: 'MOMO',
      orderId: 'DTT1',
      requestId: 'DTT1',
      amount: '100000',
      orderInfo: 'Thanh toan don hang DTT1',
      orderType: 'momo_wallet',
      transId: '2000123456789',
      resultCode: '0',
      message: 'Successful.',
      payType: 'webApp',
      responseTime: '1735689600000',
      extraData: '',
    };

    it('marks a callback valid and parses fields when the signature matches', () => {
      const signature = buildMomoCallbackSignature(
        { accessKey: ACCESS_KEY, ...callbackFields },
        SECRET_KEY,
      );

      const result = service.parseAndVerifyCallback({ ...callbackFields, signature });

      expect(result.valid).toBe(true);
      expect(result.orderNumber).toBe('DTT1');
      expect(result.isSuccess).toBe(true);
      expect(result.amountVnd).toBe(100_000);
      expect(result.transactionNo).toBe('2000123456789');
    });

    it('marks a callback invalid when the signature does not match', () => {
      const result = service.parseAndVerifyCallback({ ...callbackFields, signature: 'bad-signature' });

      expect(result.valid).toBe(false);
    });

    it('reports isSuccess=false for a non-zero resultCode', () => {
      const failedFields = { ...callbackFields, resultCode: '1006' };
      const signature = buildMomoCallbackSignature(
        { accessKey: ACCESS_KEY, ...failedFields },
        SECRET_KEY,
      );

      const result = service.parseAndVerifyCallback({ ...failedFields, signature });

      expect(result.valid).toBe(true);
      expect(result.isSuccess).toBe(false);
    });
  });
});
