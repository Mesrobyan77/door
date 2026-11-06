import type { ReactNode } from "react";

import {
  PROFILE_CARD_FLAT_CLASS,
  PROFILE_ICON_TONE,
} from "@/features/profile/ui/profile-surface-classes";

type ProfileStatCardProps = {
  label: string;
  value: string;
  icon: ReactNode;
};

export function ProfileStatCard({ label, value, icon }: ProfileStatCardProps) {
  return (
    <div
      className={`relative flex items-center overflow-hidden px-6 py-4 transition-transform duration-200 ease-out hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${PROFILE_CARD_FLAT_CLASS}`}
    >
      <div className="flex w-full items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full [&>svg]:h-5 [&>svg]:w-5"
          style={{
            backgroundColor: PROFILE_ICON_TONE.background,
            color: PROFILE_ICON_TONE.foreground,
          }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm leading-snug font-medium text-gray-600">
            {label}
          </p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
