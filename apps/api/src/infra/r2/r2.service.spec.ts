import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../../config/configuration';
import { R2Service } from './r2.service';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

describe('R2Service', () => {
  let service: R2Service;
  let configService: { get: jest.Mock };

  const configuredValues: Record<string, string> = {
    'r2.bucketName': 'dautaytoy-media',
    'r2.publicUrl': 'https://media.dautaytoystore.vn',
    'r2.accountId': 'account-1',
    'r2.accessKeyId': 'key-1',
    'r2.secretAccessKey': 'secret-1',
  };

  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({});
    configService = { get: jest.fn((key: string) => configuredValues[key]) };
    service = new R2Service(configService as unknown as ConfigService<AppConfiguration, true>);
  });

  describe('upload', () => {
    it('uploads the object and returns the public URL', async () => {
      const url = await service.upload('media/file.png', Buffer.from('data'), 'image/png');

      expect(sendMock).toHaveBeenCalled();
      expect(url).toBe('https://media.dautaytoystore.vn/media/file.png');
    });

    it('throws when R2 credentials are not configured', async () => {
      configService.get.mockImplementation((key: string) =>
        key === 'r2.accountId' ? '' : configuredValues[key],
      );

      await expect(
        service.upload('media/file.png', Buffer.from('data'), 'image/png'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    it('sends a delete command for the given key', async () => {
      await service.remove('media/file.png');

      expect(sendMock).toHaveBeenCalled();
    });
  });
});
