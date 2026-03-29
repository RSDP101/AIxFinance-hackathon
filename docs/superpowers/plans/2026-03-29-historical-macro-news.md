# Historical Macro News Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch historical macro news from the Guardian and NYT APIs for arbitrary date ranges and serve them as CatalystEvents alongside existing live events.

**Architecture:** Two fetcher modules (`guardianNews.ts`, `nytNews.ts`) query their respective APIs per category. An orchestrator (`historicalNews.ts`) calls both, deduplicates, and caches. The existing `/api/events` route merges historical results with live events.

**Tech Stack:** Express.js, Guardian Open Platform API, NYT Article Search API, existing `eventClassifier.ts`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `server/src/lib/guardianNews.ts` | Fetch Guardian articles for a date range across 4 macro categories |
| Create | `server/src/lib/nytNews.ts` | Fetch NYT articles for a date range across 4 macro categories |
| Create | `server/src/lib/historicalNews.ts` | Orchestrate both fetchers, deduplicate, cache results |
| Modify | `server/src/lib/eventClassifier.ts` | Expand bullish/bearish keyword lists with macro terms |
| Modify | `server/src/routes/events.ts` | Call historicalNews when from/to provided, merge results |

---

### Task 1: Expand Event Classifier Keywords

**Files:**
- Modify: `server/src/lib/eventClassifier.ts`

- [ ] **Step 1: Add macro-relevant keywords to the classifier**

In `server/src/lib/eventClassifier.ts`, replace the `BULLISH_KEYWORDS` and `BEARISH_KEYWORDS` arrays with expanded versions that cover macro/economic events:

```typescript
const BULLISH_KEYWORDS = [
  'bullish', 'moon', 'pump', 'rally', 'surge', 'buy', 'soar',
  'record', 'all-time high', 'ath', 'adoption', 'approval',
  'launch', 'partnership', 'upgrade', 'growth', 'inflow',
  // Macro
  'rate cut', 'stimulus', 'easing', 'ceasefire', 'peace',
  'trade deal', 'deregulation', 'tax cut', 'jobs growth',
  'gdp growth', 'consumer confidence', 'dovish',
];

const BEARISH_KEYWORDS = [
  'bearish', 'crash', 'dump', 'sell', 'fear', 'ban', 'hack',
  'exploit', 'regulation', 'crackdown', 'outflow', 'lawsuit',
  'sec charges', 'investigation', 'decline', 'plunge',
  // Macro
  'rate hike', 'tariff', 'sanctions', 'war', 'invasion',
  'recession', 'default', 'shutdown', 'hawkish', 'inflation spike',
  'trade war', 'embargo', 'indictment', 'subpoena',
];
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd server && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/eventClassifier.ts
git commit -m "feat: expand classifier keywords for macro economic events"
```

---

### Task 2: Guardian News Fetcher

**Files:**
- Create: `server/src/lib/guardianNews.ts`

- [ ] **Step 1: Create the Guardian fetcher module**

Create `server/src/lib/guardianNews.ts`:

```typescript
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

    const json = await res.json();
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
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd server && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/guardianNews.ts
git commit -m "feat: add Guardian API fetcher for historical macro news"
```

---

### Task 3: NYT News Fetcher

**Files:**
- Create: `server/src/lib/nytNews.ts`

- [ ] **Step 1: Create the NYT fetcher module**

Create `server/src/lib/nytNews.ts`:

```typescript
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

    const json = await res.json();
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

  // NYT rate limit: 5 req/min. Add 1s delay between category queries.
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
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd server && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/nytNews.ts
git commit -m "feat: add NYT API fetcher for historical macro news"
```

---

### Task 4: Historical News Orchestrator with Cache

**Files:**
- Create: `server/src/lib/historicalNews.ts`

- [ ] **Step 1: Create the orchestrator module**

Create `server/src/lib/historicalNews.ts`:

