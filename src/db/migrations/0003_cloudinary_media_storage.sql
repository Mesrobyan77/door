ALTER TABLE "media_assets" ALTER COLUMN "object_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "secure_url" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "cloudinary_public_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_cloudinary_public_id_uidx" ON "media_assets" USING btree ("cloudinary_public_id");