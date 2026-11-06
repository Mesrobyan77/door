import { z } from "zod";

import { CONTACT_STATUSES } from "@/features/contact/domain/contact-rules";

export const submitContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10).max(5000),
  /** Honeypot — must stay empty for humans. */
  companyWebsite: z.string().max(200).optional(),
});

export type SubmitContactInput = z.infer<typeof submitContactSchema>;

export const adminContactFilterSchema = z.object({
  status: z.enum(CONTACT_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export type AdminContactFilter = z.infer<typeof adminContactFilterSchema>;

export const updateContactStatusSchema = z.object({
  messageId: z.string().uuid(),
  status: z.enum(CONTACT_STATUSES),
});

export type UpdateContactStatusInput = z.infer<
  typeof updateContactStatusSchema
>;
