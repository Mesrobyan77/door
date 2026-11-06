const IMAGE_SIGNATURES: Record<string, (buffer: Buffer) => boolean> = {
  "image/jpeg": (buffer) =>
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff,
  "image/png": (buffer) =>
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  "image/webp": (buffer) =>
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP",
  "image/gif": (buffer) =>
    buffer.length >= 6 &&
    ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6)),
};

export const MEDIA_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Validates MIME and size for admin image uploads. */
export function validateImageFile(
  input: { mimeType: string; byteSize: number; buffer: Buffer },
  maxBytes = MEDIA_IMAGE_MAX_BYTES,
): string | null {
  const signature = IMAGE_SIGNATURES[input.mimeType];
  if (!signature || !signature(input.buffer)) {
    return "Only JPEG, PNG, WebP, or GIF images are allowed.";
  }
  if (input.byteSize > maxBytes) {
    return `Image must be ${Math.floor(maxBytes / (1024 * 1024))}MB or smaller.`;
  }
  return null;
}
