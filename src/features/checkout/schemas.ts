import { z } from "zod";

import { CHECKOUT_PAYMENT_METHODS } from "@/features/checkout/domain/payment-methods";

export const checkoutSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    contactEmail: z.string().trim().email().max(254),
    contactPhone: z.string().trim().min(5).max(40),
    shippingMethod: z.enum(["pickup", "delivery"]),
    paymentMethod: z.enum(CHECKOUT_PAYMENT_METHODS),
    deliveryRuleId: z.string().uuid().optional(),
    city: z.string().trim().max(80).optional(),
    line1: z.string().trim().max(160).optional(),
    line2: z.string().trim().max(160).optional(),
    region: z.string().trim().max(80).optional(),
    postalCode: z.string().trim().max(32).optional(),
    idempotencyKey: z.string().trim().min(8).max(128),
    locale: z.enum(["hy", "en", "ru"]),
    couponCode: z.string().trim().max(64).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.shippingMethod === "delivery") {
      if (!value.deliveryRuleId) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryRuleId"],
          message: "Delivery location is required.",
        });
      }
      if (!value.line1?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["line1"],
          message: "Address is required for delivery.",
        });
      }
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
