import { hash, verify } from "@node-rs/argon2";

/** Argon2id algorithm id from @node-rs/argon2 (avoids ambient const enum). */
const ARGON2ID = 2;

const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Hash a password with Argon2id for durable credential storage. */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/** Verify a password against an Argon2id hash. */
export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return verify(passwordHash, password, ARGON2_OPTIONS);
}
