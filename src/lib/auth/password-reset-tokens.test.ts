import { describe, expect, it } from "vitest";

import {
  consumePasswordResetToken,
  issuePasswordResetToken,
} from "@/lib/auth/password-reset-tokens";
import { createMemoryRedisAdapter } from "@/lib/redis/memory-adapter";

describe("password reset tokens", () => {
  it("issues a consumable single-use token", async () => {
    const redis = createMemoryRedisAdapter().getClient();
    const token = await issuePasswordResetToken(redis, "user-1");

    await expect(consumePasswordResetToken(redis, token)).resolves.toBe(
      "user-1",
    );
    await expect(consumePasswordResetToken(redis, token)).resolves.toBeNull();
  });

  it("revokes the previous token when issuing a new one", async () => {
    const redis = createMemoryRedisAdapter().getClient();
    const first = await issuePasswordResetToken(redis, "user-1");
    const second = await issuePasswordResetToken(redis, "user-1");

    await expect(consumePasswordResetToken(redis, first)).resolves.toBeNull();
    await expect(consumePasswordResetToken(redis, second)).resolves.toBe(
      "user-1",
    );
  });

  it("rejects empty or unknown tokens", async () => {
    const redis = createMemoryRedisAdapter().getClient();

    await expect(consumePasswordResetToken(redis, "")).resolves.toBeNull();
    await expect(
      consumePasswordResetToken(redis, "not-a-real-token"),
    ).resolves.toBeNull();
  });
});
