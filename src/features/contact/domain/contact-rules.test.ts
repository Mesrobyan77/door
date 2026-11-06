import { describe, expect, it } from "vitest";

import {
  canTransitionContactStatus,
  normalizeContactEmail,
  scoreContactSpam,
  shouldRejectContactSpam,
} from "@/features/contact/domain/contact-rules";

describe("contact rules", () => {
  it("scores honeypot submissions as spam", () => {
    const score = scoreContactSpam({
      name: "Bot",
      email: "bot@example.com",
      subject: "Hi",
      message: "Hello there friend",
      companyWebsite: "http://spam.test",
    });
    expect(score).toBeGreaterThanOrEqual(80);
    expect(shouldRejectContactSpam(score)).toBe(true);
  });

  it("keeps a normal message below reject threshold", () => {
    const score = scoreContactSpam({
      name: "Anna",
      email: "anna@example.com",
      subject: "Order question",
      message: "I need help with my recent order delivery timing.",
    });
    expect(shouldRejectContactSpam(score)).toBe(false);
  });

  it("allows inbox status transitions", () => {
    expect(canTransitionContactStatus("UNREAD", "READ")).toBe(true);
    expect(canTransitionContactStatus("READ", "REPLIED")).toBe(true);
    expect(canTransitionContactStatus("ARCHIVED", "REPLIED")).toBe(false);
  });

  it("normalizes email", () => {
    expect(normalizeContactEmail("  A@B.com ")).toBe("a@b.com");
  });
});
