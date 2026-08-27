import * as R from "remeda";

export function parseChipValue(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function formatChipCount(value: number): string {
  return value.toLocaleString("pt-BR");
}

export function chipBalanceMessage(
  enteredTotal: number,
  expectedTotal: number,
): { text: string; tone: "ok" | "error" } | null {
  const delta = enteredTotal - expectedTotal;
  if (delta === 0) {
    return { text: "Soma correta", tone: "ok" };
  }
  const amount = formatChipCount(Math.abs(delta));
  return delta < 0
    ? { text: `${amount} fichas faltando`, tone: "error" }
    : { text: `${amount} fichas a mais`, tone: "error" };
}

export function sumChipValues(values: Record<string, unknown>): number {
  return R.sumBy(Object.values(values), parseChipValue);
}
