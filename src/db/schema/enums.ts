import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "CUSTOMER"]);

export const userStatusEnum = pgEnum("user_status", [
  "ACTIVE",
  "SUSPENDED",
  "ANONYMIZED",
]);

export const productStatusEnum = pgEnum("product_status", [
  "DRAFT",
  "ACTIVE",
  "ARCHIVED",
]);

export const doorClassificationEnum = pgEnum("door_classification", [
  "INTERIOR",
  "ENTRANCE",
]);

export const entranceEnvironmentEnum = pgEnum("entrance_environment", [
  "APARTMENT",
  "OUTDOOR_HOUSE",
]);

export const doorMechanismEnum = pgEnum("door_mechanism", [
  "HINGED",
  "SLIDING",
  "FOLDING",
]);

export const doorFrameSystemEnum = pgEnum("door_frame_system", [
  "STANDARD",
  "CONCEALED",
]);

export const doorLeafConfigurationEnum = pgEnum("door_leaf_configuration", [
  "SINGLE",
  "DOUBLE",
  "UNEQUAL_DOUBLE",
]);

export const variantItemTypeEnum = pgEnum("variant_item_type", [
  "LEGACY",
  "LEAF_ONLY",
  "FRAMED_UNIT",
  "FIXED_PACKAGE",
]);

export const doorHandingEnum = pgEnum("door_handing", [
  "LEFT",
  "RIGHT",
  "REVERSIBLE",
  "NOT_APPLICABLE",
]);

export const doorSwingEnum = pgEnum("door_swing", [
  "INWARD",
  "OUTWARD",
  "NOT_APPLICABLE",
]);

export const productVariantStatusEnum = pgEnum("product_variant_status", [
  "ACTIVE",
  "INQUIRY",
  "ARCHIVED",
]);

export const includedComponentStatusEnum = pgEnum(
  "included_component_status",
  ["INCLUDED", "EXCLUDED", "UNKNOWN"],
);

export const categoryStatusEnum = pgEnum("category_status", [
  "ACTIVE",
  "ARCHIVED",
]);

export const mediaUploadStatusEnum = pgEnum("media_upload_status", [
  "PENDING",
  "READY",
  "FAILED",
]);

export const mediaRoleEnum = pgEnum("media_role", [
  "GALLERY",
  "PRIMARY",
  "COVER",
  "HERO_DESKTOP",
  "HERO_MOBILE",
  "BRANDING",
]);

export const stockMovementReasonEnum = pgEnum("stock_movement_reason", [
  "ORDER",
  "CANCEL",
  "RETURN",
  "ADMIN_ADJUSTMENT",
  "IMPORT",
]);

export const blogPostStatusEnum = pgEnum("blog_post_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const cartStatusEnum = pgEnum("cart_status", [
  "ACTIVE",
  "MERGED",
  "CONVERTED",
  "ABANDONED",
]);

export const promotionKindEnum = pgEnum("promotion_kind", [
  "COUPON",
  "AUTOMATIC",
]);

export const discountTypeEnum = pgEnum("discount_type", [
  "PERCENTAGE",
  "FIXED",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
]);

export const orderEventTypeEnum = pgEnum("order_event_type", [
  "STATUS_CHANGE",
  "NOTE",
  "PAYMENT_PROVIDER",
]);

export const reviewModerationStatusEnum = pgEnum("review_moderation_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const contactMessageStatusEnum = pgEnum("contact_message_status", [
  "UNREAD",
  "READ",
  "REPLIED",
  "ARCHIVED",
]);

export const outboxStatusEnum = pgEnum("outbox_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);
