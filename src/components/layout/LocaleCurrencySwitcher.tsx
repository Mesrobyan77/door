'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { DROPDOWN_ANIMATION_MS } from '@/components/ui/SelectDropdown';
import { setCurrencyAction } from '@/features/preferences/set-currency-action';
import type { Locale } from '@/lib/i18n/config';
import { localeLabels, locales } from '@/lib/i18n/config';
import type { Currency } from '@/lib/money/currency';
import { currencies } from '@/lib/money/currency';
import { useLatestRef } from '@/lib/react/use-latest-ref';

const HOVER_CLOSE_DELAY_MS = 140;

/** Short codes for the navbar trigger (MaMarie-style `AMD / HY`). */
const localeShortLabels: Record<Locale, string> = {
  hy: 'HY',
  en: 'EN',
  ru: 'RU',
};

type LocaleCurrencySwitcherProps = {
  locale: Locale;
  currency: Currency;
  currencyLabel: string;
  languageLabel: string;
};

function replaceLocaleInPath(pathname: string, nextLocale: Locale): string {
  const segments = pathname.split('/');
  if (segments.length > 1) {
    segments[1] = nextLocale;
    return segments.join('/') || `/${nextLocale}`;
  }
  return `/${nextLocale}`;
}

function optionClassName(selected: boolean): string {
  return selected
    ? 'flex min-h-10 w-full items-center justify-between gap-3 whitespace-nowrap rounded-lg bg-[#eee5da] px-3 py-2 text-left text-sm font-semibold text-[#29231f] transition-colors'
    : 'flex min-h-10 w-full items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-[#6e6257] transition-colors hover:bg-[#f7f2ec] hover:text-[#29231f]';
}

/**
 * Combined currency + language control matching MaMarie navbar:
 * pill trigger `AMD / HY`, two-column dropdown.
 */
export function LocaleCurrencySwitcher({
  locale,
  currency,
  currencyLabel,
  languageLabel,
}: LocaleCurrencySwitcherProps) {
  const router = useRouter();
  const pathname = usePathname() ?? `/${locale}`;
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [entered, setEntered] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();

  function clearCloseTimer(): void {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openMenu(): void {
    clearCloseTimer();
    setOpen(true);
  }

  function closeMenu(): void {
    clearCloseTimer();
    setOpen(false);
  }

  const closeMenuRef = useLatestRef(closeMenu);

  function scheduleClose(): void {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, HOVER_CLOSE_DELAY_MS);
  }

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setRendered(true);
      setEntered(false);
    } else {
      setEntered(false);
    }
  }

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  useEffect(() => {
    if (open) {
      let frame2 = 0;
      const frame1 = requestAnimationFrame(() => {
        frame2 = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(frame1);
        cancelAnimationFrame(frame2);
      };
    }

    const timer = setTimeout(() => setRendered(false), DROPDOWN_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenuRef.current();
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') closeMenuRef.current();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeMenuRef]);

  function selectCurrency(next: Currency): void {
    if (next === currency) {
      closeMenu();
      return;
    }
    startTransition(async () => {
      await setCurrencyAction(next);
      closeMenu();
      router.refresh();
    });
  }

  function selectLocale(next: Locale): void {
    if (next === locale) {
      closeMenu();
      return;
    }
    closeMenu();
    router.push(replaceLocaleInPath(pathname, next));
  }

  return (
    <div
      ref={rootRef}
      className={open || rendered ? 'relative z-[300]' : 'relative z-0'}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="group flex h-10 min-w-[132px] shrink-0 items-center justify-center gap-2 rounded-full border border-[#ded4c8] bg-white py-0 pr-2 pl-3.5 text-[#413831] shadow-[0_4px_14px_rgb(41_35_31/5%)] transition-[border-color,background-color,box-shadow] hover:border-[#bca98f] hover:bg-[#fdfbf9] focus-visible:ring-2 focus-visible:ring-[#c69a5b]/25"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={menuId}
        aria-label={`${currency} / ${localeShortLabels[locale]}`}
        onClick={() => (open ? closeMenu() : openMenu())}
      >
        <span className="flex min-w-0 items-center justify-center whitespace-nowrap text-[14px] font-bold leading-none tabular-nums">
          <span>{currency}</span>
          <span className="inline-block w-[2px]" aria-hidden />
          <span>/</span>
          <span className="inline-block w-[2px]" aria-hidden />
          <span>{localeShortLabels[locale]}</span>
        </span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f1ebe4] text-[#6e6257] transition-colors group-hover:bg-[#e9dfd4]">
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </span>
      </button>

      {rendered ? (
        <div
          id={menuId}
          role="dialog"
          aria-label={`${currencyLabel} / ${languageLabel}`}
          className={`absolute right-0 top-full z-[310] origin-top pt-2 transition-[opacity,transform] ease-out ${
            entered
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-2 opacity-0'
          }`}
          style={{ transitionDuration: `${DROPDOWN_ANIMATION_MS}ms` }}
        >
          <div className="grid min-w-[292px] grid-cols-2 overflow-hidden rounded-xl border border-[#ded4c8] bg-white p-2 shadow-[0_20px_55px_rgb(41_35_31/20%)]">
            <div className="min-w-0 border-r border-[#e8dfd5] pr-2">
              <p className="whitespace-nowrap px-3 pt-1 pb-2 text-left text-[10px] font-bold tracking-[0.16em] text-[#9b7139] uppercase">
                {currencyLabel}
              </p>
              <ul role="listbox" aria-label={currencyLabel} className="space-y-0.5">
                {currencies.map((code) => {
                  const selected = code === currency;
                  return (
                    <li key={code} role="option" aria-selected={selected}>
                      <button
                        type="button"
                        disabled={pending}
                        className={optionClassName(selected)}
                        onClick={() => selectCurrency(code)}
                      >
                        <span>{code}</span>
                        {selected ? <Check className="h-3.5 w-3.5 text-[#9b7139]" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="min-w-0 pl-2">
              <p className="whitespace-nowrap px-3 pt-1 pb-2 text-left text-[10px] font-bold tracking-[0.16em] text-[#9b7139] uppercase">
                {languageLabel}
              </p>
              <ul role="listbox" aria-label={languageLabel} className="space-y-0.5">
                {locales.map((code) => {
                  const selected = code === locale;
                  return (
                    <li key={code} role="option" aria-selected={selected}>
                      <button
                        type="button"
                        className={optionClassName(selected)}
                        aria-label={`${localeShortLabels[code]}: ${localeLabels[code]}`}
                        onClick={() => selectLocale(code)}
                      >
                        <span className="truncate">{localeLabels[code]}</span>
                        {selected ? <Check className="h-3.5 w-3.5 text-[#9b7139]" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
