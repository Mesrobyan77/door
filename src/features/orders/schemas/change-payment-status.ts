import { z } from "zod";

import { PAYMENT_STATUSES } from "@/features/orders/domain/payment-status";

export const changePaymentStatusSchema = z.object({
  orderNumber: z.string().trim().min(1).max(64),
  toStatus: z.enum(PAYMENT_STATUSES),
  note: z.string().trim().max(1000).optional(),
});

export type ChangePaymentStatusInput = z.infer<
  typeof changePaymentStatusSchema
>;
