'use client';

import { useActionState } from 'react';

import {
  resendVerificationAction,
  type ResendVerificationActionState,
} from '@/features/auth/resend-verification-action';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/get-dictionary';

const initialState: ResendVerificationActionState = {};

export function ResendVerificationForm({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary['auth'];
}) {
  const action = resendVerificationAction.bind(null, locale);
  const [state, formAction, pending] = useActionState(action, initialState);
  const message =
    state.error === 'RATE_LIMITED'
      ? dictionary.verificationRateLimited
      : state.error === 'SIGN_IN_REQUIRED'
        ? dictionary.verificationSignInRequired
        : state.error === 'UNAVAILABLE'
          ? dictionary.verificationUnavailable
          : state.error
            ? dictionary.verificationDeliveryFailed
            : null;

  return (
    <form action={formAction} className="mt-6 flex flex-col items-start gap-3">
      {state.sent ? (
        <p role="status" className="text-sm text-green-700">
          {dictionary.verificationResent}
        </p>
      ) : null}
      {state.alreadyVerified ? (
        <p role="status" className="text-sm text-green-700">
          {dictionary.verificationAlready}
        </p>
      ) : null}
      {message ? (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      ) : null}
      <button
        disabled={pending}
        className="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? dictionary.submittingVerificationResend : dictionary.resendVerification}
      </button>
    </form>
  );
}
