"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  deleteAccountAction,
  type DeleteAccountActionState,
} from "@/features/auth/delete-account-action";

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-gray-200 px-3 text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200";

type DeleteAccountFormProps = {
  locale: string;
  labels: {
    title: string;
    description: string;
    pointOrders: string;
    pointLogin: string;
    pointData: string;
    currentPassword: string;
    currentPasswordPlaceholder: string;
    acknowledge: string;
    submit: string;
    deleting: string;
  };
};

const initialState: DeleteAccountActionState = {};

export function DeleteAccountForm({ locale, labels }: DeleteAccountFormProps) {
  const action = deleteAccountAction.bind(null, locale);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [password, setPassword] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <Card className="rounded-2xl border border-red-200 bg-red-50/30 p-5 shadow-none sm:p-7 lg:p-8">
      <div className="mb-6 space-y-2 sm:mb-8">
        <h1 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
          {labels.title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-gray-700">
          {labels.description}
        </p>
      </div>

      <ul className="mb-8 max-w-2xl list-disc space-y-2 pl-5 text-sm text-gray-600 sm:mb-10">
        <li>{labels.pointOrders}</li>
        <li>{labels.pointLogin}</li>
        <li>{labels.pointData}</li>
      </ul>

      <form
        action={formAction}
        className="mx-auto max-w-xl space-y-6 lg:mx-0 lg:max-w-2xl"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          {labels.currentPassword}
          <input
            name="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={labels.currentPasswordPlaceholder}
            className={FIELD_CLASS}
            autoComplete="current-password"
          />
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            name="acknowledged"
            type="checkbox"
            value="on"
            className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <span className="text-sm leading-snug text-gray-800">
            {labels.acknowledge}
          </span>
        </label>

        {state.error ? (
          <p className="text-sm text-red-700" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="pt-1 sm:pt-2">
          <Button
            type="submit"
            variant="primary"
            className="h-11 w-full !bg-red-700 hover:!bg-red-800 focus:!ring-red-600 sm:w-auto"
            disabled={isPending || !acknowledged}
          >
            {isPending ? labels.deleting : labels.submit}
          </Button>
        </div>
      </form>
    </Card>
  );
}
