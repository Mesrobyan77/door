import path from "node:path";

import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv({ path: path.resolve(process.cwd(), ".env") });

const seedEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1),
  SEED_ADMIN_EMAIL: z.string().email(),
  SEED_ADMIN_PASSWORD: z.string().min(12),
  SEED_CUSTOMER_EMAIL: z.string().email().optional(),
  SEED_CUSTOMER_PASSWORD: z.string().min(12).optional(),
  SEED_ALLOW_PRODUCTION: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

export type SeedEnv = z.infer<typeof seedEnvSchema>;

export function getSeedEnv(): SeedEnv {
  const parsed = seedEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(
      `Invalid seed environment: ${details}. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env (min 12 chars).`,
    );
  }

  if (
    parsed.data.NODE_ENV === "production" &&
    !parsed.data.SEED_ALLOW_PRODUCTION
  ) {
    throw new Error(
      "Refusing to seed production without SEED_ALLOW_PRODUCTION=true",
    );
  }

  return parsed.data;
}
