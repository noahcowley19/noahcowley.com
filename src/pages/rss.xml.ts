
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { cap } from '../lib/format';

export async function GET(context: APIContext) {
  const theses = (await getCollection('theses')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: 'Noah Cowley',
    description: 'Independent equity research with a public track record.',
    // context.site is the `site` value from astro.config.mjs
    site: context.site!,
    items: theses.map((entry) => ({
      title: `${entry.data.ticker} — ${entry.data.company} (${cap(entry.data.stance)})`,
      description: entry.data.thesis,
      pubDate: entry.data.date,
      link: `/theses/${entry.id}/`,
    })),
  });
}
