'use client';

import type { ProductVariantDraft } from '@/features/products/types';
import {
  ProductDrawerImages,
  type ProductDraftImage,
} from '@/features/products/ui/ProductDrawerImages';
import { ADMIN_INPUT, ADMIN_LABEL } from '@/features/admin/ui/admin-form-classes';
import { discardPendingAdminImage } from '@/lib/media/client-upload';
import type { Dictionary } from '@/lib/i18n/get-dictionary';

type Props = {
  variants: ProductVariantDraft[];
  disabled: boolean;
  open: boolean;
  labels: Dictionary['product'];
  onImageUploadingChange: (variantKey: string, uploading: boolean) => void;
  onError: (message: string) => void;
  onChange: (variants: ProductVariantDraft[]) => void;
};

const dimensionFields = [
  ['leafWidthMm', 'leafWidth'],
  ['leafHeightMm', 'leafHeight'],
  ['leafThicknessMm', 'leafThickness'],
  ['secondaryLeafWidthMm', 'secondaryLeafWidth'],
  ['unitWidthMm', 'unitWidth'],
  ['unitHeightMm', 'unitHeight'],
  ['frameDepthMm', 'frameDepth'],
  ['roughOpeningWidthMm', 'roughOpeningWidth'],
  ['roughOpeningHeightMm', 'roughOpeningHeight'],
] as const;

const componentFields = [
  ['FRAME', 'componentFrame'],
  ['ARCHITRAVE', 'componentArchitrave'],
  ['HINGE', 'componentHinge'],
  ['HANDLE', 'componentHandle'],
  ['LOCK', 'componentLock'],
  ['CYLINDER', 'componentCylinder'],
  ['THRESHOLD', 'componentThreshold'],
  ['FRAME_EXTENSION', 'componentFrameExtension'],
] as const;

function createVariant(): ProductVariantDraft {
  return {
    sku: '',
    itemType: 'FRAMED_UNIT',
    status: 'ACTIVE',
    priceAmount: null,
    compareAtAmount: null,
    stockOnHand: 0,
    lowStockThreshold: 5,
    leafWidthMm: null,
    leafHeightMm: null,
    leafThicknessMm: null,
    secondaryLeafWidthMm: null,
    unitWidthMm: null,
    unitHeightMm: null,
    frameDepthMm: null,
    roughOpeningWidthMm: null,
    roughOpeningHeightMm: null,
    colorName: null,
    finishName: null,
    exteriorColorName: null,
    exteriorFinishName: null,
    handing: null,
    swing: null,
    includedComponents: null,
    images: [],
    removeImageIds: [],
  };
}

