"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_SECTION_TITLE,
} from "@/features/admin/ui/admin-form-classes";
import { upsertStoreSettingAction } from "@/features/settings/application/upsert-settings";
import type {
  StoreFxRates,
  StoreIdentity,
} from "@/features/settings/domain/store-settings";

type StoreSettingsFormsProps = {
  locale: string;
  identity: StoreIdentity;
  fxRates: StoreFxRates;
};

export function StoreSettingsForms({
  locale,
  identity,
  fxRates,
}: StoreSettingsFormsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex w-full flex-col gap-6">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
      <Card className="flex h-full flex-col p-6">
        <form
          className="flex h-full flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            startTransition(async () => {
              setError(null);
              setMessage(null);
              const result = await upsertStoreSettingAction(locale, {
                key: "store.identity",
                value: {
                  name: String(data.get("name") ?? "").trim(),
                  supportEmail: String(data.get("supportEmail") ?? "").trim(),
                  phone: String(data.get("phone") ?? "").trim() || undefined,
                },
              });
              if (!result.ok) {
                setError(result.error.message);
                return;
              }
              setMessage(`Saved ${result.value.key}.`);
              router.refresh();
            });
          }}
        >
          <h2 className={ADMIN_SECTION_TITLE}>Store identity</h2>
          <label>
            <span className={ADMIN_LABEL}>Name</span>
            <input
              name="name"
              defaultValue={identity.name}
              className={ADMIN_INPUT}
              disabled={isPending}
            />
          </label>
          <label>
            <span className={ADMIN_LABEL}>Support email</span>
            <input
              name="supportEmail"
              type="email"
              defaultValue={identity.supportEmail}
              className={ADMIN_INPUT}
              disabled={isPending}
            />
          </label>
          <label>
            <span className={ADMIN_LABEL}>Phone</span>
            <input
              name="phone"
              defaultValue={identity.phone ?? ""}
              className={ADMIN_INPUT}
              disabled={isPending}
            />
          </label>
          <div className="mt-auto pt-2">
            <Button type="submit" size="sm" disabled={isPending}>
              Save identity
            </Button>
          </div>
        </form>
      </Card>

      <Card className="flex h-full flex-col p-6">
        <form
          className="flex h-full flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            startTransition(async () => {
              setError(null);
              setMessage(null);
              const result = await upsertStoreSettingAction(locale, {
                key: "store.fxRates",
                value: {
                  usd: String(data.get("usd") ?? "").trim(),
                  rub: String(data.get("rub") ?? "").trim(),
                },
              });
              if (!result.ok) {
                setError(result.error.message);
                return;
              }
              setMessage(`Saved ${result.value.key}.`);
              router.refresh();
            });
          }}
        >
          <h2 className={ADMIN_SECTION_TITLE}>Exchange rates</h2>
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            Catalog prices stay in AMD. Enter how many USD / RUB equal{" "}
            <strong>1 AMD</strong> (dot or comma decimals, e.g. 0.2137 or
            0,2137). Storefront display currency uses these rates.
          </p>
          <label>
            <span className={ADMIN_LABEL}>USD per 1 AMD</span>
            <input
              name="usd"
              type="text"
              inputMode="decimal"
              defaultValue={fxRates.usd}
              placeholder="0.0026"
              className={ADMIN_INPUT}
              disabled={isPending}
              required
            />
          </label>
          <label>
            <span className={ADMIN_LABEL}>RUB per 1 AMD</span>
            <input
              name="rub"
              type="text"
              inputMode="decimal"
              defaultValue={fxRates.rub}
              placeholder="0.24"
              className={ADMIN_INPUT}
              disabled={isPending}
              required
            />
          </label>
          <div className="mt-auto pt-2">
            <Button type="submit" size="sm" disabled={isPending}>
              Save exchange rates
            </Button>
          </div>
        </form>
      </Card>
      </div>
    </div>
  );
}
