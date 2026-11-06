import "server-only";

import { z } from "zod";

/**
 * Foundation env contract. Provider secrets become required when the
 * corresponding feature is wired (auth, DB, Redis, R2, email).
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  AUTH_SECRET: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(1).optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),
  /** Optional custom S3 API endpoint; defaults to account R2 endpoint. */
  R2_ENDPOINT: z.string().url().optional(),
  EMAIL_FROM: z.string().email().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

/** Empty or whitespace-only env values → undefined (optional fields). */
function optionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function resolvePublicBaseUrl(): string | undefined {
  return optionalEnv(
    process.env.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_URL,
  );
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
    R2_ACCOUNT_ID: optionalEnv(process.env.R2_ACCOUNT_ID),
    R2_ACCESS_KEY_ID: optionalEnv(process.env.R2_ACCESS_KEY_ID),
    R2_SECRET_ACCESS_KEY: optionalEnv(process.env.R2_SECRET_ACCESS_KEY),
    R2_BUCKET_NAME: optionalEnv(process.env.R2_BUCKET_NAME),
    R2_PUBLIC_BASE_URL: resolvePublicBaseUrl(),
    R2_ENDPOINT: optionalEnv(process.env.R2_ENDPOINT),
    EMAIL_FROM: optionalEnv(process.env.EMAIL_FROM),
    RESEND_API_KEY: optionalEnv(process.env.RESEND_API_KEY),
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/** Database URL is required for Drizzle client and migrations. */
export function requireDatabaseUrl(): string {
  const { DATABASE_URL } = getEnv();

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  return DATABASE_URL;
}
