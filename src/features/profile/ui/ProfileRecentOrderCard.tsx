import { ShoppingBag } from "lucide-react";

import {
  PROFILE_CARD_FLAT_CLASS,
  PROFILE_ICON_TONE,
  PROFILE_PENDING_BADGE_CLASS,
} from "@/features/profile/ui/profile-surface-classes";

type ProfileRecentOrderCardProps = {
  orderNumber: string;
  status: string;
  totalLabel: string;
  metaLine: string;
  placedOnLine: string;
  orderNumberLabel: string;
  viewDetailsLabel: string;
  onViewDetails: () => void;
};

/** Recent-order card for the profile dashboard (grill layout/sizing, store colors). */
export function ProfileRecentOrderCard({
  orderNumber,
  status,
  totalLabel,
  metaLine,
  placedOnLine,
  orderNumberLabel,
  viewDetailsLabel,
  onViewDetails,
}: ProfileRecentOrderCardProps) {
  return (
    <button
      type="button"
      onClick={onViewDetails}
      className={`flex h-full w-full flex-col p-5 text-left transition-transform duration-200 ease-out hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${PROFILE_CARD_FLAT_CLASS} border border-gray-100`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-lg font-bold text-gray-900">
          {orderNumberLabel} {orderNumber}
        </h3>
        <span className={`${PROFILE_PENDING_BADGE_CLASS} shrink-0`}>
          {status}
        </span>
      </div>

      <p className="mt-2.5 text-[1.375rem] leading-none font-bold tracking-tight text-gray-900 sm:text-2xl">
        {totalLabel}
      </p>

      <div
        className="my-5 border-t border-dashed border-gray-200"
        aria-hidden
      />

      <div className="flex items-center gap-3.5">
        <div
          className="flex h-[45px] w-[45px] shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: PROFILE_ICON_TONE.background,
            color: PROFILE_ICON_TONE.foreground,
          }}
        >
          <ShoppingBag className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 text-sm leading-snug text-gray-600">
          <p className="truncate">{metaLine}</p>
          <p className="mt-0.5 truncate">{placedOnLine}</p>
        </div>
      </div>

      <div className="mt-auto pt-5">
        <span className="flex h-[50px] w-full items-center gap-2 rounded-full bg-gray-900 py-0.5 pr-0.5 pl-4 text-base font-medium text-white">
          <span className="min-w-0 flex-1 truncate text-center">
            {viewDetailsLabel}
          </span>
          <span className="mr-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-lg text-gray-900">
            →
          </span>
        </span>
      </div>
    </button>
  );
}
