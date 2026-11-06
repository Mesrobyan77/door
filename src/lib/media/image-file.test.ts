import { describe, expect, it } from "vitest";

import { validateImageFile } from "@/lib/media/image-file";

describe("validateImageFile", () => {
  it("accepts a JPEG with a matching file signature", () => {
    expect(
      validateImageFile({
        mimeType: "image/jpeg",
        byteSize: 3,
        buffer: Buffer.from([0xff, 0xd8, 0xff]),
      }),
    ).toBeNull();
  });

  it("rejects a MIME type that does not match the file signature", () => {
    expect(
      validateImageFile({
        mimeType: "image/png",
        byteSize: 3,
        buffer: Buffer.from("not an image"),
      }),
    ).toContain("Only JPEG");
  });

  it("rejects files larger than the configured maximum", () => {
    expect(
      validateImageFile({
        mimeType: "image/jpeg",
        byteSize: 6 * 1024 * 1024,
        buffer: Buffer.from([0xff, 0xd8, 0xff]),
      }),
    ).toContain("5MB");
  });
});
