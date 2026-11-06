import { describe, expect, it } from "vitest";

import { err, ok } from "@/lib/result";

describe("result", () => {
  it("creates success and error results", () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err("E_TEST", "failed")).toEqual({
      ok: false,
      error: { code: "E_TEST", message: "failed" },
    });
  });
});
