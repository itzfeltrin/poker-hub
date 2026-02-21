import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as R from "remeda";

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
