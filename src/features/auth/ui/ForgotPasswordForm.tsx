"use client";

import { useActionState } from "react";

import { AppLink } from "@/components/ui/AppLink";
import {
  forgotPasswordAction,
  type ForgotPasswordActionState,
} from "@/features/auth/forgot-password-action";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

const initialState: ForgotPasswordActionState = {};

type ForgotPasswordFormProps = {
  locale: Locale;
  dictionary: Dictionary["auth"];
};

const fieldClassName =
  "h-10 w-full rounded-lg border border-gray-200 px-3 text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200";

export function ForgotPasswordForm({
  locale,
  dictionary,
}: ForgotPasswordFormProps) {
  const action = forgotPasswordAction.bind(null, locale);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        {dictionary.email}
        <input
          required
          name="email"
          type="email"
          autoComplete="email"
          className={fieldClassName}
        />
      </label>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
        >
          {state.error}
        </p>
      ) : null}

      {state.sent ? (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {dictionary.forgotPasswordSuccess}
        </p>
      ) : null}

      <button
        disabled={isPending}
        className="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
      >
        {isPending
          ? dictionary.submittingForgotPassword
          : dictionary.submitForgotPassword}
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
