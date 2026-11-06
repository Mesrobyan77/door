CREATE TYPE "public"."blog_post_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."cart_status" AS ENUM('ACTIVE', 'MERGED', 'CONVERTED', 'ABANDONED');--> statement-breakpoint
CREATE TYPE "public"."category_status" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."contact_message_status" AS ENUM('UNREAD', 'READ', 'REPLIED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('PERCENTAGE', 'FIXED');--> statement-breakpoint
CREATE TYPE "public"."media_role" AS ENUM('GALLERY', 'PRIMARY', 'COVER', 'HERO_DESKTOP', 'HERO_MOBILE', 'BRANDING');--> statement-breakpoint
CREATE TYPE "public"."media_upload_status" AS ENUM('PENDING', 'READY', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."order_event_type" AS ENUM('STATUS_CHANGE', 'NOTE', 'PAYMENT_PROVIDER');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."promotion_kind" AS ENUM('COUPON', 'AUTOMATIC');--> statement-breakpoint
CREATE TYPE "public"."review_moderation_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_reason" AS ENUM('ORDER', 'CANCEL', 'RETURN', 'ADMIN_ADJUSTMENT', 'IMPORT');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'CUSTOMER');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED', 'ANONYMIZED');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text,
	"recipient_first_name" text NOT NULL,
	"recipient_last_name" text NOT NULL,
	"phone" text NOT NULL,
	"country_code" text DEFAULT 'AM' NOT NULL,
	"region" text,
	"city" text NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"postal_code" text,
	"is_default_shipping" boolean DEFAULT false NOT NULL,
	"is_default_billing" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"before_diff" jsonb,
	"after_diff" jsonb,
	"request_id" text,
	"correlation_id" text,
	"context" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_user_id" uuid,
	"status" "blog_post_status" DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"translations" jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_qty_chk" CHECK ("cart_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"guest_token_hash" text,
	"status" "cart_status" DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carts_owner_chk" CHECK ((
        ("carts"."user_id" IS NOT NULL AND "carts"."guest_token_hash" IS NULL)
        OR ("carts"."user_id" IS NULL AND "carts"."guest_token_hash" IS NOT NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"parent_id" uuid,
	"translations" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "category_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" "contact_message_status" DEFAULT 'UNREAD' NOT NULL,
	"spam_score" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"country_code" text DEFAULT 'AM' NOT NULL,
	"region" text,
	"city" text,
	"price_amount" integer NOT NULL,
	"free_threshold_amount" integer,
	"estimated_days_min" integer,
	"estimated_days_max" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_rules_price_chk" CHECK ("delivery_rules"."price_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "hero_slides" (
	"id" uuid PRIMARY KEY NOT NULL,
	"translations" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"checksum" text,
	"upload_status" "media_upload_status" DEFAULT 'PENDING' NOT NULL,
	"role" "media_role" DEFAULT 'GALLERY' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"purpose" text,
	"alt_translations" jsonb,
	"product_id" uuid,
	"category_id" uuid,
	"hero_slide_id" uuid,
	"blog_post_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_owner_chk" CHECK ((
        ("media_assets"."upload_status" = 'PENDING'
          AND "media_assets"."product_id" IS NULL
          AND "media_assets"."category_id" IS NULL
          AND "media_assets"."hero_slide_id" IS NULL
          AND "media_assets"."blog_post_id" IS NULL)
        OR ("media_assets"."role" = 'BRANDING' AND "media_assets"."purpose" IS NOT NULL)
        OR (
          ("media_assets"."product_id" IS NOT NULL)::int
          + ("media_assets"."category_id" IS NOT NULL)::int
          + ("media_assets"."hero_slide_id" IS NOT NULL)::int
          + ("media_assets"."blog_post_id" IS NOT NULL)::int
        ) = 1
      )),
	CONSTRAINT "media_assets_byte_size_chk" CHECK ("media_assets"."byte_size" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"event_type" "order_event_type" NOT NULL,
	"from_state" text,
	"to_state" text,
	"actor_user_id" uuid,
	"is_customer_visible" boolean DEFAULT false NOT NULL,
	"payload" jsonb,
	"provider_event_id" text,
	"correlation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"product_title_snapshot" text NOT NULL,
	"product_sku_snapshot" text NOT NULL,
	"product_image_key_snapshot" text,
	"quantity" integer NOT NULL,
	"unit_base_amount" integer NOT NULL,
	"unit_display_amount" integer NOT NULL,
	"compare_at_amount" integer,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"line_total_amount" integer NOT NULL,
	"currency" text DEFAULT 'AMD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_qty_chk" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"user_id" uuid,
	"contact_email" text NOT NULL,
	"contact_phone" text NOT NULL,
	"contact_name" text NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"base_currency" text DEFAULT 'AMD' NOT NULL,
	"display_currency" text DEFAULT 'AMD' NOT NULL,
	"exchange_rate" numeric(18, 8),
	"exchange_rate_source" text,
	"exchange_rate_as_of" timestamp with time zone,
	"subtotal_amount" integer NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"delivery_amount" integer DEFAULT 0 NOT NULL,
	"total_amount" integer NOT NULL,
	"shipping_address" jsonb NOT NULL,
	"billing_address" jsonb NOT NULL,
	"promotion_id" uuid,
	"promotion_code_snapshot" text,
	"promotion_type_snapshot" text,
	"promotion_value_snapshot" integer,
	"promotion_discount_amount" integer,
	"delivery_rule_id" uuid,
	"delivery_label_snapshot" text,
	"delivery_estimate_snapshot" text,
	"idempotency_scope_hash" text NOT NULL,
	"idempotency_key_hash" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"locale" text NOT NULL,
	"correlation_id" text,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_money_nonneg_chk" CHECK ("orders"."total_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"payload_version" integer DEFAULT 1 NOT NULL,
	"status" "outbox_status" DEFAULT 'PENDING' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"method" text NOT NULL,
	"provider_reference" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'AMD' NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_chk" CHECK ("payments"."amount" >= 0),
	CONSTRAINT "payments_attempt_chk" CHECK ("payments"."attempt_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"translations" jsonb NOT NULL,
	"price_amount" integer NOT NULL,
	"compare_at_amount" integer,
	"stock_on_hand" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"status" "product_status" DEFAULT 'DRAFT' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_upcoming" boolean DEFAULT false NOT NULL,
	"badge_translations" jsonb,
	"badge_style" text,
	"badge_position" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "products_price_nonneg_chk" CHECK ("products"."price_amount" >= 0),
	CONSTRAINT "products_compare_nonneg_chk" CHECK ("products"."compare_at_amount" IS NULL OR "products"."compare_at_amount" >= 0),
	CONSTRAINT "products_stock_nonneg_chk" CHECK ("products"."stock_on_hand" >= 0)
);
--> statement-breakpoint
CREATE TABLE "promotion_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"promotion_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" "promotion_kind" NOT NULL,
	"code" text,
	"product_id" uuid,
	"category_id" uuid,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" integer NOT NULL,
	"max_discount_amount" integer,
	"minimum_order_amount" integer,
	"total_usage_limit" integer,
	"per_user_usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"allow_stacking" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_kind_chk" CHECK ((
        ("promotions"."kind" = 'COUPON' AND "promotions"."code" IS NOT NULL)
        OR (
          "promotions"."kind" = 'AUTOMATIC'
          AND "promotions"."code" IS NULL
          AND (
            ("promotions"."product_id" IS NOT NULL AND "promotions"."category_id" IS NULL)
            OR ("promotions"."product_id" IS NULL AND "promotions"."category_id" IS NOT NULL)
          )
        )
      )),
	CONSTRAINT "promotions_single_target_chk" CHECK (NOT ("promotions"."product_id" IS NOT NULL AND "promotions"."category_id" IS NOT NULL)),
	CONSTRAINT "promotions_value_chk" CHECK ("promotions"."discount_value" > 0),
	CONSTRAINT "promotions_used_chk" CHECK ("promotions"."used_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"moderation_status" "review_moderation_status" DEFAULT 'PENDING' NOT NULL,
	"moderated_by_user_id" uuid,
	"moderated_at" timestamp with time zone,
	"moderation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_chk" CHECK ("reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_activity_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"reason" "stock_movement_reason" NOT NULL,
	"order_id" uuid,
	"actor_user_id" uuid,
	"resulting_balance" integer NOT NULL,
	"correlation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"password_hash" text NOT NULL,
	"password_updated_at" timestamp with time zone NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"role" "user_role" DEFAULT 'CUSTOMER' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"terms_accepted_at" timestamp with time zone,
	"terms_version" text,
	"last_login_at" timestamp with time zone,
	"anonymized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_hero_slide_id_hero_slides_id_fk" FOREIGN KEY ("hero_slide_id") REFERENCES "public"."hero_slides"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_blog_post_id_blog_posts_id_fk" FOREIGN KEY ("blog_post_id") REFERENCES "public"."blog_posts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_rule_id_delivery_rules_id_fk" FOREIGN KEY ("delivery_rule_id") REFERENCES "public"."delivery_rules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_users" ADD CONSTRAINT "promotion_users_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_users" ADD CONSTRAINT "promotion_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_user_id_users_id_fk" FOREIGN KEY ("moderated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_user_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "addresses_default_shipping_uidx" ON "addresses" USING btree ("user_id") WHERE "addresses"."is_default_shipping" = true AND "addresses"."archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "addresses_default_billing_uidx" ON "addresses" USING btree ("user_id") WHERE "addresses"."is_default_billing" = true AND "addresses"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_target_created_idx" ON "audit_logs" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "blog_posts_status_published_idx" ON "blog_posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_hy_uidx" ON "blog_posts" USING btree (("translations"->'hy'->>'slug')) WHERE "blog_posts"."translations"->'hy'->>'slug' IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_en_uidx" ON "blog_posts" USING btree (("translations"->'en'->>'slug')) WHERE "blog_posts"."translations"->'en'->>'slug' IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_ru_uidx" ON "blog_posts" USING btree (("translations"->'ru'->>'slug')) WHERE "blog_posts"."translations"->'ru'->>'slug' IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_product_uidx" ON "cart_items" USING btree ("cart_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "carts_active_user_uidx" ON "carts" USING btree ("user_id") WHERE "carts"."status" = 'ACTIVE' AND "carts"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "carts_active_guest_uidx" ON "carts" USING btree ("guest_token_hash") WHERE "carts"."status" = 'ACTIVE' AND "carts"."guest_token_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "carts_status_idx" ON "carts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "categories_status_sort_idx" ON "categories" USING btree ("status","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_hy_uidx" ON "categories" USING btree (("translations"->'hy'->>'slug')) WHERE "categories"."translations"->'hy'->>'slug' IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_en_uidx" ON "categories" USING btree (("translations"->'en'->>'slug')) WHERE "categories"."translations"->'en'->>'slug' IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_ru_uidx" ON "categories" USING btree (("translations"->'ru'->>'slug')) WHERE "categories"."translations"->'ru'->>'slug' IS NOT NULL;--> statement-breakpoint
CREATE INDEX "contact_messages_status_created_idx" ON "contact_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "delivery_rules_match_idx" ON "delivery_rules" USING btree ("is_active","country_code","region","city","priority");--> statement-breakpoint
CREATE INDEX "hero_slides_active_sort_idx" ON "hero_slides" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_object_key_uidx" ON "media_assets" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "media_assets_product_idx" ON "media_assets" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "media_assets_category_idx" ON "media_assets" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "media_assets_hero_idx" ON "media_assets" USING btree ("hero_slide_id");--> statement-breakpoint
CREATE INDEX "media_assets_blog_idx" ON "media_assets" USING btree ("blog_post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_product_primary_uidx" ON "media_assets" USING btree ("product_id") WHERE "media_assets"."product_id" IS NOT NULL AND "media_assets"."is_primary" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_hero_desktop_uidx" ON "media_assets" USING btree ("hero_slide_id") WHERE "media_assets"."hero_slide_id" IS NOT NULL AND "media_assets"."role" = 'HERO_DESKTOP';--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_hero_mobile_uidx" ON "media_assets" USING btree ("hero_slide_id") WHERE "media_assets"."hero_slide_id" IS NOT NULL AND "media_assets"."role" = 'HERO_MOBILE';--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_blog_cover_uidx" ON "media_assets" USING btree ("blog_post_id") WHERE "media_assets"."blog_post_id" IS NOT NULL AND "media_assets"."role" = 'COVER';--> statement-breakpoint
CREATE INDEX "order_events_order_created_idx" ON "order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_events_type_idx" ON "order_events" USING btree ("event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "order_events_provider_event_uidx" ON "order_events" USING btree ("provider_event_id") WHERE "order_events"."provider_event_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_uidx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_idempotency_uidx" ON "orders" USING btree ("idempotency_scope_hash","idempotency_key_hash","request_fingerprint");--> statement-breakpoint
CREATE INDEX "orders_user_placed_idx" ON "orders" USING btree ("user_id","placed_at");--> statement-breakpoint
CREATE INDEX "orders_status_placed_idx" ON "orders" USING btree ("status","placed_at");--> statement-breakpoint
CREATE INDEX "orders_payment_status_placed_idx" ON "orders" USING btree ("payment_status","placed_at");--> statement-breakpoint
CREATE INDEX "orders_promotion_user_status_idx" ON "orders" USING btree ("promotion_id","user_id","status");--> statement-breakpoint
CREATE INDEX "outbox_events_status_available_idx" ON "outbox_events" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "outbox_events_aggregate_idx" ON "outbox_events" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "payments_order_attempt_idx" ON "payments" USING btree ("order_id","attempt_number");--> statement-breakpoint
CREATE INDEX "payments_provider_ref_status_idx" ON "payments" USING btree ("provider_reference","status");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_uidx" ON "product_categories" USING btree ("product_id","category_id");--> statement-breakpoint
CREATE INDEX "product_categories_category_idx" ON "product_categories" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_primary_uidx" ON "product_categories" USING btree ("product_id") WHERE "product_categories"."is_primary" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_uidx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_status_created_idx" ON "products" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "products_stock_idx" ON "products" USING btree ("stock_on_hand");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_hy_uidx" ON "products" USING btree (("translations"->'hy'->>'slug')) WHERE "products"."translations"->'hy'->>'slug' IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_en_uidx" ON "products" USING btree (("translations"->'en'->>'slug')) WHERE "products"."translations"->'en'->>'slug' IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_ru_uidx" ON "products" USING btree (("translations"->'ru'->>'slug')) WHERE "products"."translations"->'ru'->>'slug' IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "promotion_users_uidx" ON "promotion_users" USING btree ("promotion_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_code_uidx" ON "promotions" USING btree ("code") WHERE "promotions"."code" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "promotions_active_dates_idx" ON "promotions" USING btree ("is_active","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "promotions_product_idx" ON "promotions" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "promotions_category_idx" ON "promotions" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_user_product_uidx" ON "reviews" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "reviews_product_status_created_idx" ON "reviews" USING btree ("product_id","moderation_status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_uidx" ON "sessions" USING btree ("session_token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_expires_idx" ON "sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "stock_movements_product_created_idx" ON "stock_movements" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_order_idx" ON "stock_movements" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uidx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_status_idx" ON "users" USING btree ("role","status");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_items_user_product_uidx" ON "wishlist_items" USING btree ("user_id","product_id");