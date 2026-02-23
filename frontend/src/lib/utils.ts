import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as R from "remeda";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** Formats a profit/loss number as signed currency (e.g. "+$12.50" or "-$8.00"). */
export function formatPnl(value: number): string {
  return R.pipe(
    value >= 0 ? "+" : "-",
    (sign) => `${sign}${formatCurrency(Math.abs(value))}`,
  );
}

/**
 * Formats a date string as "EEEE, d MMMM, yyyy".
 * Uses UTC date parts so values like "2026-02-13T00:00:00.000Z" display as the 13th
 * (calendar date) instead of shifting to the previous day in timezones behind UTC.
 */
export function formatDate(date: string): string {
  const d = new Date(date);
  const utcDay = new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
  );
  return format(utcDay, "EEEE, d MMMM, yyyy", {
    locale: ptBR,
  });
}
