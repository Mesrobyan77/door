CREATE TYPE "public"."door_classification" AS ENUM('INTERIOR', 'ENTRANCE');--> statement-breakpoint
CREATE TYPE "public"."door_frame_system" AS ENUM('STANDARD', 'CONCEALED');--> statement-breakpoint
CREATE TYPE "public"."door_handing" AS ENUM('LEFT', 'RIGHT', 'REVERSIBLE', 'NOT_APPLICABLE');--> statement-breakpoint
CREATE TYPE "public"."door_leaf_configuration" AS ENUM('SINGLE', 'DOUBLE', 'UNEQUAL_DOUBLE');--> statement-breakpoint
CREATE TYPE "public"."door_mechanism" AS ENUM('HINGED', 'SLIDING', 'FOLDING');--> statement-breakpoint
CREATE TYPE "public"."door_swing" AS ENUM('INWARD', 'OUTWARD', 'NOT_APPLICABLE');--> statement-breakpoint
CREATE TYPE "public"."entrance_environment" AS ENUM('APARTMENT', 'OUTDOOR_HOUSE');--> statement-breakpoint
CREATE TYPE "public"."included_component_status" AS ENUM('INCLUDED', 'EXCLUDED', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."product_variant_status" AS ENUM('ACTIVE', 'INQUIRY', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."variant_item_type" AS ENUM('LEGACY', 'LEAF_ONLY', 'FRAMED_UNIT', 'FIXED_PACKAGE');--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"configuration_key" text NOT NULL,
	"item_type" "variant_item_type" NOT NULL,
	"status" "product_variant_status" DEFAULT 'ACTIVE' NOT NULL,
	"price_amount" integer,
	"compare_at_amount" integer,
	"stock_on_hand" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"leaf_width_mm" integer,
	"leaf_height_mm" integer,
	"leaf_thickness_mm" integer,
	"secondary_leaf_width_mm" integer,
	"unit_width_mm" integer,
	"unit_height_mm" integer,
	"frame_depth_mm" integer,
	"rough_opening_width_mm" integer,
	"rough_opening_height_mm" integer,
	"color_name" text,
	"finish_name" text,
	"exterior_color_name" text,
	"exterior_finish_name" text,
	"handing" "door_handing",
	"swing" "door_swing",
	"included_components" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_price_nonneg_chk" CHECK ("product_variants"."price_amount" IS NULL OR "product_variants"."price_amount" >= 0),
	CONSTRAINT "product_variants_compare_nonneg_chk" CHECK ("product_variants"."compare_at_amount" IS NULL OR "product_variants"."compare_at_amount" >= 0),
	CONSTRAINT "product_variants_stock_nonneg_chk" CHECK ("product_variants"."stock_on_hand" >= 0 AND "product_variants"."low_stock_threshold" >= 0),
	CONSTRAINT "product_variants_dimensions_positive_chk" CHECK ((
        ("product_variants"."leaf_width_mm" IS NULL OR "product_variants"."leaf_width_mm" > 0)
        AND ("product_variants"."leaf_height_mm" IS NULL OR "product_variants"."leaf_height_mm" > 0)
        AND ("product_variants"."leaf_thickness_mm" IS NULL OR "product_variants"."leaf_thickness_mm" > 0)
        AND ("product_variants"."secondary_leaf_width_mm" IS NULL OR "product_variants"."secondary_leaf_width_mm" > 0)
        AND ("product_variants"."unit_width_mm" IS NULL OR "product_variants"."unit_width_mm" > 0)
        AND ("product_variants"."unit_height_mm" IS NULL OR "product_variants"."unit_height_mm" > 0)
        AND ("product_variants"."frame_depth_mm" IS NULL OR "product_variants"."frame_depth_mm" > 0)
        AND ("product_variants"."rough_opening_width_mm" IS NULL OR "product_variants"."rough_opening_width_mm" > 0)
        AND ("product_variants"."rough_opening_height_mm" IS NULL OR "product_variants"."rough_opening_height_mm" > 0)
      )),
	CONSTRAINT "product_variants_required_dimensions_chk" CHECK ((
        "product_variants"."item_type" = 'LEGACY'
        OR (
          "product_variants"."item_type" = 'LEAF_ONLY'
          AND "product_variants"."leaf_width_mm" IS NOT NULL
          AND "product_variants"."leaf_height_mm" IS NOT NULL
        )
        OR (
          "product_variants"."item_type" IN ('FRAMED_UNIT', 'FIXED_PACKAGE')
          AND "product_variants"."unit_width_mm" IS NOT NULL
          AND "product_variants"."unit_height_mm" IS NOT NULL
        )
      )),
	CONSTRAINT "product_variants_inquiry_price_chk" CHECK ("product_variants"."status" = 'INQUIRY' OR "product_variants"."price_amount" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "media_assets" DROP CONSTRAINT "media_assets_owner_chk";--> statement-breakpoint
DROP INDEX "cart_items_cart_product_uidx";--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand_name" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "model_name" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "collection_name" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "door_classification" "door_classification";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "entrance_environments" "entrance_environment"[];--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "structural_material" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "core_material" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "surface_coating" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "has_glazing" boolean;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "glazing_type" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "manufacturer" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "country_of_manufacture" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "opening_mechanism" "door_mechanism";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "frame_system" "door_frame_system";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "leaf_configuration" "door_leaf_configuration";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "performance_specifications" jsonb;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
INSERT INTO "product_variants" (
	"id",
	"product_id",
	"sku",
	"configuration_key",
	"item_type",
	"status",
	"price_amount",
	"compare_at_amount",
	"stock_on_hand",
	"low_stock_threshold"
)
SELECT
	"id",
	"id",
	"sku",
	'LEGACY',
	'LEGACY',
	'ACTIVE',
	"price_amount",
	"compare_at_amount",
	"stock_on_hand",
	"low_stock_threshold"
FROM "products";--> statement-breakpoint
UPDATE "cart_items" SET "variant_id" = "product_id";--> statement-breakpoint
UPDATE "stock_movements" SET "variant_id" = "product_id";--> statement-breakpoint
ALTER TABLE "cart_items" ALTER COLUMN "variant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "variant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_sku_uidx" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_configuration_uidx" ON "product_variants" USING btree ("product_id","configuration_key");--> statement-breakpoint
CREATE INDEX "product_variants_product_status_idx" ON "product_variants" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "product_variants_availability_idx" ON "product_variants" USING btree ("status","stock_on_hand");--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_variant_uidx" ON "cart_items" USING btree ("cart_id","variant_id");--> statement-breakpoint
CREATE INDEX "media_assets_variant_idx" ON "media_assets" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_variant_primary_uidx" ON "media_assets" USING btree ("variant_id") WHERE "media_assets"."variant_id" IS NOT NULL AND "media_assets"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "order_items_variant_idx" ON "order_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "stock_movements_variant_created_idx" ON "stock_movements" USING btree ("variant_id","created_at");--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_chk" CHECK ((
        ("media_assets"."upload_status" = 'PENDING'
          AND "media_assets"."product_id" IS NULL
          AND "media_assets"."variant_id" IS NULL
          AND "media_assets"."category_id" IS NULL
          AND "media_assets"."hero_slide_id" IS NULL
          AND "media_assets"."blog_post_id" IS NULL)
        OR ("media_assets"."role" = 'BRANDING' AND "media_assets"."purpose" IS NOT NULL)
        OR (
          ("media_assets"."product_id" IS NOT NULL)::int
          + ("media_assets"."variant_id" IS NOT NULL)::int
          + ("media_assets"."category_id" IS NOT NULL)::int
          + ("media_assets"."hero_slide_id" IS NOT NULL)::int
          + ("media_assets"."blog_post_id" IS NOT NULL)::int
        ) = 1
      ));