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

/** Formats a date as a string in the format "EEEE, d MMMM, yyyy". */
export function formatDate(date: string): string {
  return format(new Date(date), "EEEE, d MMMM, yyyy", {
    locale: ptBR,
  });
}
