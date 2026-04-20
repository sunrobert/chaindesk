'use client';

import { useQuery } from '@tanstack/react-query';

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: number; // unix seconds
  tags: string[];
};

// rss2json is a free public proxy that converts any public RSS feed into JSON
// with CORS headers enabled. No API key needed for public feeds. We pull from
// a couple of crypto-native outlets in parallel so the ticker has variety.
type Feed = { name: string; url: string };

const FEEDS: Feed[] = [
  { name: 'COINTELEGRAPH', url: 'https://cointelegraph.com/rss' },
  { name: 'COINDESK', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { name: 'DECRYPT', url: 'https://decrypt.co/feed' },
];

type RawItem = {
  title: string;
  pubDate: string; // "2026-04-20 06:49:48"
  link: string;
  guid?: string;
  categories?: string[];
};

async function fetchFeed(feed: Feed): Promise<NewsItem[]> {
  const rss2json = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
  const res = await fetch(rss2json, { cache: 'no-store' });
  if (!res.ok) throw new Error(`rss ${res.status}`);
  const json = (await res.json()) as { items?: RawItem[]; status?: string };
  if (json.status !== 'ok' || !json.items) return [];
  return json.items.slice(0, 15).map((it) => ({
    id: it.guid || it.link,
    title: it.title,
    source: feed.name,
    url: it.link,
    publishedAt: Math.floor(new Date(it.pubDate + ' UTC').getTime() / 1000),
    tags: (it.categories ?? []).slice(0, 2),
  }));
}

async function fetchNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const all: NewsItem[] = [];
  for (const r of results) if (r.status === 'fulfilled') all.push(...r.value);
  // Dedupe on URL, sort newest first, cap at 40.
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const it of all.sort((a, b) => b.publishedAt - a.publishedAt)) {
    if (seen.has(it.url)) continue;
    seen.add(it.url);
    out.push(it);
    if (out.length >= 40) break;
  }
  return out;
}

export function useNews() {
  return useQuery({
    queryKey: ['rss', 'crypto-news', 'v2'],
    queryFn: fetchNews,
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });
}
