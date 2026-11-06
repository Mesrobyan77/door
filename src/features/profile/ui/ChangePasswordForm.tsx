"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  changePasswordAction,
  type ChangePasswordActionState,
} from "@/features/auth/change-password-action";

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-gray-200 px-3 text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200";

type ChangePasswordFormProps = {
  locale: string;
  labels: {
    title: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    currentPasswordPlaceholder: string;
    newPasswordPlaceholder: string;
    confirmPasswordPlaceholder: string;
    change: string;
    changing: string;
  };
};

const emptyForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const initialState: ChangePasswordActionState = {};

export function ChangePasswordForm({ locale, labels }: ChangePasswordFormProps) {
  const action = changePasswordAction.bind(null, locale);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [values, setValues] = useState(emptyForm);
  const [prevSuccess, setPrevSuccess] = useState(state.success);

  if (state.success !== prevSuccess) {
    setPrevSuccess(state.success);
    if (state.success) {
      setValues(emptyForm);
    }
  }

  return (
    <Card className="rounded-2xl border border-gray-200/80 p-5 shadow-none sm:p-7 lg:p-8">
      <div className="mb-8 border-b border-gray-100 pb-5 sm:mb-10 sm:pb-6">
        <h1 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
          {labels.title}
        </h1>
      </div>

      <form
        action={formAction}
        className="mx-auto max-w-xl space-y-6 lg:mx-0 lg:max-w-2xl"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          {labels.currentPassword}
          <input
            name="currentPassword"
            type="password"
            required
            value={values.currentPassword}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                currentPassword: event.target.value,
              }))
            }
            placeholder={labels.currentPasswordPlaceholder}
            className={FIELD_CLASS}
            autoComplete="current-password"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          {labels.newPassword}
          <input
            name="newPassword"
            type="password"
            required
            value={values.newPassword}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                newPassword: event.target.value,
              }))
            }
            placeholder={labels.newPasswordPlaceholder}
            className={FIELD_CLASS}
            autoComplete="new-password"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          {labels.confirmPassword}
          <input
            name="confirmPassword"
            type="password"
            required
            value={values.confirmPassword}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                confirmPassword: event.target.value,
              }))
            }
            placeholder={labels.confirmPasswordPlaceholder}
            className={FIELD_CLASS}
            autoComplete="new-password"
          />
        </label>

        {state.error ? (
          <p className="text-sm text-red-700" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-green-700" role="status">
            {state.success}
          </p>
        ) : null}

        <div className="pt-2 sm:pt-4">
          <Button
            type="submit"
            variant="primary"
            className="h-11 w-full sm:w-auto"
            disabled={isPending}
          >
            {isPending ? labels.changing : labels.change}
          </Button>
        </div>
      </form>
    </Card>
  );
}
