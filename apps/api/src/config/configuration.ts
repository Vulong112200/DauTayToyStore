import { EnvConfig } from './env.validation';

export function buildConfiguration(env: EnvConfig) {
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    apiPrefix: env.API_PREFIX,
    corsOrigin: env.CORS_ORIGIN,
    database: {
      url: env.DATABASE_URL,
    },
    redis: {
      url: env.REDIS_URL,
    },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshSecret: env.JWT_REFRESH_SECRET,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackUrl: env.GOOGLE_CALLBACK_URL,
    },
    r2: {
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucketName: env.R2_BUCKET_NAME,
      publicUrl: env.R2_PUBLIC_URL,
    },
    email: {
      resendApiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
    },
    vnpay: {
      tmnCode: env.VNPAY_TMN_CODE,
      hashSecret: env.VNPAY_HASH_SECRET,
      paymentUrl: env.VNPAY_PAYMENT_URL,
      returnUrl: env.VNPAY_RETURN_URL,
    },
    throttle: {
      ttlMs: env.THROTTLE_TTL_MS,
      limit: env.THROTTLE_LIMIT,
    },
  } as const;
}

export type AppConfiguration = ReturnType<typeof buildConfiguration>;
