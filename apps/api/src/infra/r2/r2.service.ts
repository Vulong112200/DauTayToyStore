import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../../config/configuration';

@Injectable()
export class R2Service {
  private client: S3Client | null = null;

  constructor(private readonly configService: ConfigService<AppConfiguration, true>) {}

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.configService.get('r2.bucketName', { infer: true }),
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    const publicUrl = this.configService.get('r2.publicUrl', { infer: true });
    return `${publicUrl.replace(/\/$/, '')}/${key}`;
  }

  async remove(key: string): Promise<void> {
    await this.getClient().send(
      new DeleteObjectCommand({
        Bucket: this.configService.get('r2.bucketName', { infer: true }),
        Key: key,
      }),
    );
  }

  /** Lazily constructed so booting the API without R2 credentials configured (e.g. local dev
   * before Cloudflare is set up) doesn't fail app startup — only actually uploading fails. */
  private getClient(): S3Client {
    if (this.client) return this.client;

    const accountId = this.configService.get('r2.accountId', { infer: true });
    const accessKeyId = this.configService.get('r2.accessKeyId', { infer: true });
    const secretAccessKey = this.configService.get('r2.secretAccessKey', { infer: true });

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException(
        'Cloudflare R2 chưa được cấu hình (thiếu R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY)',
      );
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    return this.client;
  }
}
