import { describe, expect, it } from "vitest";

import { sanitizeBlogHtml } from "@/lib/sanitize/html";

describe("sanitizeBlogHtml", () => {
  it("keeps allowed tags and strips disallowed markup", () => {
    const input =
      '<p>Hello <strong>world</strong></p><img src=x onerror=alert(1) /><script>alert(1)</script>';
    expect(sanitizeBlogHtml(input)).toBe("<p>Hello <strong>world</strong></p>");
  });

  it("allows safe anchor hrefs and rejects javascript URLs", () => {
    expect(
      sanitizeBlogHtml(
        '<a href="/blog/post">Local</a><a href="https://example.com">Remote</a>',
      ),
    ).toBe(
      '<a href="/blog/post">Local</a><a href="https://example.com">Remote</a>',
    );

    expect(
      sanitizeBlogHtml('<a href="javascript:alert(1)">Bad</a>'),
    ).toBe("Bad");
  });

  it("removes style blocks and on* handlers", () => {
    expect(
      sanitizeBlogHtml(
        '<p onclick="alert(1)">Text</p><style>.x{color:red}</style>',
      ),
    ).toBe("<p>Text</p>");
  });

  it("preserves lists and headings", () => {
    expect(
      sanitizeBlogHtml(
        "<h2>Title</h2><ul><li>One</li><li>Two</li></ul><blockquote>Quote</blockquote>",
      ),
    ).toBe(
      "<h2>Title</h2><ul><li>One</li><li>Two</li></ul><blockquote>Quote</blockquote>",
    );
  });
});
