import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { products } from "@/db/schema/catalog";
import {
  createdAtColumn,
  idColumn,
  updatedAtColumn,
} from "@/db/schema/columns";
import {
  doorHandingEnum,
  doorSwingEnum,
  productVariantStatusEnum,
  variantItemTypeEnum,
} from "@/db/schema/enums";

export type VariantItemType = (typeof variantItemTypeEnum.enumValues)[number];
export type ProductVariantStatus =
  (typeof productVariantStatusEnum.enumValues)[number];

export type IncludedComponent = {
  code:
    | "FRAME"
    | "ARCHITRAVE"
    | "HINGE"
    | "HANDLE"
    | "LOCK"
    | "CYLINDER"
    | "THRESHOLD"
    | "FRAME_EXTENSION";
  status: "INCLUDED" | "EXCLUDED" | "UNKNOWN";
  quantity?: number;
};

export const productVariants = pgTable(
  "product_variants",
  {
    id: idColumn(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    sku: text("sku").notNull(),
    configurationKey: text("configuration_key").notNull(),
    itemType: variantItemTypeEnum("item_type").notNull(),
    status: productVariantStatusEnum("status").notNull().default("ACTIVE"),
    priceAmount: integer("price_amount"),
    compareAtAmount: integer("compare_at_amount"),
    stockOnHand: integer("stock_on_hand").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    leafWidthMm: integer("leaf_width_mm"),
    leafHeightMm: integer("leaf_height_mm"),
    leafThicknessMm: integer("leaf_thickness_mm"),
    secondaryLeafWidthMm: integer("secondary_leaf_width_mm"),
    unitWidthMm: integer("unit_width_mm"),
    unitHeightMm: integer("unit_height_mm"),
    frameDepthMm: integer("frame_depth_mm"),
    roughOpeningWidthMm: integer("rough_opening_width_mm"),
    roughOpeningHeightMm: integer("rough_opening_height_mm"),
    colorName: text("color_name"),
    finishName: text("finish_name"),
    exteriorColorName: text("exterior_color_name"),
    exteriorFinishName: text("exterior_finish_name"),
    handing: doorHandingEnum("handing"),
    swing: doorSwingEnum("swing"),
    includedComponents: jsonb("included_components").$type<
      IncludedComponent[]
    >(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("product_variants_sku_uidx").on(table.sku),
    uniqueIndex("product_variants_configuration_uidx").on(
      table.productId,
      table.configurationKey,
    ),
    index("product_variants_product_status_idx").on(
      table.productId,
      table.status,
    ),
    index("product_variants_availability_idx").on(
      table.status,
      table.stockOnHand,
    ),
    check(
      "product_variants_price_nonneg_chk",
      sql`${table.priceAmount} IS NULL OR ${table.priceAmount} >= 0`,
    ),
    check(
      "product_variants_compare_nonneg_chk",
      sql`${table.compareAtAmount} IS NULL OR ${table.compareAtAmount} >= 0`,
    ),
    check(
      "product_variants_stock_nonneg_chk",
      sql`${table.stockOnHand} >= 0 AND ${table.lowStockThreshold} >= 0`,
    ),
    check(
      "product_variants_dimensions_positive_chk",
      sql`(
        (${table.leafWidthMm} IS NULL OR ${table.leafWidthMm} > 0)
        AND (${table.leafHeightMm} IS NULL OR ${table.leafHeightMm} > 0)
        AND (${table.leafThicknessMm} IS NULL OR ${table.leafThicknessMm} > 0)
        AND (${table.secondaryLeafWidthMm} IS NULL OR ${table.secondaryLeafWidthMm} > 0)
        AND (${table.unitWidthMm} IS NULL OR ${table.unitWidthMm} > 0)
        AND (${table.unitHeightMm} IS NULL OR ${table.unitHeightMm} > 0)
        AND (${table.frameDepthMm} IS NULL OR ${table.frameDepthMm} > 0)
        AND (${table.roughOpeningWidthMm} IS NULL OR ${table.roughOpeningWidthMm} > 0)
        AND (${table.roughOpeningHeightMm} IS NULL OR ${table.roughOpeningHeightMm} > 0)
      )`,
    ),
    check(
      "product_variants_required_dimensions_chk",
      sql`(
        ${table.itemType} = 'LEGACY'
        OR (
          ${table.itemType} = 'LEAF_ONLY'
          AND ${table.leafWidthMm} IS NOT NULL
          AND ${table.leafHeightMm} IS NOT NULL
        )
        OR (
          ${table.itemType} IN ('FRAMED_UNIT', 'FIXED_PACKAGE')
          AND ${table.unitWidthMm} IS NOT NULL
          AND ${table.unitHeightMm} IS NOT NULL
        )
      )`,
    ),
    check(
      "product_variants_inquiry_price_chk",
      sql`${table.status} = 'INQUIRY' OR ${table.priceAmount} IS NOT NULL`,
    ),
  ],
);
