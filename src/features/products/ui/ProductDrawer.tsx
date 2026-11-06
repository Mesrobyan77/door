'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { SideSheet } from '@/components/ui/SideSheet';
import { ADMIN_INPUT, ADMIN_LABEL, ADMIN_TEXTAREA } from '@/features/admin/ui/admin-form-classes';
import type {
  AdminCategoryOption,
  AdminProductListItem,
} from '@/features/products/application/list-admin-products';
import {
  createProductFromDrawerAction,
  updateProductFromDrawerAction,
} from '@/features/products/application/upsert-product';
import { ProductDrawerCategories } from '@/features/products/ui/ProductDrawerCategories';
import { ProductDrawerImages } from '@/features/products/ui/ProductDrawerImages';
import { ProductVariantsEditor } from '@/features/products/ui/ProductVariantsEditor';
import type { PerformanceSpecifications } from '@/db/schema/catalog';
import type { ProductDraftImage, ProductVariantDraft } from '@/features/products/types';
import type { Dictionary } from '@/lib/i18n/get-dictionary';

type ProductDrawerProduct = Pick<
  AdminProductListItem,
  | 'id'
  | 'sku'
  | 'title'
  | 'slug'
  | 'description'
  | 'priceAmount'
  | 'compareAtAmount'
  | 'stockOnHand'
  | 'status'
  | 'categoryIds'
  | 'images'
  | 'doorClassification'
  | 'entranceEnvironments'
  | 'brandName'
  | 'modelName'
  | 'collectionName'
  | 'structuralMaterial'
  | 'coreMaterial'
  | 'surfaceCoating'
  | 'hasGlazing'
  | 'glazingType'
  | 'manufacturer'
  | 'countryOfManufacture'
  | 'openingMechanism'
  | 'frameSystem'
  | 'leafConfiguration'
  | 'performanceSpecifications'
  | 'variants'
>;

type ProductDrawerProps = {
  locale: string;
  open: boolean;
  onClose: () => void;
  product?: ProductDrawerProduct | null;
  categories: AdminCategoryOption[];
  productCopy: Dictionary['product'];
};

