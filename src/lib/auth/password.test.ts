import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("hashes and verifies with Argon2id", async () => {
    const hashed = await hashPassword("correct-horse-battery");
    expect(hashed).not.toContain("correct-horse-battery");
    await expect(verifyPassword("correct-horse-battery", hashed)).resolves.toBe(
      true,
    );
    await expect(verifyPassword("wrong-password", hashed)).resolves.toBe(false);
  });
});
