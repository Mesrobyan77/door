"use client";

import type { MouseEvent } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleWishlistAction } from "@/features/wishlist/actions";
import type { Locale } from "@/lib/i18n/config";

type WishlistButtonProps = {
  locale: Locale;
  productId: string;
  initialInWishlist: boolean;
  isSignedIn: boolean;
  label: string;
  className?: string;
  size?: "sm" | "md";
};

export function WishlistButton({
  locale,
  productId,
  initialInWishlist,
  isSignedIn,
  label,
  className = "",
  size = "md",
}: WishlistButtonProps) {
  const router = useRouter();
  const [inWishlist, setInWishlist] = useState(initialInWishlist);
  const [pending, startTransition] = useTransition();
  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    event.stopPropagation();

    if (!isSignedIn) {
      const next = encodeURIComponent(
        typeof window !== "undefined" ? window.location.pathname : `/${locale}`,
      );
      router.push(`/${locale}/login?next=${next}`);
      return;
    }

    startTransition(async () => {
      const previous = inWishlist;
      setInWishlist(!previous);
      const result = await toggleWishlistAction(productId);
      if (!result.ok) {
        setInWishlist(previous);
        if (result.error.code === "UNAUTHENTICATED") {
          router.push(`/${locale}/login`);
        }
        return;
      }
      setInWishlist(result.value.inWishlist);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={label}
      aria-pressed={inWishlist}
      className={`inline-flex items-center justify-center rounded-full transition disabled:opacity-60 ${className}`}
    >
      <Heart
        className={`${iconClass} ${
          inWishlist
            ? "fill-red-500 text-red-500"
            : "fill-transparent text-gray-700"
        }`}
        aria-hidden
      />
    </button>
  );
}
