export const CONTACT_STATUSES = [
  "UNREAD",
  "READ",
  "REPLIED",
  "ARCHIVED",
] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

const STATUS_TRANSITIONS: Record<ContactStatus, readonly ContactStatus[]> = {
  UNREAD: ["READ", "ARCHIVED"],
  READ: ["UNREAD", "REPLIED", "ARCHIVED"],
  REPLIED: ["READ", "ARCHIVED"],
  ARCHIVED: ["READ"],
};

export function isContactStatus(value: string): value is ContactStatus {
  return (CONTACT_STATUSES as readonly string[]).includes(value);
}

export function getEligibleContactStatuses(
  from: ContactStatus,
): ContactStatus[] {
  return [...STATUS_TRANSITIONS[from]];
}

export function canTransitionContactStatus(
  from: ContactStatus,
  to: ContactStatus,
): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export type ContactSpamInput = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  /** Hidden honeypot field — bots usually fill this. */
  companyWebsite?: string;
};

/**
 * Heuristic spam score (0–100). Higher means more suspicious.
 * Messages at or above 80 should be rejected at the boundary.
 */
export function scoreContactSpam(input: ContactSpamInput): number {
  let score = 0;

  if (input.companyWebsite && input.companyWebsite.trim().length > 0) {
    score += 80;
  }

  const urlMatches = input.message.match(/https?:\/\/|www\./gi);
  if (urlMatches && urlMatches.length >= 3) {
    score += 30;
  } else if (urlMatches && urlMatches.length >= 1) {
    score += 10;
  }

  if (input.message.trim().length < 10) {
    score += 20;
  }

  if (/(.)\1{8,}/.test(input.message)) {
    score += 25;
  }

  if (/viagra|crypto\s*giveaway|seo\s*rank/i.test(input.message)) {
    score += 40;
  }

  const emailLocal = input.email.split("@")[0] ?? "";
  if (emailLocal.length > 40) {
    score += 15;
  }

  return Math.min(100, score);
}

export const CONTACT_SPAM_REJECT_THRESHOLD = 80;

export function shouldRejectContactSpam(score: number): boolean {
  return score >= CONTACT_SPAM_REJECT_THRESHOLD;
}

/** Normalizes contact email for storage and duplicate checks. */
export function normalizeContactEmail(email: string): string {
  return email.trim().toLowerCase();
}
