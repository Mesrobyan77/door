"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import {
  DROPDOWN_ANIMATION_MS,
  SelectDropdownOptionRow,
} from "@/components/ui/SelectDropdown";
import {
  orderStatusBadgeClass,
  paymentStatusBadgeClass,
} from "@/features/admin/ui/status-badge";
import { changeOrderStatusAction } from "@/features/orders/application/change-order-status";
import { changePaymentStatusAction } from "@/features/orders/application/change-payment-status";
import {
  ADMIN_ORDER_STATUS_OPTIONS,
  orderStatusLabel,
  type OrderStatus,
} from "@/features/orders/domain/order-status";
import {
  ADMIN_PAYMENT_STATUS_OPTIONS,
  paymentStatusLabel,
  type PaymentStatus,
} from "@/features/orders/domain/payment-status";
import { useHoldFlag } from "@/lib/react/use-hold-flag";
import { useSyncedState } from "@/lib/react/sync-state-from-prop";

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

type AdminInlineStatusSelectProps = {
  locale: string;
  orderNumber: string;
  kind: "order" | "payment";
  value: string;
  disabled?: boolean;
};

export function AdminInlineStatusSelect({
  locale,
  orderNumber,
  kind,
  value,
  disabled = false,
}: AdminInlineStatusSelectProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const mounted = useHoldFlag(open, DROPDOWN_ANIMATION_MS);
  const [error, setError] = useState<string | null>(null);
  const [displayValue, setDisplayValue] = useSyncedState(value);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingChangeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();

  useEffect(() => {
    return () => {
      if (pendingChangeRef.current) {
        clearTimeout(pendingChangeRef.current);
      }
    };
  }, []);

  const options =
    kind === "order"
      ? ADMIN_ORDER_STATUS_OPTIONS
      : ADMIN_PAYMENT_STATUS_OPTIONS;

  const currentLabel =
    kind === "order"
      ? orderStatusLabel(displayValue)
      : paymentStatusLabel(displayValue);

  const badgeClassName =
    kind === "order"
      ? orderStatusBadgeClass(displayValue)
      : paymentStatusBadgeClass(displayValue);

  function updateMenuPosition(): void {
    const trigger = rootRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 8,
      left: rect.left,
      minWidth: Math.max(rect.width, 176),
    });
  }

  useLayoutEffect(() => {
    if (!open && !mounted) {
      const frame = requestAnimationFrame(() => {
        setMenuPosition(null);
      });
      return () => cancelAnimationFrame(frame);
    }
    const frame = requestAnimationFrame(() => {
      updateMenuPosition();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent): void {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setOpen(false);
    }

    function handleReposition(): void {
      updateMenuPosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open]);

  function applyStatus(next: string): void {
    if (next === displayValue || isPending || disabled) {
      return;
    }

    const previous = displayValue;
    setDisplayValue(next);

    startTransition(async () => {
      setError(null);
      const result =
        kind === "order"
          ? await changeOrderStatusAction(locale, {
              orderNumber,
              toStatus: next as OrderStatus,
            })
          : await changePaymentStatusAction(locale, {
              orderNumber,
              toStatus: next as PaymentStatus,
            });

      if (!result.ok) {
        setDisplayValue(previous);
        setError(result.error.message);
        return;
      }

      router.refresh();
    });
  }

  function selectStatus(next: string): void {
    setOpen(false);
    if (pendingChangeRef.current) {
      clearTimeout(pendingChangeRef.current);
    }
    pendingChangeRef.current = setTimeout(() => {
      pendingChangeRef.current = null;
      applyStatus(next);
    }, DROPDOWN_ANIMATION_MS);
  }

  const menu =
    mounted && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            className={`fixed z-[200] transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              open
                ? "translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-1 opacity-0"
            }`}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              minWidth: menuPosition.minWidth,
              transitionDuration: `${DROPDOWN_ANIMATION_MS}ms`,
            }}
          >
            <div
              id={menuId}
              role="listbox"
              aria-label={`Change ${kind} status`}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white py-2"
            >
              {options.map((option) => {
                const selected =
                  option.value === displayValue ||
                  (kind === "order" &&
                    orderStatusLabel(displayValue) === option.label) ||
                  (kind === "payment" &&
                    paymentStatusLabel(displayValue) === option.label);
                return (
                  <SelectDropdownOptionRow
                    key={option.value}
                    label={option.label}
                    selected={selected}
                    onSelect={() => selectStatus(option.value)}
                  />
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        disabled={disabled || isPending}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium outline-none transition-opacity disabled:opacity-50 ${badgeClassName}`}
        aria-label={`Change ${kind} status`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((valueOpen) => !valueOpen)}
      >
        <span>{currentLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {menu}

      {error ? (
        <p className="mt-1 whitespace-nowrap text-[10px] text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
