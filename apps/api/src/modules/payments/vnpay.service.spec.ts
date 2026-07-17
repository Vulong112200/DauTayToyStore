import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildVnpaySecureHash, verifyVnpaySignature } from '../../common/utils/vnpay.util';
import { AppConfiguration } from '../../config/configuration';
import { VnpayService } from './vnpay.service';

describe('VnpayService', () => {
  let service: VnpayService;
  let configService: { get: jest.Mock };

  const HASH_SECRET = 'test-secret-key';
  const configuredValues: Record<string, string> = {
    'vnpay.tmnCode': 'DEMO001',
    'vnpay.hashSecret': HASH_SECRET,
    'vnpay.paymentUrl': 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    'vnpay.returnUrl': 'http://localhost:4000/api/payments/vnpay/return',
  };

  beforeEach(() => {
    configService = { get: jest.fn((key: string) => configuredValues[key]) };
    service = new VnpayService(configService as unknown as ConfigService<AppConfiguration, true>);
  });

  describe('buildPaymentUrl', () => {
    it('builds a URL against the configured payment endpoint with a valid signature', () => {
      const url = service.buildPaymentUrl({
        orderNumber: 'DTT12345678',
        amount: 230_000,
        ipAddr: '203.0.113.5',
      });

      expect(url.startsWith('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?')).toBe(true);

      const query = Object.fromEntries(new URLSearchParams(url.split('?')[1]));
      expect(query.vnp_TxnRef).toBe('DTT12345678');
      expect(query.vnp_Amount).toBe('23000000'); // amount * 100
      expect(query.vnp_TmnCode).toBe('DEMO001');
      expect(verifyVnpaySignature(query, HASH_SECRET)).toBe(true);
    });

    it('throws when VNPAY_TMN_CODE/HASH_SECRET/RETURN_URL are not configured', () => {
      configService.get.mockImplementation((key: string) =>
        key === 'vnpay.tmnCode' ? '' : configuredValues[key],
      );

      expect(() =>
        service.buildPaymentUrl({ orderNumber: 'DTT1', amount: 100_000, ipAddr: '127.0.0.1' }),
      ).toThrow(InternalServerErrorException);
    });

    it('throws when the amount exceeds VNPay\'s per-transaction ceiling', () => {
      expect(() =>
        service.buildPaymentUrl({ orderNumber: 'DTT1', amount: 200_000_000, ipAddr: '127.0.0.1' }),
      ).toThrow(BadRequestException);
    });
  });

  describe('parseAndVerifyCallback', () => {
    it('marks a callback invalid when the signature does not match', () => {
      const result = service.parseAndVerifyCallback({
        vnp_TxnRef: 'DTT1',
        vnp_ResponseCode: '00',
        vnp_Amount: '10000000',
        vnp_TransactionNo: 'VNP1',
        vnp_SecureHash: 'not-a-real-hash',
      });

      expect(result.valid).toBe(false);
    });

    it('marks a callback valid and parses fields when the signature matches', () => {
      // Simulate VNPay echoing the transaction back with its own response fields, signed the
      // same way VNPay itself would sign it.
      const callbackFields = {
        vnp_TxnRef: 'DTT1',
        vnp_Amount: '10000000',
        vnp_ResponseCode: '00',
        vnp_TransactionNo: 'VNP987',
      };
      const vnp_SecureHash = buildVnpaySecureHash(callbackFields, HASH_SECRET);

      const result = service.parseAndVerifyCallback({ ...callbackFields, vnp_SecureHash });

      expect(result.valid).toBe(true);
      expect(result.orderNumber).toBe('DTT1');
      expect(result.responseCode).toBe('00');
      expect(result.amountVnd).toBe(100_000);
      expect(result.transactionNo).toBe('VNP987');
    });
  });
});
