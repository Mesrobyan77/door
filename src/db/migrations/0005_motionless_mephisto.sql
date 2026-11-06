ALTER TABLE "promotions" DROP CONSTRAINT "promotions_kind_chk";--> statement-breakpoint
ALTER TABLE "promotions" DROP CONSTRAINT "promotions_single_target_chk";--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "product_variant_id" uuid;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "promotions_variant_idx" ON "promotions" USING btree ("product_variant_id");--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_kind_chk" CHECK ((
        ("promotions"."kind" = 'COUPON' AND "promotions"."code" IS NOT NULL)
        OR (
          "promotions"."kind" = 'AUTOMATIC'
          AND "promotions"."code" IS NULL
          AND (
            ("promotions"."product_id" IS NOT NULL)::int
            + ("promotions"."product_variant_id" IS NOT NULL)::int
            + ("promotions"."category_id" IS NOT NULL)::int
          ) = 1
        )
      ));--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_single_target_chk" CHECK ((
        ("promotions"."product_id" IS NOT NULL)::int
        + ("promotions"."product_variant_id" IS NOT NULL)::int
        + ("promotions"."category_id" IS NOT NULL)::int
      ) <= 1);