export function ProductVariantsEditor({
  variants,
  disabled,
  open,
  labels,
  onImageUploadingChange,
  onError,
  onChange,
}: Props) {
  const copy = labels.variant;

  function updateVariant(index: number, update: Partial<ProductVariantDraft>): void {
    onChange(
      variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...update } : variant,
      ),
    );
  }

  function updateVariantImages(index: number, images: ProductDraftImage[]): void {
    const variant = variants[index];
    if (!variant) return;
    const visibleIds = new Set(
      images.flatMap((image) => (image.existingId ? [image.existingId] : [])),
    );
    const removedImageIds = [
      ...new Set([
        ...variant.removeImageIds,
        ...variant.images.flatMap((image) =>
          image.existingId && !visibleIds.has(image.existingId) ? [image.existingId] : [],
        ),
      ]),
    ];
    updateVariant(index, { images, removeImageIds: removedImageIds });
  }

  async function removeVariant(index: number): Promise<void> {
    const variant = variants[index];
    if (!variant) return;

    const pendingImages = variant.images.flatMap((image) =>
      image.mediaAssetId ? [{ key: image.key, mediaAssetId: image.mediaAssetId }] : [],
    );
    const outcomes = await Promise.allSettled(
      pendingImages.map((image) => discardPendingAdminImage(image.mediaAssetId)),
    );
    const discardedKeys = new Set(
      outcomes.flatMap((outcome, outcomeIndex) =>
        outcome.status === 'fulfilled' && pendingImages[outcomeIndex]
          ? [pendingImages[outcomeIndex].key]
          : [],
      ),
    );

    if (outcomes.some((outcome) => outcome.status === 'rejected')) {
      updateVariantImages(
        index,
        variant.images.filter((image) => !discardedKeys.has(image.key)),
      );
      onError(labels.media.pendingDeleteError);
      return;
    }

    onChange(variants.filter((_, variantIndex) => variantIndex !== index));
  }

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-900">{copy.label}</h3>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...variants, createVariant()])}
          className="text-sm font-medium underline disabled:opacity-50"
        >
          {copy.addDoorVariant}
        </button>
      </div>

      {variants.map((variant, index) => (
        <fieldset
          key={variant.id ?? `new-${index}`}
          className="space-y-4 rounded-md border border-gray-200 p-3"
          disabled={disabled}
        >
          <legend className="px-1 text-sm font-semibold text-gray-700">
            {copy.label} {index + 1}
          </legend>

          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className={ADMIN_LABEL}>{copy.sku} *</span>
              <input
                required
                value={variant.sku}
                onChange={(event) => updateVariant(index, { sku: event.target.value })}
                className={ADMIN_INPUT}
              />
            </label>
            <label>
              <span className={ADMIN_LABEL}>{copy.label}</span>
              <select
                value={variant.itemType}
                onChange={(event) =>
                  updateVariant(index, {
                    itemType: event.target.value as ProductVariantDraft['itemType'],
                  })
                }
                className={ADMIN_INPUT}
              >
                <option value="LEAF_ONLY">{copy.leafOnly}</option>
                <option value="FRAMED_UNIT">{copy.framedUnit}</option>
                <option value="FIXED_PACKAGE">{copy.fixedPackage}</option>
                <option value="LEGACY">{copy.legacy}</option>
              </select>
            </label>
            <label>
              <span className={ADMIN_LABEL}>{labels.priceAmount}</span>
              <input
                min={0}
                step={1}
                type="number"
                value={variant.priceAmount ?? ''}
                onChange={(event) =>
                  updateVariant(index, {
                    priceAmount: event.target.value === '' ? null : Number(event.target.value),
                  })
                }
                className={ADMIN_INPUT}
              />
            </label>
            <label>
              <span className={ADMIN_LABEL}>{labels.compareAtAmount}</span>
              <input
                min={0}
                step={1}
                type="number"
                value={variant.compareAtAmount ?? ''}
                onChange={(event) =>
                  updateVariant(index, {
                    compareAtAmount: event.target.value === '' ? null : Number(event.target.value),
                  })
                }
                className={ADMIN_INPUT}
              />
            </label>
            <label>
              <span className={ADMIN_LABEL}>{labels.inventory}</span>
              <input
                required
                min={0}
                step={1}
                type="number"
                value={variant.stockOnHand}
                onChange={(event) =>
                  updateVariant(index, {
                    stockOnHand: Number(event.target.value),
                  })
                }
                className={ADMIN_INPUT}
              />
            </label>
            <label>
              <span className={ADMIN_LABEL}>{labels.lowStockThreshold}</span>
              <input
                required
                min={0}
                step={1}
                type="number"
                value={variant.lowStockThreshold}
                onChange={(event) =>
                  updateVariant(index, {
                    lowStockThreshold: Number(event.target.value),
                  })
                }
                className={ADMIN_INPUT}
              />
            </label>
            <label>
              <span className={ADMIN_LABEL}>{labels.variantStatus}</span>
              <select
                value={variant.status}
                onChange={(event) =>
                  updateVariant(index, {
                    status: event.target.value as ProductVariantDraft['status'],
                  })
                }
                className={ADMIN_INPUT}
              >
                <option value="ACTIVE">{labels.statusActive}</option>
                <option value="INQUIRY">{labels.statusInquiry}</option>
                <option value="ARCHIVED">{labels.statusArchived}</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {dimensionFields.map(([field, labelKey]) => (
              <label key={field}>
                <span className={ADMIN_LABEL}>
                  {copy[labelKey]} ({copy.millimetres})
                </span>
                <input
                  min={1}
                  step={1}
                  type="number"
                  value={variant[field] ?? ''}
                  onChange={(event) =>
                    updateVariant(index, {
                      [field]: event.target.value === '' ? null : Number(event.target.value),
                    })
                  }
                  className={ADMIN_INPUT}
                />
              </label>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['colorName', copy.color],
                ['finishName', copy.finish],
                ['exteriorColorName', copy.exteriorColor],
                ['exteriorFinishName', copy.exteriorFinish],
              ] as const
            ).map(([field, label]) => (
              <label key={field}>
                <span className={ADMIN_LABEL}>{label}</span>
                <input
                  value={variant[field] ?? ''}
                  onChange={(event) =>
                    updateVariant(index, { [field]: event.target.value || null })
                  }
                  className={ADMIN_INPUT}
                />
              </label>
            ))}
            <label>
              <span className={ADMIN_LABEL}>{copy.handing}</span>
              <span className="mb-1 block text-xs text-gray-500">{copy.handingEntryHint}</span>
              <select
                value={variant.handing ?? ''}
                onChange={(event) =>
                  updateVariant(index, {
                    handing: event.target.value
                      ? (event.target.value as ProductVariantDraft['handing'])
                      : null,
                  })
                }
                className={ADMIN_INPUT}
              >
                <option value="">{labels.selectValue}</option>
                <option value="LEFT">{copy.left}</option>
                <option value="RIGHT">{copy.right}</option>
                <option value="REVERSIBLE">{copy.reversible}</option>
                <option value="NOT_APPLICABLE">{copy.notApplicable}</option>
              </select>
            </label>
            <label>
              <span className={ADMIN_LABEL}>{copy.swing}</span>
              <select
                value={variant.swing ?? ''}
                onChange={(event) =>
                  updateVariant(index, {
                    swing: event.target.value
                      ? (event.target.value as ProductVariantDraft['swing'])
                      : null,
                  })
                }
                className={ADMIN_INPUT}
              >
                <option value="">{labels.selectValue}</option>
                <option value="INWARD">{copy.inward}</option>
                <option value="OUTWARD">{copy.outward}</option>
                <option value="NOT_APPLICABLE">{copy.notApplicable}</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {componentFields.map(([code, labelKey]) => {
              const component = variant.includedComponents?.find((entry) => entry.code === code);
              return (
                <label key={code}>
                  <span className={ADMIN_LABEL}>{copy[labelKey]}</span>
                  <select
                    value={component?.status ?? ''}
                    onChange={(event) => {
                      const remaining =
                        variant.includedComponents?.filter((entry) => entry.code !== code) ?? [];
                      const next = event.target.value
                        ? [
                            ...remaining,
                            {
                              code,
                              status: event.target.value as 'INCLUDED' | 'EXCLUDED' | 'UNKNOWN',
                              ...(component?.quantity != null
                                ? { quantity: component.quantity }
                                : {}),
                            },
                          ]
                        : remaining;
                      updateVariant(index, {
                        includedComponents: next.length ? next : null,
                      });
                    }}
                    className={ADMIN_INPUT}
                  >
                    <option value="">{labels.selectValue}</option>
                    <option value="INCLUDED">{copy.included}</option>
                    <option value="EXCLUDED">{copy.excluded}</option>
                    <option value="UNKNOWN">{copy.unknown}</option>
                  </select>
                  {component?.status === 'INCLUDED' ? (
                    <input
                      aria-label={`${copy[componentFields.find(([field]) => field === code)?.[1] ?? 'includedComponents']} ${labels.componentQuantity}`}
                      min={1}
                      step={1}
                      type="number"
                      value={component.quantity ?? ''}
                      onChange={(event) =>
                        updateVariant(index, {
                          includedComponents:
                            variant.includedComponents?.map((entry) =>
                              entry.code === code
                                ? {
                                    ...entry,
                                    quantity:
                                      event.target.value === ''
                                        ? undefined
                                        : Number(event.target.value),
                                  }
                                : entry,
                            ) ?? null,
                        })
                      }
                      className={`${ADMIN_INPUT} mt-2`}
                    />
                  ) : null}
                </label>
              );
            })}
          </div>

          <ProductDrawerImages
            heading={labels.media.variantHeading}
            images={variant.images}
            disabled={disabled}
            open={open}
            purpose="product"
            labels={labels.media}
            onChange={(images) => updateVariantImages(index, images)}
            onUploadingChange={(uploading) =>
              onImageUploadingChange(variant.id ?? `new-${index}`, uploading)
            }
            onError={onError}
          />

          {variants.length > 1 ? (
            <button
              type="button"
              onClick={() => void removeVariant(index)}
              className="text-sm text-red-700 underline"
            >
              {copy.removeVariant}
            </button>
          ) : null}
        </fieldset>
      ))}
    </section>
  );
}