function createDefaultVariant(): ProductVariantDraft {
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

type DoorFields = {
  doorClassification: 'INTERIOR' | 'ENTRANCE' | null;
  entranceEnvironments: ('APARTMENT' | 'OUTDOOR_HOUSE')[];
  brandName: string;
  modelName: string;
  collectionName: string;
  structuralMaterial: string;
  coreMaterial: string;
  surfaceCoating: string;
  hasGlazing: boolean | null;
  glazingType: string;
  manufacturer: string;
  countryOfManufacture: string;
  openingMechanism: 'HINGED' | 'SLIDING' | 'FOLDING' | null;
  frameSystem: 'STANDARD' | 'CONCEALED' | null;
  leafConfiguration: 'SINGLE' | 'DOUBLE' | 'UNEQUAL_DOUBLE' | null;
  performanceSpecifications: PerformanceSpecifications | null;
};

function emptyDoorFields(): DoorFields {
  return {
    doorClassification: null,
    entranceEnvironments: [],
    brandName: '',
    modelName: '',
    collectionName: '',
    structuralMaterial: '',
    coreMaterial: '',
    surfaceCoating: '',
    hasGlazing: null,
    glazingType: '',
    manufacturer: '',
    countryOfManufacture: '',
    openingMechanism: null,
    frameSystem: null,
    leafConfiguration: null,
    performanceSpecifications: null,
  };
}

function imagesFromProduct(product: ProductDrawerProduct | null): ProductDraftImage[] {
  if (!product) return [];
  return product.images.map((image) => ({
    key: image.id,
    previewUrl: image.url,
    isPrimary: image.isPrimary,
    existingId: image.id,
  }));
}

export function ProductDrawer({
  locale,
  open,
  onClose,
  product = null,
  categories: initialCategories,
  productCopy,
}: ProductDrawerProps) {
  const router = useRouter();
  const isEdit = product != null;
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<ProductDraftImage[]>([]);
  const [uploadingImageEditors, setUploadingImageEditors] = useState<Set<string>>(new Set());
  const isUploadingImages = uploadingImageEditors.size > 0;
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<AdminCategoryOption[]>(initialCategories);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [variants, setVariants] = useState<ProductVariantDraft[]>([]);
  const [doorFields, setDoorFields] = useState<DoorFields>(emptyDoorFields);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevProduct, setPrevProduct] = useState(product);
  const [prevCategories, setPrevCategories] = useState(initialCategories);

  if (open !== prevOpen || product !== prevProduct || initialCategories !== prevCategories) {
    setPrevOpen(open);
    setPrevProduct(product);
    setPrevCategories(initialCategories);
    if (open) {
      setCategories(initialCategories);
      if (product) {
        setTitle(product.title);
        setSlug(product.slug);
        setDescription(product.description);
        setImages(imagesFromProduct(product));
        setRemovedImageIds([]);
        setCategoryIds(product.categoryIds);
        setVariants(
          product.variants.map((variant) => ({
            ...variant,
            includedComponents: variant.includedComponents ?? null,
            images: variant.images.map((image) => ({
              key: image.id,
              previewUrl: image.url,
              isPrimary: image.isPrimary,
              existingId: image.id,
            })),
            removeImageIds: [],
          })),
        );
        setDoorFields({
          doorClassification: product.doorClassification,
          entranceEnvironments: product.entranceEnvironments ?? [],
          brandName: product.brandName ?? '',
          modelName: product.modelName ?? '',
          collectionName: product.collectionName ?? '',
          structuralMaterial: product.structuralMaterial ?? '',
          coreMaterial: product.coreMaterial ?? '',
          surfaceCoating: product.surfaceCoating ?? '',
          hasGlazing: product.hasGlazing,
          glazingType: product.glazingType ?? '',
          manufacturer: product.manufacturer ?? '',
          countryOfManufacture: product.countryOfManufacture ?? '',
          openingMechanism: product.openingMechanism,
          frameSystem: product.frameSystem,
          leafConfiguration: product.leafConfiguration,
          performanceSpecifications: product.performanceSpecifications,
        });
        setError(null);
      } else {
        setTitle('');
        setSlug('');
        setDescription('');
        setImages([]);
        setRemovedImageIds([]);
        setCategoryIds([]);
        setVariants([createDefaultVariant()]);
        setDoorFields(emptyDoorFields());
        setError(null);
      }
    }
  }

  function handleImagesChange(next: ProductDraftImage[]): void {
    const nextKeys = new Set(next.map((image) => image.key));
    const removedExisting = images
      .filter(
        (image) =>
          image.existingId &&
          !nextKeys.has(image.key) &&
          !removedImageIds.includes(image.existingId),
      )
      .map((image) => image.existingId as string);
    if (removedExisting.length > 0) {
      setRemovedImageIds((prev) => [...prev, ...removedExisting]);
    }
    setImages(next);
  }

  function updateDoorField<K extends keyof DoorFields>(key: K, value: DoorFields[K]): void {
    setDoorFields((current) => ({ ...current, [key]: value }));
  }

  function updateImageEditor(key: string, uploading: boolean): void {
    setUploadingImageEditors((current) => {
      const next = new Set(current);
      if (uploading) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      ariaLabel={isEdit ? 'Edit product' : 'Add new product'}
      panelClassName="w-[min(100%,42rem)] sm:w-[40%]"
    >
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEdit ? 'Edit product' : 'Add new product'}
        </h2>
      </div>

      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          const newImages = images.filter((image) => image.mediaAssetId);
          const primaryImage = images.find((image) => image.isPrimary);
          const primaryNewIndex = primaryImage?.mediaAssetId
            ? newImages.findIndex((image) => image.key === primaryImage.key)
            : null;

          const payload = {
            title: title.trim(),
            slug: slug.trim(),
            description: description.trim() || undefined,
            doorClassification: doorFields.doorClassification,
            entranceEnvironments:
              doorFields.doorClassification === 'ENTRANCE' ? doorFields.entranceEnvironments : null,
            brandName: doorFields.brandName.trim() || null,
            modelName: doorFields.modelName.trim() || null,
            collectionName: doorFields.collectionName.trim() || null,
            structuralMaterial: doorFields.structuralMaterial.trim() || null,
            coreMaterial: doorFields.coreMaterial.trim() || null,
            surfaceCoating: doorFields.surfaceCoating.trim() || null,
            hasGlazing: doorFields.hasGlazing,
            glazingType: doorFields.glazingType.trim() || null,
            manufacturer: doorFields.manufacturer.trim() || null,
            countryOfManufacture: doorFields.countryOfManufacture.trim() || null,
            openingMechanism: doorFields.openingMechanism,
            frameSystem: doorFields.frameSystem,
            leafConfiguration: doorFields.leafConfiguration,
            performanceSpecifications: doorFields.performanceSpecifications,
            variants: variants.map((variant) => {
              const newImages = variant.images.filter((image) => image.mediaAssetId);
              const primaryImage = variant.images.find((image) => image.isPrimary);
              const primaryNewIndex = primaryImage?.mediaAssetId
                ? newImages.findIndex((image) => image.key === primaryImage.key)
                : null;
              return {
                ...variant,
                mediaAssetIds: newImages.flatMap((image) =>
                  image.mediaAssetId ? [image.mediaAssetId] : [],
                ),
                orderedImageIds: variant.images.flatMap((image) =>
                  image.existingId
                    ? [image.existingId]
                    : image.mediaAssetId
                      ? [image.mediaAssetId]
                      : [],
                ),
                primaryNewIndex:
                  primaryNewIndex != null && primaryNewIndex >= 0 ? primaryNewIndex : null,
                primaryExistingId: primaryImage?.existingId ?? null,
              };
            }),
            categoryIds,
            status: (product?.status === 'ACTIVE' || product?.status === 'ARCHIVED'
              ? product.status
              : 'DRAFT') as 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
            primaryExistingId: primaryImage?.existingId ?? null,
            primaryNewIndex:
              primaryNewIndex != null && primaryNewIndex >= 0 ? primaryNewIndex : null,
            removeImageIds: removedImageIds,
            mediaAssetIds: newImages.flatMap((image) =>
              image.mediaAssetId ? [image.mediaAssetId] : [],
            ),
          };

          const formData = new FormData();
          formData.set('data', JSON.stringify(payload));

          startTransition(async () => {
            setError(null);
            const result =
              isEdit && product
                ? await updateProductFromDrawerAction(locale, product.id, formData)
                : await createProductFromDrawerAction(locale, formData);

            if (!result.ok) {
              setError(result.error.message);
              return;
            }

            onClose();
            router.refresh();
          });
        }}
      >
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={ADMIN_LABEL}>
                Title <span className="text-red-600">*</span>
              </span>
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Product title"
                className={ADMIN_INPUT}
                disabled={isPending}
              />
            </label>
            <label>
              <span className={ADMIN_LABEL}>
                Slug <span className="text-red-600">*</span>
              </span>
              <input
                required
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="product-slug"
                className={ADMIN_INPUT}
                disabled={isPending}
              />
            </label>
          </div>

          <label className="block">
            <span className={ADMIN_LABEL}>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Product description"
              className={ADMIN_TEXTAREA}
              disabled={isPending}
            />
          </label>

          <section className="space-y-4 rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900">{productCopy.doorTitle}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={ADMIN_LABEL}>{productCopy.classificationRequired}</span>
                <select
                  value={doorFields.doorClassification ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateDoorField(
                      'doorClassification',
                      value === 'INTERIOR' || value === 'ENTRANCE' ? value : null,
                    );
                  }}
                  className={ADMIN_INPUT}
                  disabled={isPending}
                >
                  <option value="">{productCopy.selectValue}</option>
                  <option value="INTERIOR">{productCopy.variant.interior}</option>
                  <option value="ENTRANCE">{productCopy.variant.entrance}</option>
                </select>
              </label>
              <label>
                <span className={ADMIN_LABEL}>{productCopy.brandName}</span>
                <input
                  value={doorFields.brandName}
                  onChange={(event) => updateDoorField('brandName', event.target.value)}
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
              <label>
                <span className={ADMIN_LABEL}>{productCopy.modelName}</span>
                <input
                  value={doorFields.modelName}
                  onChange={(event) => updateDoorField('modelName', event.target.value)}
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
              <label>
                <span className={ADMIN_LABEL}>{productCopy.collectionName}</span>
                <input
                  value={doorFields.collectionName}
                  onChange={(event) => updateDoorField('collectionName', event.target.value)}
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
              {doorFields.doorClassification === 'ENTRANCE' ? (
                <fieldset className="space-y-2 sm:col-span-2">
                  <legend className={ADMIN_LABEL}>
                    {productCopy.variant.installationEnvironment}
                  </legend>
                  {(
                    [
                      ['APARTMENT', productCopy.variant.apartment],
                      ['OUTDOOR_HOUSE', productCopy.variant.outdoorHouse],
                    ] as const
                  ).map(([environment, label]) => (
                    <label key={environment} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={doorFields.entranceEnvironments.includes(environment)}
                        onChange={(event) =>
                          updateDoorField(
                            'entranceEnvironments',
                            event.target.checked
                              ? [...doorFields.entranceEnvironments, environment]
                              : doorFields.entranceEnvironments.filter(
                                  (current) => current !== environment,
                                ),
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              ) : null}
              <label>
                <span className={ADMIN_LABEL}>{productCopy.variant.structuralMaterial}</span>
                <input
                  value={doorFields.structuralMaterial}
                  onChange={(event) => updateDoorField('structuralMaterial', event.target.value)}
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
              <label>
                <span className={ADMIN_LABEL}>{productCopy.variant.coreMaterial}</span>
                <input
                  value={doorFields.coreMaterial}
                  onChange={(event) => updateDoorField('coreMaterial', event.target.value)}
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
              <label>
                <span className={ADMIN_LABEL}>{productCopy.variant.surfaceCoating}</span>
                <input
                  value={doorFields.surfaceCoating}
                  onChange={(event) => updateDoorField('surfaceCoating', event.target.value)}
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
              <label>
                <span className={ADMIN_LABEL}>{productCopy.variant.glazing}</span>
                <select
                  value={doorFields.hasGlazing == null ? '' : doorFields.hasGlazing ? 'yes' : 'no'}
                  onChange={(event) =>
                    updateDoorField(
                      'hasGlazing',
                      event.target.value === 'yes'
                        ? true
                        : event.target.value === 'no'
                          ? false
                          : null,
                    )
                  }
                  className={ADMIN_INPUT}
                  disabled={isPending}
                >
                  <option value="">{productCopy.selectValue}</option>
                  <option value="yes">{productCopy.variant.yes}</option>
                  <option value="no">{productCopy.variant.no}</option>
                </select>
              </label>
              <label>
                <span className={ADMIN_LABEL}>{productCopy.variant.glazingType}</span>
                <input
                  value={doorFields.glazingType}
                  onChange={(event) => updateDoorField('glazingType', event.target.value)}
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
              <label>
                <span className={ADMIN_LABEL}>{productCopy.variant.manufacturer}</span>
                <input
                  value={doorFields.manufacturer}
                  onChange={(event) => updateDoorField('manufacturer', event.target.value)}
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
              <label>
                <span className={ADMIN_LABEL}>{productCopy.variant.countryOfManufacture}</span>
                <input
                  value={doorFields.countryOfManufacture}
                  onChange={(event) => updateDoorField('countryOfManufacture', event.target.value)}
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
              <label>
                <span className={ADMIN_LABEL}>{productCopy.variant.mechanism}</span>
                <select
                  value={doorFields.openingMechanism ?? ''}
                  onChange={(event) =>
                    updateDoorField(
                      'openingMechanism',
                      event.target.value === 'HINGED' ||
                        event.target.value === 'SLIDING' ||
                        event.target.value === 'FOLDING'
                        ? event.target.value
                        : null,
                    )
                  }
                  className={ADMIN_INPUT}
                  disabled={isPending}
                >
                  <option value="">{productCopy.selectValue}</option>
                  <option value="HINGED">{productCopy.variant.hinged}</option>
                  <option value="SLIDING">{productCopy.variant.sliding}</option>
                  <option value="FOLDING">{productCopy.variant.folding}</option>
                </select>
              </label>
              <label>
                <span className={ADMIN_LABEL}>{productCopy.variant.frameSystem}</span>
                <select
                  value={doorFields.frameSystem ?? ''}
                  onChange={(event) =>
                    updateDoorField(
                      'frameSystem',
                      event.target.value === 'STANDARD' || event.target.value === 'CONCEALED'
                        ? event.target.value
                        : null,
                    )
                  }
                  className={ADMIN_INPUT}
                  disabled={isPending}
                >
                  <option value="">{productCopy.selectValue}</option>
                  <option value="STANDARD">{productCopy.variant.standardFrame}</option>
                  <option value="CONCEALED">{productCopy.variant.concealedFrame}</option>
                </select>
              </label>
              <label>
                <span className={ADMIN_LABEL}>{productCopy.variant.leafConfiguration}</span>
                <select
                  value={doorFields.leafConfiguration ?? ''}
                  onChange={(event) =>
                    updateDoorField(
                      'leafConfiguration',
                      event.target.value === 'SINGLE' ||
                        event.target.value === 'DOUBLE' ||
                        event.target.value === 'UNEQUAL_DOUBLE'
                        ? event.target.value
                        : null,
                    )
                  }
                  className={ADMIN_INPUT}
                  disabled={isPending}
                >
                  <option value="">{productCopy.selectValue}</option>
                  <option value="SINGLE">{productCopy.variant.singleLeaf}</option>
                  <option value="DOUBLE">{productCopy.variant.doubleLeaf}</option>
                  <option value="UNEQUAL_DOUBLE">{productCopy.variant.unequalDoubleLeaf}</option>
                </select>
              </label>
            </div>
            <fieldset className="space-y-3">
              <legend className={ADMIN_LABEL}>{productCopy.variant.performance}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className={ADMIN_LABEL}>{productCopy.variant.thermalBreak}</span>
                  <select
                    value={
                      doorFields.performanceSpecifications?.thermalBreak == null
                        ? ''
                        : doorFields.performanceSpecifications.thermalBreak
                          ? 'yes'
                          : 'no'
                    }
                    onChange={(event) =>
                      setDoorFields((current) => ({
                        ...current,
                        performanceSpecifications: {
                          ...current.performanceSpecifications,
                          thermalBreak:
                            event.target.value === 'yes'
                              ? true
                              : event.target.value === 'no'
                                ? false
                                : null,
                        },
                      }))
                    }
                    className={ADMIN_INPUT}
                    disabled={isPending}
                  >
                    <option value="">{productCopy.selectValue}</option>
                    <option value="yes">{productCopy.variant.yes}</option>
                    <option value="no">{productCopy.variant.no}</option>
                  </select>
                </label>
                {(
                  [
                    ['thermalTransmittance', productCopy.variant.thermalTransmittance],
                    ['soundReduction', productCopy.variant.soundReduction],
                  ] as const
                ).map(([field, label]) => {
                  const measurement = doorFields.performanceSpecifications?.[field];
                  return (
                    <label key={field}>
                      <span className={ADMIN_LABEL}>{label}</span>
                      <div className="flex gap-2">
                        <input
                          min={0}
                          step="any"
                          type="number"
                          value={measurement?.value ?? ''}
                          onChange={(event) =>
                            setDoorFields((current) => {
                              const next = current.performanceSpecifications ?? {};
                              const value = event.target.value;
                              return {
                                ...current,
                                performanceSpecifications: {
                                  ...next,
                                  [field]: value
                                    ? {
                                        value: Number(value),
                                        unit: next[field]?.unit ?? '',
                                      }
                                    : null,
                                },
                              };
                            })
                          }
                          className={ADMIN_INPUT}
                          disabled={isPending}
                        />
                        <input
                          value={measurement?.unit ?? ''}
                          onChange={(event) =>
                            setDoorFields((current) => {
                              const next = current.performanceSpecifications ?? {};
                              return {
                                ...current,
                                performanceSpecifications: {
                                  ...next,
                                  [field]: next[field]
                                    ? {
                                        ...next[field],
                                        unit: event.target.value,
                                      }
                                    : null,
                                },
                              };
                            })
                          }
                          aria-label={`${label} unit`}
                          className={ADMIN_INPUT}
                          disabled={isPending}
                        />
                      </div>
                    </label>
                  );
                })}
                {(
                  [
                    ['fireClassification', productCopy.variant.fireClassification],
                    ['securityClassification', productCopy.variant.securityClassification],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field}>
                    <span className={ADMIN_LABEL}>{label}</span>
                    <input
                      value={doorFields.performanceSpecifications?.[field]?.value ?? ''}
                      onChange={(event) =>
                        setDoorFields((current) => {
                          const next = current.performanceSpecifications ?? {};
                          return {
                            ...current,
                            performanceSpecifications: {
                              ...next,
                              [field]: event.target.value
                                ? {
                                    value: event.target.value,
                                    ...(next[field]?.standard
                                      ? { standard: next[field].standard }
                                      : {}),
                                  }
                                : null,
                            },
                          };
                        })
                      }
                      className={ADMIN_INPUT}
                      disabled={isPending}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <ProductVariantsEditor
            variants={variants}
            disabled={isPending || isUploadingImages}
            open={open}
            labels={productCopy}
            onImageUploadingChange={(variantKey, uploading) =>
              updateImageEditor(`variant:${variantKey}`, uploading)
            }
            onError={setError}
            onChange={setVariants}
          />

          <ProductDrawerCategories
            locale={locale}
            categories={categories}
            selectedIds={categoryIds}
            disabled={isPending}
            onCategoriesChange={setCategories}
            onSelectedChange={setCategoryIds}
          />

          <ProductDrawerImages
            heading={productCopy.media.productHeading}
            images={images}
            disabled={isPending || isUploadingImages}
            open={open}
            labels={productCopy.media}
            onChange={handleImagesChange}
            onUploadingChange={(uploading) => updateImageEditor('product', uploading)}
            onError={setError}
          />

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>

        <div className="sticky bottom-0 flex items-center gap-4 border-t border-gray-200 bg-white px-5 py-4">
          <Button type="submit" disabled={isPending || isUploadingImages}>
            {isPending ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save' : 'Create'}
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </form>
    </SideSheet>
  );
}
