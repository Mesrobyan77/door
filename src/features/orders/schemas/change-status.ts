import { z } from "zod";

import { ORDER_STATUSES } from "@/features/orders/domain/order-status";
import { PAYMENT_STATUSES } from "@/features/orders/domain/payment-status";

export const changeOrderStatusSchema = z.object({
  orderNumber: z.string().trim().min(1).max(64),
  toStatus: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(1000).optional(),
});

export type ChangeOrderStatusInput = z.infer<typeof changeOrderStatusSchema>;

export const adminOrdersFilterSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  archived: z.enum(["active", "archived", "all"]).default("active"),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export type AdminOrdersFilter = z.infer<typeof adminOrdersFilterSchema>;

export const archiveOrderSchema = z.object({
  orderNumber: z.string().trim().min(1).max(64),
  archive: z.boolean(),
});

export type ArchiveOrderInput = z.infer<typeof archiveOrderSchema>;

export const addOrderNoteSchema = z.object({
  orderNumber: z.string().trim().min(1).max(64),
  note: z.string().trim().min(1).max(1000),
});

export type AddOrderNoteInput = z.infer<typeof addOrderNoteSchema>;

export const bulkChangeOrderStatusSchema = z.object({
  orderNumbers: z.array(z.string().trim().min(1).max(64)).min(1).max(50),
  toStatus: z.enum(ORDER_STATUSES),
});

export type BulkChangeOrderStatusInput = z.infer<
  typeof bulkChangeOrderStatusSchema
>;

export const bulkArchiveOrdersSchema = z.object({
  orderNumbers: z.array(z.string().trim().min(1).max(64)).min(1).max(50),
});

export type BulkArchiveOrdersInput = z.infer<typeof bulkArchiveOrdersSchema>;
