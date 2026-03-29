import { CatalystEvent } from '../data/events';
import { buildCatalystEvent } from './eventClassifier';

const GUARDIAN_BASE = 'https://content.guardianapis.com/search';

interface CategoryConfig {
  section: string;
  keywords: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    section: 'business',
    keywords: '"federal reserve" OR "interest rate" OR "rate cut" OR "rate hike" OR "central bank" OR "monetary policy" OR "quantitative easing" OR "inflation" OR "CPI" OR "Powell" OR "ECB" OR "Bank of England"',
  },
  {
    section: 'business',
    keywords: '"tariff" OR "trade war" OR "trade deal" OR "sanctions" OR "import duty" OR "export ban" OR "trade deficit" OR "trade surplus" OR "WTO" OR "embargo" OR "protectionism" OR "free trade" OR "customs" OR "dumping"',
  },
  {
    section: 'world',
    keywords: '"war" OR "ceasefire" OR "invasion" OR "NATO" OR "summit" OR "diplomatic" OR "missile" OR "nuclear"',
  },
  {
    section: 'politics|us-news',
    keywords: '"regulation" OR "SEC" OR "CFTC" OR "deregulation" OR "antitrust" OR "compliance" OR "enforcement" OR "subpoena" OR "investigation" OR "indictment" OR "executive order" OR "legislation" OR "bill passed" OR "veto" OR "oversight"',
  },
];

function toIsoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().split('T')[0];
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchCategory(
  category: CategoryConfig,
  fromUnix: number,
  toUnix: number,
  apiKey: string
): Promise<CatalystEvent[]> {
  const params = new URLSearchParams({
    'api-key': apiKey,
    'from-date': toIsoDate(fromUnix),
    'to-date': toIsoDate(toUnix),
    'section': category.section,
    'q': category.keywords,
    'show-fields': 'headline,trailText',
    'order-by': 'relevance',
    'page-size': '50',
  });

  const url = `${GUARDIAN_BASE}?${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[Guardian] HTTP ${res.status} for section=${category.section}`);
      return [];
    }

    const json = await res.json() as any;
    const results = json.response?.results ?? [];

    return results.map((article: any) => {
      const headline = article.fields?.headline ?? article.webTitle ?? 'Untitled';
      const trailText = article.fields?.trailText ?? '';
      const pubDate = article.webPublicationDate;
      const timestamp = pubDate
        ? Math.floor(new Date(pubDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      return buildCatalystEvent({
        source: 'news',
        author: 'The Guardian',
        avatar: '📰',
        platform: 'Guardian',
        headline,
        content: stripHtml(trailText).slice(0, 280),
        timestamp,
        url: article.webUrl,
      });
    });
  } catch (err) {
    console.error(`[Guardian] Fetch error for section=${category.section}:`, err);
    return [];
  }
}

export async function fetchGuardianEvents(
  fromUnix: number,
  toUnix: number
): Promise<CatalystEvent[]> {
  const apiKey = process.env.GUARDIAN_API_KEY;
  if (!apiKey) {
    console.warn('[Guardian] No GUARDIAN_API_KEY set, skipping');
    return [];
  }

  const results = await Promise.allSettled(
    CATEGORIES.map((cat) => fetchCategory(cat, fromUnix, toUnix, apiKey))
  );

  const events: CatalystEvent[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      events.push(...result.value);
    }
  }

  return events;
}
