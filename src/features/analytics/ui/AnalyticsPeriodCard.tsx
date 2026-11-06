"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Card } from "@/components/ui/Card";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import {
  ADMIN_INPUT,
  ADMIN_LABEL,
} from "@/features/admin/ui/admin-form-classes";
import {
  ANALYTICS_PERIOD_PRESETS,
  analyticsPeriodLabel,
  formatAnalyticsDisplayDate,
  rangeForAnalyticsPeriod,
  type AnalyticsPeriodPreset,
} from "@/features/analytics/domain/date-range";

type AnalyticsPeriodCardProps = {
  locale: string;
  from: string;
  to: string;
  preset: AnalyticsPeriodPreset;
  exportQuery: string;
  rangeInvalid: boolean;
};

export function AnalyticsPeriodCard({
  locale,
  from,
  to,
  preset,
  exportQuery,
  rangeInvalid,
}: AnalyticsPeriodCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [forceCustom, setForceCustom] = useState(preset === "custom");
  const selectedPreset: AnalyticsPeriodPreset = forceCustom
    ? "custom"
    : preset;

  function navigate(nextFrom: string, nextTo: string): void {
    const params = new URLSearchParams({ from: nextFrom, to: nextTo });
    setForceCustom(false);
    startTransition(() => {
      router.push(`/${locale}/admin/analytics?${params.toString()}`);
    });
  }

  function onPeriodChange(value: string): void {
    const next = value as AnalyticsPeriodPreset;
    if (next === "custom") {
      setForceCustom(true);
      return;
    }
    const range = rangeForAnalyticsPeriod(next);
    navigate(range.from, range.to);
  }

  function onCustomSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextFrom = String(data.get("from") ?? "");
    const nextTo = String(data.get("to") ?? "");
    if (!nextFrom || !nextTo) {
      return;
    }
    navigate(nextFrom, nextTo);
  }

  return (
    <Card className="mb-6 rounded-2xl p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Time Period</h2>
        <p className="text-sm font-medium text-gray-500">
          {formatAnalyticsDisplayDate(from)} – {formatAnalyticsDisplayDate(to)}
        </p>
      </div>

      <div className="max-w-md">
        <span className={ADMIN_LABEL}>Period</span>
        <SelectDropdown
          ariaLabel="Period"
          value={selectedPreset}
          options={ANALYTICS_PERIOD_PRESETS.map((option) => ({
            label: analyticsPeriodLabel(option),
            value: option,
          }))}
          disabled={pending}
          deferChange={false}
          className="mt-1"
          onValueChange={onPeriodChange}
        />
      </div>

      {selectedPreset === "custom" ? (
        <form
          onSubmit={onCustomSubmit}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <label className="min-w-[140px] flex-1">
            <span className={ADMIN_LABEL}>From</span>
            <input
              name="from"
              type="date"
              defaultValue={from}
              className={ADMIN_INPUT}
            />
          </label>
          <label className="min-w-[140px] flex-1">
            <span className={ADMIN_LABEL}>To</span>
            <input
              name="to"
              type="date"
              defaultValue={to}
              className={ADMIN_INPUT}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            Apply
          </button>
        </form>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <a
          href={`/api/exports/admin/analytics?${exportQuery}`}
          className="text-sm font-medium text-gray-700 underline-offset-2 hover:underline"
        >
          Download CSV export
        </a>
        {rangeInvalid ? (
          <p className="text-sm text-red-700">
            Invalid date range. Showing defaults.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
