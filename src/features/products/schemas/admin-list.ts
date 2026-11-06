import { z } from "zod";

export const adminProductsFilterSchema = z.object({
  q: z.string().trim().max(100).optional(),
  sku: z.string().trim().max(64).optional(),
  categoryId: z.string().uuid().optional(),
  stock: z.enum(["all", "in_stock", "out_of_stock", "low_stock"]).default("all"),
  sort: z
    .enum(["created", "stock", "price", "title"])
    .default("created"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export type AdminProductsFilter = z.infer<typeof adminProductsFilterSchema>;

export const productIdsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(50),
});

export type ProductIdsInput = z.infer<typeof productIdsSchema>;
