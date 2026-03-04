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

export type SettlementTransaction = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
};

/**
 * Returns the minimum number of who-pays-who transactions to settle a game.
 * Uses greedy: repeatedly largest debtor pays largest creditor.
 */
export function getSettlementTransactions(
  players: {
    id: string;
    name: string;
    initialChips: number;
    cashOut: number | null;
  }[],
  buyIn: number,
  chipsPerPlayer: number,
): SettlementTransaction[] {
  if (chipsPerPlayer <= 0) return [];
  const pricePerChip = buyIn / chipsPerPlayer;
  const withNet = R.pipe(
    players,
    R.filter((p) => p.cashOut != null),
    R.map((p) => ({
      id: p.id,
      name: p.name,
      net: ((p.cashOut ?? 0) - p.initialChips) * pricePerChip,
    })),
  );
  const debtors = R.pipe(
    withNet,
    R.filter((p) => p.net < 0),
    R.map((p) => ({ id: p.id, name: p.name, net: -p.net })),
  );
  const creditors = R.pipe(
    withNet,
    R.filter((p) => p.net > 0),
    R.map((p) => ({ id: p.id, name: p.name, net: p.net })),
  );
  const transactions: SettlementTransaction[] = [];
  const dList = debtors.map((d) => ({ ...d }));
  const cList = creditors.map((c) => ({ ...c }));
  while (dList.some((d) => d.net > 0) && cList.some((c) => c.net > 0)) {
    dList.sort((a, b) => b.net - a.net);
    cList.sort((a, b) => b.net - a.net);
    const d = dList[0];
    const c = cList[0];
    const amount = Math.min(d.net, c.net);
    if (amount <= 0) break;
    transactions.push({
      fromId: d.id,
      fromName: d.name,
      toId: c.id,
      toName: c.name,
      amount,
    });
    d.net -= amount;
    c.net -= amount;
  }
  return transactions;
}
