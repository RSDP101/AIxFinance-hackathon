import Parser from 'rss-parser';
import { CatalystEvent } from '../data/events';
import { buildCatalystEvent } from './eventClassifier';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'CryptoSignal/1.0',
  },
});

interface FeedConfig {
  url: string;
  author: string;
  platform: string;
}

const FEEDS: FeedConfig[] = [
  {
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    author: 'CoinDesk',
    platform: 'CoinDesk',
  },
  {
    url: 'https://cointelegraph.com/rss',
    author: 'Cointelegraph',
    platform: 'CoinTelegraph',
  },
  {
    url: 'https://www.theblock.co/rss.xml',
    author: 'The Block',
    platform: 'The Block',
  },
];

const seenArticles = new Set<string>();

async function fetchFeed(feed: FeedConfig): Promise<CatalystEvent[]> {
  try {
    const parsed = await parser.parseURL(feed.url);
    const events: CatalystEvent[] = [];

    for (const item of parsed.items.slice(0, 10)) {
      const guid = item.guid || item.link || item.title || '';
      if (!guid || seenArticles.has(guid)) continue;
      seenArticles.add(guid);

      const title = item.title || 'Untitled';
      const description = item.contentSnippet || item.content || item.summary || '';
      const pubDate = item.pubDate || item.isoDate;
      const timestamp = pubDate
        ? Math.floor(new Date(pubDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      events.push(buildCatalystEvent({
        source: 'news',
        author: feed.author,
        avatar: '📰',
        platform: feed.platform,
        headline: title,
        content: description.slice(0, 280),
        timestamp,
        url: item.link,
      }));
    }

    return events;
  } catch (err) {
    console.error(`[RSS] Failed to fetch ${feed.author}:`, err);
    return [];
  }
}

export async function fetchRssEvents(): Promise<CatalystEvent[]> {
  const results = await Promise.allSettled(FEEDS.map(f => fetchFeed(f)));
  const events: CatalystEvent[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      events.push(...result.value);
    }
  }

  events.sort((a, b) => b.timestamp - a.timestamp);
  return events;
}
