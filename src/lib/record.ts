// the record page's join logic
//
// inputs:
//   - the theses collection (frontmatter only; bodies are never read here)
//   - src/data/prices.json, which is checked in and updated by hand:
//       asOf              the date every quote was taken; displayed on the
//                         page so nothing reads as live
//       benchmark         { "SPY": <price at asOf> } — the key names the
//                         benchmark, so switching to e.g. VTI is a data
//                         change, not a code change
//       benchmarkHistory  { "YYYY-MM-DD": <benchmark close> } — one entry
//                         per date we need to measure FROM: every thesis's
//                         publication date, plus every closedDate
//       quotes            { "TICKER": <price at asOf> } for open theses
//
// The rule for windows: an open thesis is measured from its publication
// date to asOf (quote from `quotes`, benchmark end = `benchmark`). A closed
// thesis is measured from publication to closedDate (price = closedPrice,
// benchmark end looked up in benchmarkHistory)
//
// Missing data is never an error: any lookup that fails produces null,
// which the page renders as a dash and the stats skip

import type { CollectionEntry } from 'astro:content';
import prices from '../data/prices.json';
import { isoDate } from './format';

type Thesis = CollectionEntry<'theses'>;

// JSON imports get narrow inferred types (only the keys currently in the
// file), so widen the maps to "any string key" for lookups.
const quotes: Record<string, number> = prices.quotes;
const history: Record<string, number> = prices.benchmarkHistory;

export const asOf: string = prices.asOf;
export const benchmarkName: string = Object.keys(prices.benchmark)[0];
const benchmarkAtAsOf: number = (prices.benchmark as Record<string, number>)[benchmarkName];

export interface RecordRow {
  slug: string;
  ticker: string;
  company: string;
  published: string; // YYYY-MM-DD
  stance: 'long' | 'short' | 'pass';
  status: 'open' | 'closed' | 'broken';
  priceAtPublication: number;
  /** closedPrice for closed theses, the asOf quote otherwise; null if the
   *  ticker is missing from prices.json */
  endPrice: number | null;
  /** the security's simple price return over the window, as a fraction
   *  (0.237 = +23.7%); null when endPrice is unknown */
  securityReturn: number | null;
  /** the benchmark's return over the same window; null when either end of
   *  the window is missing from benchmarkHistory */
  benchmarkReturn: number | null;
}

export function buildRows(entries: Thesis[]): RecordRow[] {
  return entries
    .slice()
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .map((entry) => {
      const t = entry.data;
      const closed = t.status === 'closed';

      // End of the measurement window, for the security and the benchmark.
      // (The schema guarantees closed theses carry closedPrice/closedDate.)
      const endPrice = closed ? (t.closedPrice ?? null) : (quotes[t.ticker] ?? null);
      const benchmarkEnd = closed
        ? (history[isoDate(t.closedDate!)] ?? null)
        : benchmarkAtAsOf;

      // Start of the window: the benchmark's close on publication day.
      const benchmarkStart = history[isoDate(t.date)] ?? null;

      return {
        slug: entry.id,
        ticker: t.ticker,
        company: t.company,
        published: isoDate(t.date),
        stance: t.stance,
        status: t.status,
        priceAtPublication: t.priceAtPublication,
        endPrice,
        securityReturn: endPrice !== null ? endPrice / t.priceAtPublication - 1 : null,
        benchmarkReturn:
          benchmarkStart !== null && benchmarkEnd !== null
            ? benchmarkEnd / benchmarkStart - 1
            : null,
      };
    });
}

export interface RecordStats {
  total: number;
  open: number;
  closed: number;
  broken: number;
  /** long/short rows where both returns were computable — the denominator
   *  of the hit rate; passes are recorded but never scored */
  scored: number;
  hits: number;
  /** mean stance-adjusted excess return vs the benchmark, in percentage
   *  points; null when nothing is scorable */
  avgExcessPp: number | null;
}

// Scoring rules, stated once:
//   - a long is a hit when the security beat the benchmark over the window
//   - a short is a hit when the security trailed the benchmark
//   - a pass is never scored — there was no position
//   - excess return is stance-adjusted the same way: (security - benchmark)
//     for longs, (benchmark - security) for shorts
// `broken` theses still score (usually as misses); breaking a thesis
// doesn't take it out of the record.
export function summarize(rows: RecordRow[]): RecordStats {
  const byStatus = (s: RecordRow['status']) => rows.filter((r) => r.status === s).length;

  const scorable = rows.filter(
    (r) => r.stance !== 'pass' && r.securityReturn !== null && r.benchmarkReturn !== null
  );

  const hits = scorable.filter((r) =>
    r.stance === 'long'
      ? r.securityReturn! > r.benchmarkReturn!
      : r.securityReturn! < r.benchmarkReturn!
  ).length;

  const excesses = scorable.map((r) =>
    r.stance === 'long'
      ? r.securityReturn! - r.benchmarkReturn!
      : r.benchmarkReturn! - r.securityReturn!
  );

  return {
    total: rows.length,
    open: byStatus('open'),
    closed: byStatus('closed'),
    broken: byStatus('broken'),
    scored: scorable.length,
    hits,
    avgExcessPp:
      excesses.length > 0
        ? (excesses.reduce((a, b) => a + b, 0) / excesses.length) * 100
        : null,
  };
}
