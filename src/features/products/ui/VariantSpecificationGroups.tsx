import type { ProductVariantOption } from '@/features/products/types';
import type { Dictionary } from '@/lib/i18n/get-dictionary';

export function VariantSpecificationGroups({
  variant,
  labels,
}: {
  variant: ProductVariantOption;
  labels: Dictionary['product']['variant'];
}) {
  const dimensions: Array<[string, number | null]> = [
    [labels.leafWidth, variant.leafWidthMm],
    [labels.leafHeight, variant.leafHeightMm],
    [labels.leafThickness, variant.leafThicknessMm],
    [labels.secondaryLeafWidth, variant.secondaryLeafWidthMm],
    [labels.unitWidth, variant.unitWidthMm],
    [labels.unitHeight, variant.unitHeightMm],
    [labels.frameDepth, variant.frameDepthMm],
    [labels.roughOpeningWidth, variant.roughOpeningWidthMm],
    [labels.roughOpeningHeight, variant.roughOpeningHeightMm],
  ];
  const components = {
    FRAME: labels.componentFrame,
    ARCHITRAVE: labels.componentArchitrave,
    HINGE: labels.componentHinge,
    HANDLE: labels.componentHandle,
    LOCK: labels.componentLock,
    CYLINDER: labels.componentCylinder,
    THRESHOLD: labels.componentThreshold,
    FRAME_EXTENSION: labels.componentFrameExtension,
  };
  const statuses = {
    INCLUDED: labels.included,
    EXCLUDED: labels.excluded,
    UNKNOWN: labels.unknown,
  };
  const itemType = {
    LEGACY: labels.legacy,
    LEAF_ONLY: labels.leafOnly,
    FRAMED_UNIT: labels.framedUnit,
    FIXED_PACKAGE: labels.fixedPackage,
  }[variant.itemType];
  return (
    <div className="mt-5 space-y-3 border-t border-border pt-5 text-xs text-gray-600">
      <p className="font-medium text-gray-800">
        {labels.sku}: {variant.sku} · {itemType}
      </p>
      {dimensions.some(([, value]) => value != null) ? (
        <details className="rounded-sm border border-border p-3" open>
          <summary className="font-semibold text-gray-900">{labels.dimensions}</summary>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            {dimensions
              .filter(([, value]) => value != null)
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd className="mt-1 font-medium text-gray-900">
                    {value} {labels.millimetres}
                  </dd>
                </div>
              ))}
          </dl>
        </details>
      ) : null}
      {variant.handing || variant.swing ? (
        <details className="rounded-sm border border-border p-3">
          <summary className="font-semibold text-gray-900">{labels.handing}</summary>
          <p className="mt-3 leading-6">
            {variant.handing
              ? {
                  LEFT: labels.left,
                  RIGHT: labels.right,
                  REVERSIBLE: labels.reversible,
                  NOT_APPLICABLE: labels.notApplicable,
                }[variant.handing]
              : ''}{' '}
            {variant.swing
              ? {
                  INWARD: labels.inward,
                  OUTWARD: labels.outward,
                  NOT_APPLICABLE: labels.notApplicable,
                }[variant.swing]
              : ''}
          </p>
          <p className="mt-2 leading-6">{labels.viewingConvention}</p>
        </details>
      ) : null}
      {variant.includedComponents?.length ? (
        <details className="rounded-sm border border-border p-3">
          <summary className="font-semibold text-gray-900">{labels.includedComponents}</summary>
          <dl className="mt-3 space-y-2">
            {variant.includedComponents.map((component) => (
              <div key={component.code} className="flex justify-between gap-3">
                <dt>
                  {components[component.code]}
                  {component.quantity != null ? ` × ${component.quantity}` : ''}
                </dt>
                <dd>{statuses[component.status]}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
      {variant.colorName || variant.finishName ? (
        <p className="leading-6">
          {[
            variant.colorName,
            variant.finishName,
            variant.exteriorColorName,
            variant.exteriorFinishName,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}
    </div>
  );
}
