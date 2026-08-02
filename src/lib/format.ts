/**formatting stuff */

export const DASH = '—';

/** Date -> "YYYY-MM-DD" (the site's only date format) */
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** "long" -> "Long" */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** 98.4 -> "$98.40", null -> "—" */
export function fmtUsd(x: number | null): string {
  if (x === null) return DASH;
  return `$${x.toFixed(2)}`;
}

/** 0.237 -> "+23.7%", -0.05 -> "-5.0%", null -> "—" */
export function fmtPct(x: number | null): string {
  if (x === null) return DASH;
  const pct = x * 100;
  return `${pct >= 0 ? '+' : '-'}${Math.abs(pct).toFixed(1)}%`;
}

/** percentage points, e.g. 30.6 -> "+30.6pp" */
export function fmtPp(x: number | null): string {
  if (x === null) return DASH;
  return `${x >= 0 ? '+' : '-'}${Math.abs(x).toFixed(1)}pp`;
}
