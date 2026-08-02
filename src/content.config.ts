import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// The one content collection on the site. Every .md file in
// src/content/theses/ is loaded as an entry. The file name (minus .md)
// becomes the entry's id, used as the URL slug. So
// 2026-02-10-CROX.md -> /theses/2026-02-10-CROX essentially
//
// The Zod schema below is the frontmatter contract. Astro validates every
// file against it at build time and FAILS THE BUILD on any violation,
// pointing at the offending file and field. Two details:
//
//   - .strict() rejects unknown keys. Without it, Zod silently drops
//     fields it doesn't recognize so a typo like `convition:` would
//     build fine and just lose the data. With .strict(), the typo is a
//     build error
//   - z.coerce.date() accepts the bare YYYY-MM-DD dates YAML produces
//     and turns them into real Date objects, so templates can format
//     them without re-parsing strings
const theses = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/theses' }),
  schema: z
    .object({
      ticker: z.string().min(1),
      company: z.string().min(1),
      date: z.coerce.date(),
      stance: z.enum(['long', 'short', 'pass']),
      priceAtPublication: z.number().positive(),
      horizon: z.string().min(1),
      conviction: z.enum(['low', 'medium', 'high']),
      // One sentence. The cap keeps index rows and meta descriptions sane.
      thesis: z.string().min(1).max(180),
      status: z.enum(['open', 'closed', 'broken']),
      closedDate: z.coerce.date().optional(),
      closedPrice: z.number().positive().optional(),
    })
    .strict()
    // A closed position without a closing price (or vice versa) would make
    // the record page lie, so refuse to build it
    .refine(
      (t) => t.status !== 'closed' || (t.closedDate !== undefined && t.closedPrice !== undefined),
      { message: 'status: closed requires both closedDate and closedPrice' }
    ),
});

export const collections = { theses };
