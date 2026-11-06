"use server";

import { cookies } from "next/headers";

import {
  CURRENCY_COOKIE_NAME,
  parseCurrencyCookie,
} from "@/lib/money/currency-cookie";
import { isCurrency, type Currency } from "@/lib/money/currency";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setCurrencyAction(currency: string): Promise<Currency> {
  if (!isCurrency(currency)) {
    throw new Error("Unsupported currency");
  }

  const store = await cookies();
  store.set(CURRENCY_COOKIE_NAME, currency, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  return parseCurrencyCookie(currency);
}
