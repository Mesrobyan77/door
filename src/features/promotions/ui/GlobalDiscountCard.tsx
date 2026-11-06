"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Percent } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ADMIN_INPUT } from "@/features/admin/ui/admin-form-classes";
import { setGlobalDiscountAction } from "@/features/promotions/application/manage-discounts";
import { useSyncedState } from "@/lib/react/sync-state-from-prop";

const QUICK_PERCENTS = [10, 20, 30, 50] as const;

type GlobalDiscountCardProps = {
  locale: string;
  initialPercent: number | null;
};

export function GlobalDiscountCard({
  locale,
  initialPercent,
}: GlobalDiscountCardProps) {
  const router = useRouter();
  const sourceValue = initialPercent != null ? String(initialPercent) : "";
  const [value, setValue] = useSyncedState(sourceValue);
  const [saved, setSaved] = useSyncedState(initialPercent);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function parseInput(): number | null | "invalid" {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const next = Number(trimmed);
    if (!Number.isInteger(next) || next < 1 || next > 100) return "invalid";
    return next;
  }

  function save(next: number | null): void {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await setGlobalDiscountAction(locale, next);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setSaved(result.value.percentage);
      setValue(
        result.value.percentage != null ? String(result.value.percentage) : "",
      );
      setMessage(
        result.value.percentage == null
          ? "Global discount cleared."
          : `Global discount set to ${result.value.percentage}%.`,
      );
      router.refresh();
    });
  }

  return (
    <article className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
          <Percent className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Global Discount
          </h2>
          <p className="text-sm text-gray-500">For All Products</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="global-discount-input">
          Global discount percentage
        </label>
        <div className="relative min-w-[8rem] flex-1">
          <input
            id="global-discount-input"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            placeholder="0"
            value={value}
            disabled={isPending}
            onChange={(event) => setValue(event.target.value)}
            className={`${ADMIN_INPUT} pr-8`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
            %
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => {
            const parsed = parseInput();
            if (parsed === "invalid") {
              setError("Enter a whole number from 1 to 100, or leave empty.");
              return;
            }
            save(parsed);
          }}
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        {saved == null
          ? "No global discount. Enter percentage (0-100) to discount all products."
          : `Active global discount: ${saved}%.`}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {QUICK_PERCENTS.map((percent) => (
          <button
            key={percent}
            type="button"
            disabled={isPending}
            onClick={() => setValue(String(percent))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            {percent}%
          </button>
        ))}
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setValue(saved != null ? String(saved) : "");
            setError(null);
            setMessage(null);
          }}
          className="px-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
    </article>
  );
}
