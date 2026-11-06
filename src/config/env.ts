import 'server-only';

import { z } from 'zod';

/**
 * Foundation env contract. Provider secrets become required when the
 * corresponding feature is wired (auth, DB, Redis, Cloudinary, email).
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    AUTH_SECRET: z.string().min(1).optional(),
    DATABASE_URL: z.string().min(1).optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
    CLOUDINARY_API_KEY: z.string().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().min(1).optional(),
    EMAIL_FROM: z.string().email().optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    PAYMENT_APP_URL: z.string().url().optional(),
    ARCA_TEST_MODE: z.enum(['true', 'false']).optional(),
    ARCA_BASE_URL: z.string().url().optional(),
    ARCA_LIVE_BASE_URL: z.string().url().optional(),
    ARCA_USERNAME: z.string().min(1).optional(),
    ARCA_PASSWORD: z.string().min(1).optional(),
    ARCA_LIVE_USERNAME: z.string().min(1).optional(),
    ARCA_LIVE_PASSWORD: z.string().min(1).optional(),
    IDRAM_TEST_MODE: z.enum(['true', 'false']).optional(),
    IDRAM_REC_ACCOUNT: z.string().min(1).optional(),
    IDRAM_SECRET_KEY: z.string().min(1).optional(),
    IDRAM_LIVE_REC_ACCOUNT: z.string().min(1).optional(),
    IDRAM_LIVE_SECRET_KEY: z.string().min(1).optional(),
  })
  .superRefine((env, context) => {
    const cloudinaryValues = [
      env.CLOUDINARY_CLOUD_NAME,
      env.CLOUDINARY_API_KEY,
      env.CLOUDINARY_API_SECRET,
    ];
    const configuredValues = cloudinaryValues.filter(Boolean).length;
    if (configuredValues > 0 && configuredValues < cloudinaryValues.length) {
      context.addIssue({
        code: 'custom',
        message: 'Cloudinary credentials must be configured together.',
        path: ['CLOUDINARY_CLOUD_NAME'],
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

/** Empty or whitespace-only env values → undefined (optional fields). */
function optionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    AUTH_SECRET: optionalEnv(process.env.AUTH_SECRET),
    DATABASE_URL: optionalEnv(process.env.DATABASE_URL),
    UPSTASH_REDIS_REST_URL: optionalEnv(process.env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: optionalEnv(process.env.UPSTASH_REDIS_REST_TOKEN),
    CLOUDINARY_CLOUD_NAME: optionalEnv(process.env.CLOUDINARY_CLOUD_NAME),
    CLOUDINARY_API_KEY: optionalEnv(process.env.CLOUDINARY_API_KEY),
    CLOUDINARY_API_SECRET: optionalEnv(process.env.CLOUDINARY_API_SECRET),
    EMAIL_FROM: optionalEnv(process.env.EMAIL_FROM),
    RESEND_API_KEY: optionalEnv(process.env.RESEND_API_KEY),
    PAYMENT_APP_URL: optionalEnv(process.env.PAYMENT_APP_URL),
    ARCA_TEST_MODE: optionalEnv(process.env.ARCA_TEST_MODE),
    ARCA_BASE_URL: optionalEnv(process.env.ARCA_BASE_URL),
    ARCA_LIVE_BASE_URL: optionalEnv(process.env.ARCA_LIVE_BASE_URL),
    ARCA_USERNAME: optionalEnv(process.env.ARCA_USERNAME),
    ARCA_PASSWORD: optionalEnv(process.env.ARCA_PASSWORD),
    ARCA_LIVE_USERNAME: optionalEnv(process.env.ARCA_LIVE_USERNAME),
    ARCA_LIVE_PASSWORD: optionalEnv(process.env.ARCA_LIVE_PASSWORD),
    IDRAM_TEST_MODE: optionalEnv(process.env.IDRAM_TEST_MODE),
    IDRAM_REC_ACCOUNT: optionalEnv(process.env.IDRAM_REC_ACCOUNT),
    IDRAM_SECRET_KEY: optionalEnv(process.env.IDRAM_SECRET_KEY),
    IDRAM_LIVE_REC_ACCOUNT: optionalEnv(process.env.IDRAM_LIVE_REC_ACCOUNT),
    IDRAM_LIVE_SECRET_KEY: optionalEnv(process.env.IDRAM_LIVE_SECRET_KEY),
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/** Database URL is required for Drizzle client and migrations. */
export function requireDatabaseUrl(): string {
  const { DATABASE_URL } = getEnv();

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  return DATABASE_URL;
}
