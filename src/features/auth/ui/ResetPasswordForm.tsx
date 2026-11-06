"use client";

import { useActionState } from "react";

import { AppLink } from "@/components/ui/AppLink";
import {
  resetPasswordAction,
  type ResetPasswordActionState,
} from "@/features/auth/reset-password-action";
import { PasswordField } from "@/features/auth/ui/PasswordField";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

const initialState: ResetPasswordActionState = {};

type ResetPasswordFormProps = {
  locale: Locale;
  token: string;
  dictionary: Dictionary["auth"];
};

export function ResetPasswordForm({
  locale,
  token,
  dictionary,
}: ResetPasswordFormProps) {
  const action = resetPasswordAction.bind(null, locale);
  const [state, formAction, isPending] = useActionState(action, initialState);

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
        >
          {dictionary.resetInvalidToken}
        </p>
        <p className="text-center text-sm text-gray-600">
          <AppLink
            href={`/${locale}/forgot-password`}
            prefetchPolicy="intent"
            className="font-medium text-gray-900 underline-offset-2 hover:underline"
          >
            {dictionary.forgotPassword}
          </AppLink>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <PasswordField
        name="password"
        label={dictionary.password}
        showPasswordLabel={dictionary.showPassword}
        hidePasswordLabel={dictionary.hidePassword}
        autoComplete="new-password"
      />

      <PasswordField
        name="confirmPassword"
        label={dictionary.confirmPassword}
        showPasswordLabel={dictionary.showPassword}
        hidePasswordLabel={dictionary.hidePassword}
        autoComplete="new-password"
      />

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
        >
          {state.error}
        </p>
      ) : null}

      <button
        disabled={isPending}
        className="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
      >
        {isPending
          ? dictionary.submittingResetPassword
          : dictionary.submitResetPassword}
      </button>

      <p className="text-center text-sm text-gray-600">
        <AppLink
          href={`/${locale}/login`}
          prefetchPolicy="intent"
          className="font-medium text-gray-900 underline-offset-2 hover:underline"
        >
          {dictionary.backToLogin}
        </AppLink>
      </p>
    </form>
  );
}
