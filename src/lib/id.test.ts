import { describe, expect, it } from "vitest";

import { createId } from "@/lib/id";

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("createId", () => {
  it("returns a UUIDv7 string", () => {
    expect(createId()).toMatch(UUID_V7_PATTERN);
  });

  it("returns unique values", () => {
    expect(createId()).not.toBe(createId());
  });
});