```typescript
import { CatalystEvent } from '../data/events';
import { fetchGuardianEvents } from './guardianNews';
import { fetchNytEvents } from './nytNews';

// LRU cache: key = "from-to", value = events
const cache = new Map<string, CatalystEvent[]>();
const MAX_CACHE_ENTRIES = 50;

function cacheKey(from: number, to: number): string {
  return `${from}-${to}`;
}

function cacheSet(key: string, value: CatalystEvent[]) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    // Delete oldest entry (first key in Map iteration order)
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, value);
}

function normalizeHeadline(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }

  const smaller = Math.min(wordsA.size, wordsB.size);
  return overlap / smaller;
}

function deduplicateEvents(events: CatalystEvent[]): CatalystEvent[] {
  const result: CatalystEvent[] = [];
  const normalized = events.map((e) => ({
    event: e,
    norm: normalizeHeadline(e.headline),
  }));

  const removed = new Set<number>();

  for (let i = 0; i < normalized.length; i++) {
    if (removed.has(i)) continue;
    for (let j = i + 1; j < normalized.length; j++) {
      if (removed.has(j)) continue;
      if (wordOverlap(normalized[i].norm, normalized[j].norm) > 0.7) {
        // Keep the one with longer content
        if (normalized[i].event.content.length >= normalized[j].event.content.length) {
          removed.add(j);
        } else {
          removed.add(i);
          break;
        }
      }
    }
  }

  for (let i = 0; i < normalized.length; i++) {
    if (!removed.has(i)) result.push(normalized[i].event);
  }

  return result;
}

export async function fetchHistoricalEvents(
  fromUnix: number,
  toUnix: number
): Promise<CatalystEvent[]> {
  const key = cacheKey(fromUnix, toUnix);

  // Cache hit
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  console.log(`[HistoricalNews] Fetching for range ${new Date(fromUnix * 1000).toISOString()} to ${new Date(toUnix * 1000).toISOString()}`);

  // Fetch Guardian and NYT in parallel (NYT has internal rate limiting)
  const [guardianResult, nytResult] = await Promise.allSettled([
    fetchGuardianEvents(fromUnix, toUnix),
    fetchNytEvents(fromUnix, toUnix),
  ]);

  const allEvents: CatalystEvent[] = [];

  if (guardianResult.status === 'fulfilled') {
    allEvents.push(...guardianResult.value);
    console.log(`[HistoricalNews] Guardian: ${guardianResult.value.length} articles`);
  } else {
    console.error('[HistoricalNews] Guardian fetch failed:', guardianResult.reason);
  }

  if (nytResult.status === 'fulfilled') {
    allEvents.push(...nytResult.value);
    console.log(`[HistoricalNews] NYT: ${nytResult.value.length} articles`);
  } else {
    console.error('[HistoricalNews] NYT fetch failed:', nytResult.reason);
  }

  // Deduplicate cross-source
  const deduplicated = deduplicateEvents(allEvents);
  console.log(`[HistoricalNews] After dedup: ${deduplicated.length} articles (removed ${allEvents.length - deduplicated.length} duplicates)`);

  // Cache
  cacheSet(key, deduplicated);

  return deduplicated;
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd server && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/historicalNews.ts
git commit -m "feat: add historical news orchestrator with LRU cache and deduplication"
```

---

### Task 5: Wire Events Route to Historical News

**Files:**
- Modify: `server/src/routes/events.ts`

- [ ] **Step 1: Update the events route to fetch historical news**

Replace the entire contents of `server/src/routes/events.ts` with:

```typescript
import { Router, Request, Response } from 'express';
import { catalystEvents } from '../data/events';
import { getAllLiveEvents } from '../lib/liveFeedManager';
import { fetchHistoricalEvents } from '../lib/historicalNews';

const router = Router();

router.get('/events', async (req: Request, res: Response) => {
  const from = req.query.from ? Number(req.query.from) : undefined;
  const to = req.query.to ? Number(req.query.to) : undefined;

  // Start with live + hardcoded events
  let events = [...catalystEvents, ...getAllLiveEvents()];

  // Filter by time range
  if (from !== undefined) {
    events = events.filter(e => e.timestamp >= from);
  }
  if (to !== undefined) {
    events = events.filter(e => e.timestamp <= to);
  }

  // Fetch historical macro news if date range is provided
  if (from !== undefined && to !== undefined) {
    try {
      const historicalEvents = await fetchHistoricalEvents(from, to);
      events.push(...historicalEvents);
    } catch (err) {
      console.error('[Events Route] Historical news fetch error:', err);
    }
  }

  // Deduplicate by ID
  const seen = new Set<string>();
  events = events.filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  events.sort((a, b) => a.timestamp - b.timestamp);

  res.json({ events });
});

export default router;
```

Note: the route handler is now `async` to support the `await fetchHistoricalEvents()` call.

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd server && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Test the endpoint**

Start the server and test with a date range:

```bash
cd server && npx tsx src/index.ts &
sleep 3
# Query for articles from March 2025
curl -s "http://localhost:3001/api/events?from=1740787200&to=1743465600" | node -e "
const chunks = [];
process.stdin.on('data', d => chunks.push(d));
process.stdin.on('end', () => {
  const data = JSON.parse(Buffer.concat(chunks));
  console.log('Total events:', data.events.length);
  const sources = {};
  data.events.forEach(e => { sources[e.platform] = (sources[e.platform] || 0) + 1; });
  console.log('By platform:', sources);
});
"
kill %1
```

Expected: events from Guardian and/or NYT (depending on which API keys are set), plus any live/hardcoded events in that range.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/events.ts
git commit -m "feat: wire events route to historical Guardian + NYT news"
```

---

## Summary

| Task | Component | Key Files |
|------|-----------|-----------|
| 1 | Expand Classifier Keywords | `server/src/lib/eventClassifier.ts` |
| 2 | Guardian Fetcher | `server/src/lib/guardianNews.ts` |
| 3 | NYT Fetcher | `server/src/lib/nytNews.ts` |
| 4 | Orchestrator + Cache | `server/src/lib/historicalNews.ts` |
| 5 | Wire Events Route | `server/src/routes/events.ts` |

**Environment variables required:**
```
GUARDIAN_API_KEY=your-key    # https://open-platform.theguardian.com/access/
NYT_API_KEY=your-key         # https://developer.nytimes.com/
```

**No client changes needed** — the existing `useEvents` hook, Chart markers, and Terminal date picker already handle the flow.
