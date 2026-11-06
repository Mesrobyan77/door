"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { AppLink } from "@/components/ui/AppLink";
import { loginAction, type AuthActionState } from "@/features/auth/login-action";
import { PasswordField } from "@/features/auth/ui/PasswordField";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

const initialState: AuthActionState = {};

type LoginFormProps = {
  locale: Locale;
  dictionary: Dictionary["auth"];
};

const fieldClassName =
  "h-10 w-full rounded-lg border border-gray-200 px-3 text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200";

export function LoginForm({ locale, dictionary }: LoginFormProps) {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const resetSucceeded = searchParams.get("reset") === "1";
  const action = loginAction.bind(null, locale);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

      {resetSucceeded ? (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {dictionary.resetPasswordSuccess}
        </p>
      ) : null}

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
      <PasswordField
        name="password"
        label={dictionary.password}
        showPasswordLabel={dictionary.showPassword}
        hidePasswordLabel={dictionary.hidePassword}
        autoComplete="current-password"
      />
      <div className="flex justify-end">
        <AppLink
          href={`/${locale}/forgot-password`}
          prefetchPolicy="intent"
          className="text-sm font-medium text-gray-700 underline-offset-2 hover:text-gray-900 hover:underline"
        >
          {dictionary.forgotPassword}
        </AppLink>
      </div>
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
        {isPending ? "…" : dictionary.submitLogin}
      </button>
      <p className="text-center text-sm text-gray-600">
        <AppLink
          href={`/${locale}/register`}
          prefetchPolicy="intent"
          className="font-medium text-gray-900 underline-offset-2 hover:underline"
        >
          {dictionary.submitRegister}
        </AppLink>
      </p>
    </form>
  );
}
