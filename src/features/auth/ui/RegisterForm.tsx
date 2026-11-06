"use client";

import { useActionState } from "react";

import { AppLink } from "@/components/ui/AppLink";
import { type AuthActionState } from "@/features/auth/login-action";
import { registerAction } from "@/features/auth/register-action";
import { PasswordField } from "@/features/auth/ui/PasswordField";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

const initialState: AuthActionState = {};

type RegisterFormProps = {
  locale: Locale;
  dictionary: Dictionary["auth"];
};

const fieldClassName =
  "h-10 w-full rounded-lg border border-gray-200 px-3 text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200";

export function RegisterForm({ locale, dictionary }: RegisterFormProps) {
  const action = registerAction.bind(null, locale);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          {dictionary.firstName}
          <input
            required
            name="firstName"
            autoComplete="given-name"
            className={fieldClassName}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          {dictionary.lastName}
          <input
            required
            name="lastName"
            autoComplete="family-name"
            className={fieldClassName}
          />
        </label>
      </div>

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

      <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        {dictionary.phone}
        <input
          required
          name="phone"
          type="tel"
          autoComplete="tel"
          className={fieldClassName}
        />
      </label>

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
          ? dictionary.submittingRegister
          : dictionary.submitRegister}
      </button>

      <p className="text-center text-sm text-gray-600">
        {dictionary.hasAccount}{" "}
        <AppLink
          href={`/${locale}/login`}
          prefetchPolicy="intent"
          className="font-medium text-gray-900 underline-offset-2 hover:underline"
        >
          {dictionary.signInLink}
        </AppLink>
      </p>
    </form>
  );
}
