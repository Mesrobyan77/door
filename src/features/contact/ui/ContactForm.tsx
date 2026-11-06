"use client";

import { useState, useTransition } from "react";

import { submitContactMessageAction } from "@/features/contact/application/submit-contact";

type ContactFormCopy = {
  name: string;
  email: string;
  phone: string;
  message: string;
  submit: string;
  success: string;
  error: string;
};

type ContactFormProps = {
  copy: ContactFormCopy;
};

const fieldClassName =
  "h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-gray-900 disabled:opacity-60";

export function ContactForm({ copy }: ContactFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (success) {
    return (
      <p
        role="status"
        className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
      >
        {copy.success}
      </p>
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          setError(null);
          const result = await submitContactMessageAction({
            name: String(formData.get("name") ?? ""),
            email: String(formData.get("email") ?? ""),
            phone: String(formData.get("phone") ?? "") || undefined,
            message: String(formData.get("message") ?? ""),
          });

          if (!result.ok) {
            setError(result.error.message || copy.error);
            return;
          }

          setSuccess(true);
        });
      }}
    >
      <label className="block text-sm font-medium text-gray-900">
        <span className="mb-2 block">{copy.name}</span>
        <input
          name="name"
          required
          maxLength={120}
          className={fieldClassName}
          disabled={isPending}
        />
      </label>

      <label className="block text-sm font-medium text-gray-900">
        <span className="mb-2 block">{copy.email}</span>
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          className={fieldClassName}
          disabled={isPending}
        />
      </label>

      <label className="block text-sm font-medium text-gray-900">
        <span className="mb-2 block">{copy.phone}</span>
        <input
          name="phone"
          maxLength={40}
          className={fieldClassName}
          disabled={isPending}
        />
      </label>

      <label className="block text-sm font-medium text-gray-900">
        <span className="mb-2 block">{copy.message}</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-gray-900 disabled:opacity-60"
          disabled={isPending}
        />
      </label>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="w-full rounded-md bg-gray-900 py-3 text-sm font-semibold tracking-wide text-white uppercase transition hover:bg-gray-800 disabled:opacity-50"
        disabled={isPending}
      >
        {isPending ? "…" : copy.submit}
      </button>
    </form>
  );
}
