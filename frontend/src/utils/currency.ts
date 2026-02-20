/**
 * Formats an integer for display (e.g. chip counts). Uses pt-BR thousands separator (1.500).
 */
export function formatNumber(
  value: number,
  options?: { locale?: string }
): string {
  const locale = options?.locale ?? 'pt-BR'
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value)
}

/**
 * Formats a number as currency (BRL by default).
 */
export function formatCurrency(
  value: number,
  options?: { locale?: string; currency?: string }
): string {
  const { locale = 'pt-BR', currency = 'BRL' } = options ?? {}
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value)
}

/**
 * Parses a pt-BR currency string to number (e.g. "1.234,56" or "1234,56" -> 1234.56).
 * Handles both comma and dot as decimal separator.
 */
export function parseCurrencyInput(input: string): number {
  if (!input || /^\s*$/.test(input)) return 0
  const normalized = input
    .trim()
    .replace(/\s/g, '')
    .replace(/[R$\s]/g, '')
  const lastComma = normalized.lastIndexOf(',')
  const lastDot = normalized.lastIndexOf('.')
  const lastSep = Math.max(lastComma, lastDot)
  if (lastSep === -1) {
    return Number(normalized.replace(/\D/g, '')) || 0
  }
  const decimalSep = lastComma > lastDot ? ',' : '.'
  const [intPart, decPart] = normalized.split(decimalSep)
  const int = (intPart ?? '').replace(/\D/g, '')
  const dec = (decPart ?? '').replace(/\D/g, '').slice(0, 2)
  return parseFloat(`${int}.${dec}`) || 0
}
