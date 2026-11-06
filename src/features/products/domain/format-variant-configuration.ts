import type { ProductVariantOption } from "@/features/products/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

type VariantLabels = Dictionary["product"]["variant"];

const componentLabels = {
  FRAME: "componentFrame",
  ARCHITRAVE: "componentArchitrave",
  HINGE: "componentHinge",
  HANDLE: "componentHandle",
  LOCK: "componentLock",
  CYLINDER: "componentCylinder",
  THRESHOLD: "componentThreshold",
  FRAME_EXTENSION: "componentFrameExtension",
} as const satisfies Record<
  "FRAME" | "ARCHITRAVE" | "HINGE" | "HANDLE" | "LOCK" | "CYLINDER" | "THRESHOLD" | "FRAME_EXTENSION",
  keyof VariantLabels
>;

const componentStatusLabels = {
  INCLUDED: "included",
  EXCLUDED: "excluded",
  UNKNOWN: "unknown",
} as const satisfies Record<"INCLUDED" | "EXCLUDED" | "UNKNOWN", keyof VariantLabels>;

const handingLabels = {
  LEFT: "left",
  RIGHT: "right",
  REVERSIBLE: "reversible",
  NOT_APPLICABLE: "notApplicable",
} as const satisfies Record<
  "LEFT" | "RIGHT" | "REVERSIBLE" | "NOT_APPLICABLE",
  keyof VariantLabels
>;

const swingLabels = {
  INWARD: "inward",
  OUTWARD: "outward",
  NOT_APPLICABLE: "notApplicable",
} as const satisfies Record<
  "INWARD" | "OUTWARD" | "NOT_APPLICABLE",
  keyof VariantLabels
>;

export function formatVariantConfiguration(
  variant: Pick<
    ProductVariantOption,
    | "sku"
    | "itemType"
    | "leafWidthMm"
    | "leafHeightMm"
    | "leafThicknessMm"
    | "secondaryLeafWidthMm"
    | "unitWidthMm"
    | "unitHeightMm"
    | "frameDepthMm"
    | "roughOpeningWidthMm"
    | "roughOpeningHeightMm"
    | "colorName"
    | "finishName"
    | "exteriorColorName"
    | "exteriorFinishName"
    | "handing"
    | "swing"
    | "includedComponents"
  >,
  labels: VariantLabels,
  includeSku = true,
): string {
  const parts: string[] = includeSku ? [`${labels.sku}: ${variant.sku}`] : [];
  const itemTypeLabel = {
    LEGACY: labels.legacy,
    LEAF_ONLY: labels.leafOnly,
    FRAMED_UNIT: labels.framedUnit,
    FIXED_PACKAGE: labels.fixedPackage,
  }[variant.itemType];
  parts.push(itemTypeLabel);

  const dimensions: string[] = [];
  const addDimension = (label: string, value: number | null): void => {
    if (value != null) dimensions.push(`${label}: ${value} ${labels.millimetres}`);
  };
  addDimension(labels.leafWidth, variant.leafWidthMm);
  addDimension(labels.leafHeight, variant.leafHeightMm);
  addDimension(labels.leafThickness, variant.leafThicknessMm);
  addDimension(labels.secondaryLeafWidth, variant.secondaryLeafWidthMm);
  addDimension(labels.unitWidth, variant.unitWidthMm);
  addDimension(labels.unitHeight, variant.unitHeightMm);
  addDimension(labels.frameDepth, variant.frameDepthMm);
  addDimension(labels.roughOpeningWidth, variant.roughOpeningWidthMm);
  addDimension(labels.roughOpeningHeight, variant.roughOpeningHeightMm);
  if (dimensions.length > 0) parts.push(dimensions.join(", "));

  if (variant.colorName) parts.push(`${labels.color}: ${variant.colorName}`);
  if (variant.finishName) parts.push(`${labels.finish}: ${variant.finishName}`);
  if (variant.exteriorColorName) {
    parts.push(`${labels.exteriorColor}: ${variant.exteriorColorName}`);
  }
  if (variant.exteriorFinishName) {
    parts.push(`${labels.exteriorFinish}: ${variant.exteriorFinishName}`);
  }
  if (variant.handing) {
    parts.push(`${labels.handing}: ${labels[handingLabels[variant.handing]]}`);
    if (variant.handing !== "NOT_APPLICABLE") {
      parts.push(labels.viewingConvention);
    }
  }
  if (variant.swing) {
    parts.push(`${labels.swing}: ${labels[swingLabels[variant.swing]]}`);
  }

  if (!variant.includedComponents?.length) {
    parts.push(labels.noConfirmedComponents);
  } else {
    parts.push(
      `${labels.includedComponents}: ${variant.includedComponents
        .map((component) => {
          const labelKey = componentLabels[component.code];
          const statusKey = componentStatusLabels[component.status];
          const quantity =
            component.quantity != null ? ` × ${component.quantity}` : "";
          return `${labels[labelKey]} — ${labels[statusKey]}${quantity}`;
        })
        .join(", ")}`,
    );
  }

  return parts.join(" · ");
}
