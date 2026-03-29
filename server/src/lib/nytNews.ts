import { CatalystEvent } from '../data/events';
import { buildCatalystEvent } from './eventClassifier';

const NYT_BASE = 'https://api.nytimes.com/svc/search/v2/articlesearch.json';

interface CategoryConfig {
  newsDesks: string[];
  keywords: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    newsDesks: ['Business'],
    keywords: '"federal reserve" OR "interest rate" OR "rate cut" OR "rate hike" OR "central bank" OR "monetary policy" OR "quantitative easing" OR "inflation" OR "CPI" OR "Powell" OR "ECB" OR "Bank of England"',
  },
  {
    newsDesks: ['Business'],
    keywords: '"tariff" OR "trade war" OR "trade deal" OR "sanctions" OR "import duty" OR "export ban" OR "trade deficit" OR "trade surplus" OR "WTO" OR "embargo" OR "protectionism" OR "free trade" OR "customs" OR "dumping"',
  },
  {
    newsDesks: ['Foreign'],
    keywords: '"war" OR "ceasefire" OR "invasion" OR "NATO" OR "summit" OR "diplomatic" OR "missile" OR "nuclear"',
  },
  {
    newsDesks: ['Washington', 'Politics'],
    keywords: '"regulation" OR "SEC" OR "CFTC" OR "deregulation" OR "antitrust" OR "compliance" OR "enforcement" OR "subpoena" OR "investigation" OR "indictment" OR "executive order" OR "legislation" OR "bill passed" OR "veto" OR "oversight"',
  },
];

function toNytDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCategory(
  category: CategoryConfig,
  fromUnix: number,
  toUnix: number,
  apiKey: string
): Promise<CatalystEvent[]> {
  const fq = `news_desk:(${category.newsDesks.map((d) => `"${d}"`).join(' ')})`;

  const params = new URLSearchParams({
    'api-key': apiKey,
    'begin_date': toNytDate(fromUnix),
    'end_date': toNytDate(toUnix),
    'fq': fq,
    'q': category.keywords,
    'sort': 'relevance',
  });

  const url = `${NYT_BASE}?${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[NYT] HTTP ${res.status} for desks=${category.newsDesks.join(',')}`);
      return [];
    }

    const json = await res.json() as any;
    const docs = json.response?.docs ?? [];

    return docs.map((doc: any) => {
      const headline = doc.headline?.main ?? 'Untitled';
      const abstract = doc.abstract ?? doc.lead_paragraph ?? '';
      const pubDate = doc.pub_date;
      const timestamp = pubDate
        ? Math.floor(new Date(pubDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      return buildCatalystEvent({
        source: 'news',
        author: 'New York Times',
        avatar: '📰',
        platform: 'NYT',
        headline,
        content: abstract.slice(0, 280),
        timestamp,
        url: doc.web_url,
      });
    });
  } catch (err) {
    console.error(`[NYT] Fetch error for desks=${category.newsDesks.join(',')}:`, err);
    return [];
  }
}

export async function fetchNytEvents(
  fromUnix: number,
  toUnix: number
): Promise<CatalystEvent[]> {
  const apiKey = process.env.NYT_API_KEY;
  if (!apiKey) {
    console.warn('[NYT] No NYT_API_KEY set, skipping');
    return [];
  }

  // NYT rate limit: 5 req/min. Add 1.2s delay between category queries.
  const events: CatalystEvent[] = [];
  for (let i = 0; i < CATEGORIES.length; i++) {
    if (i > 0) await sleep(1200);
    try {
      const categoryEvents = await fetchCategory(CATEGORIES[i], fromUnix, toUnix, apiKey);
      events.push(...categoryEvents);
    } catch (err) {
      console.error(`[NYT] Category ${i} failed:`, err);
    }
  }

  return events;
}
