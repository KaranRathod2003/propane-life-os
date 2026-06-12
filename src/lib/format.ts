// Indian Rupee + Indian-digit-grouping formatting helpers.

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrFormatterPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN");

/**
 * Indian Rupee with smart paise: shows 2 decimals only when there ARE paise,
 * otherwise no decimal point. e.g. 26129 -> "₹26,129", 26129.5 -> "₹26,129.50".
 */
export function formatINR(value: number): string {
  const hasPaise = Math.round(value * 100) % 100 !== 0;
  return (hasPaise ? inrFormatterPaise : inrFormatter).format(value);
}

/** e.g. 26129.5 -> "₹26,129.50" (used where paise matter) */
export function formatINRPaise(value: number): string {
  return inrFormatterPaise.format(value);
}

/** e.g. 26129 -> "26,129" (no symbol) */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Compact rupee for tight tiles, e.g. 65000 -> "₹65k", 1250000 -> "₹12.5L" */
export function formatINRCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(abs >= 10_00_000 ? 1 : 2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
