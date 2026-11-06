"use client";

import { Star } from "lucide-react";
import { useState } from "react";

type StarRatingInputProps = {
  value: number;
  onChange: (rating: number) => void;
  label: string;
  disabled?: boolean;
};

export function StarRatingInput({
  value,
  onChange,
  label,
  disabled = false,
}: StarRatingInputProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? value;

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="text-sm font-medium text-gray-900">{label}</legend>
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHovered(null)}
        role="radiogroup"
        aria-label={label}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= active;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star}`}
              disabled={disabled}
              onMouseEnter={() => setHovered(star)}
              onFocus={() => setHovered(star)}
              onBlur={() => setHovered(null)}
              onClick={() => onChange(star)}
              className="rounded p-0.5 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:opacity-50"
            >
              <Star
                className={`h-8 w-8 ${
                  isFilled
                    ? "fill-amber-400 text-amber-400"
                    : "fill-gray-200 text-gray-200"
                }`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
