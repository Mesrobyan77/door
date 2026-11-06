const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "a",
  "blockquote",
]);

const VOID_TAGS = new Set(["br"]);

const TAG_REGEX = /<\/?([a-zA-Z][\w:-]*)\b([^>]*)>/g;
const EVENT_HANDLER_REGEX =
  /\s(on[a-z]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

function stripScriptAndStyle(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");
}

function stripEventHandlers(html: string): string {
  return html.replace(EVENT_HANDLER_REGEX, "");
}

function parseHref(attrs: string): string | null {
  const match = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  if (!match) {
    return null;
  }
  return match[2] ?? match[3] ?? match[4] ?? null;
}

function isSafeHref(href: string): boolean {
  const value = href.trim();
  if (!value) {
    return false;
  }

  const lower = value.toLowerCase().replace(/\s+/g, "");
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return false;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }

  return /^https?:\/\//i.test(value);
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Allowlists blog HTML and strips scripts, styles, and unsafe attributes. */
export function sanitizeBlogHtml(html: string): string {
  let input = stripScriptAndStyle(html);
  input = stripEventHandlers(input);

  let result = "";
  let lastIndex = 0;
  const openTags: string[] = [];
  let match: RegExpExecArray | null;

  TAG_REGEX.lastIndex = 0;
  while ((match = TAG_REGEX.exec(input)) !== null) {
    result += input.slice(lastIndex, match.index);

    const full = match[0];
    const isClosing = full.startsWith("</");
    const tag = (match[1] ?? "").toLowerCase();
    const attrs = match[2] ?? "";

    if (isClosing) {
      if (ALLOWED_TAGS.has(tag) && !VOID_TAGS.has(tag)) {
        const index = openTags.lastIndexOf(tag);
        if (index !== -1) {
          openTags.splice(index, 1);
          result += `</${tag}>`;
        }
      }
    } else if (ALLOWED_TAGS.has(tag)) {
      if (VOID_TAGS.has(tag)) {
        result += `<${tag}>`;
      } else if (tag === "a") {
        const href = parseHref(attrs);
        if (href && isSafeHref(href)) {
          result += `<a href="${escapeHtmlAttr(href)}">`;
          openTags.push(tag);
        }
      } else {
        result += `<${tag}>`;
        openTags.push(tag);
      }
    }

    lastIndex = TAG_REGEX.lastIndex;
  }

  result += input.slice(lastIndex);
  return result;
}
