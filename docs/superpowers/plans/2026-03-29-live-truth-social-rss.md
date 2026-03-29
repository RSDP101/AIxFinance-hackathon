# Live Truth Social + RSS Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded political and news events with live data from Truth Social (Mastodon API) and crypto news RSS feeds, streamed to clients via the existing WebSocket infrastructure.

**Architecture:** Add two fetcher modules to the Express server — one polls Truth Social's Mastodon-compatible API for political posts, the other polls RSS feeds for crypto news. A shared event classifier tags each item with coin relevance and sentiment using keyword matching. The existing `newsServer.ts` WebSocket broadcaster is updated to merge live events with hardcoded social/Twitter events.

**Tech Stack:** Express.js, `rss-parser` (npm), Truth Social Mastodon API (direct fetch), existing WebSocket infrastructure.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `server/src/lib/eventClassifier.ts` | Keyword-based coin tagging + sentiment assignment |
| Create | `server/src/lib/truthSocial.ts` | Fetch posts from Truth Social Mastodon API |
| Create | `server/src/lib/newsRss.ts` | Fetch + parse crypto news RSS feeds |
| Create | `server/src/lib/liveFeedManager.ts` | Orchestrates polling, deduplication, merges all sources |
| Modify | `server/src/ws/newsServer.ts` | Use liveFeedManager instead of hardcoded upcomingEvents |
| Modify | `server/src/data/events.ts` | Keep only hardcoded social/Twitter events |
| Modify | `server/package.json` | Add `rss-parser` dependency |

---

### Task 1: Add `rss-parser` dependency

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Install rss-parser**

```bash
cd server && npm install rss-parser
```

- [ ] **Step 2: Verify installation**

```bash
cd server && node -e "const P = require('rss-parser'); console.log('rss-parser OK')"
```

Expected: `rss-parser OK`

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: add rss-parser dependency"
```

---

### Task 2: Event Classifier

**Files:**
- Create: `server/src/lib/eventClassifier.ts`

- [ ] **Step 1: Create the classifier module**

```typescript
// server/src/lib/eventClassifier.ts
import { CatalystEvent, EventSource } from '../data/events';

type CoinTag = 'BTC-USDT' | 'ETH-USDT' | 'SOL-USDT' | 'TAO-USDT' | 'ALL';

interface ClassifiedResult {
  coin: CoinTag;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

const COIN_KEYWORDS: Record<CoinTag, string[]> = {
  'BTC-USDT': ['bitcoin', 'btc', '$btc', 'satoshi'],
  'ETH-USDT': ['ethereum', 'eth', '$eth', 'vitalik', 'pectra', 'eip'],
  'SOL-USDT': ['solana', 'sol', '$sol', 'jupiter', 'raydium'],
  'TAO-USDT': ['bittensor', 'tao', '$tao', 'subnet'],
  'ALL': [], // fallback, not matched by keywords
};

const BULLISH_KEYWORDS = [
  'bullish', 'moon', 'pump', 'rally', 'surge', 'buy', 'soar',
  'record', 'all-time high', 'ath', 'adoption', 'approval',
  'launch', 'partnership', 'upgrade', 'growth', 'inflow',
];

const BEARISH_KEYWORDS = [
  'bearish', 'crash', 'dump', 'sell', 'fear', 'ban', 'hack',
  'exploit', 'regulation', 'crackdown', 'outflow', 'lawsuit',
  'sec charges', 'investigation', 'decline', 'plunge',
];

export function classifyText(text: string): ClassifiedResult {
  const lower = text.toLowerCase();

  // Find matching coin
  let coin: CoinTag = 'ALL';
  for (const [coinTag, keywords] of Object.entries(COIN_KEYWORDS)) {
    if (coinTag === 'ALL') continue;
    if (keywords.some(kw => lower.includes(kw))) {
      coin = coinTag as CoinTag;
      break;
    }
  }

  // Determine sentiment
  const bullScore = BULLISH_KEYWORDS.filter(kw => lower.includes(kw)).length;
  const bearScore = BEARISH_KEYWORDS.filter(kw => lower.includes(kw)).length;

  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (bullScore > bearScore) sentiment = 'bullish';
  else if (bearScore > bullScore) sentiment = 'bearish';

  return { coin, sentiment };
}

let idCounter = 0;

export function buildCatalystEvent(opts: {
  source: EventSource;
  author: string;
  handle?: string;
  avatar: string;
  platform: string;
  headline: string;
  content: string;
  timestamp: number;
  url?: string;
}): CatalystEvent {
  const combined = `${opts.headline} ${opts.content}`;
  const { coin, sentiment } = classifyText(combined);

  return {
    id: `live-${opts.source}-${Date.now()}-${idCounter++}`,
    source: opts.source,
    author: opts.author,
    handle: opts.handle,
    avatar: opts.avatar,
    coin,
    timestamp: opts.timestamp,
    headline: opts.headline,
    content: opts.content,
    platform: opts.platform,
    sentiment,
    url: opts.url,
  };
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/eventClassifier.ts
git commit -m "feat: add event classifier with keyword-based coin tagging and sentiment"
```

---

### Task 3: Truth Social Fetcher

**Files:**
- Create: `server/src/lib/truthSocial.ts`

- [ ] **Step 1: Create the Truth Social fetcher**

```typescript
// server/src/lib/truthSocial.ts
import { CatalystEvent } from '../data/events';
import { buildCatalystEvent } from './eventClassifier';

interface MastodonStatus {
  id: string;
  created_at: string;
  content: string; // HTML content
  url: string;
  account: {
    display_name: string;
    acct: string;
  };
}

const BASE_URL = 'https://truthsocial.com/api/v1';

// Accounts to monitor: [acct, avatar emoji]
const MONITORED_ACCOUNTS = [
  ['realDonaldTrump', '🇺🇸'],
] as const;

// Strip HTML tags from Mastodon content
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Truncate to first sentence or 100 chars for headline
function makeHeadline(author: string, text: string): string {
  const short = text.length > 80 ? text.slice(0, 77) + '...' : text;
  return `${author}: ${short}`;
}

async function lookupAccountId(acct: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/accounts/lookup?acct=${acct}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.id;
  } catch (err) {
    console.error(`[TruthSocial] Failed to lookup ${acct}:`, err);
    return null;
  }
}

async function fetchStatuses(accountId: string, sinceId?: string): Promise<MastodonStatus[]> {
  try {
    const params = new URLSearchParams({ limit: '20' });
    if (sinceId) params.set('since_id', sinceId);
    const res = await fetch(`${BASE_URL}/accounts/${accountId}/statuses?${params}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error(`[TruthSocial] Failed to fetch statuses:`, err);
    return [];
  }
}

// Cache account IDs so we only look them up once
const accountIdCache = new Map<string, string>();
// Track last seen status ID per account to avoid duplicates
const lastSeenId = new Map<string, string>();

export async function fetchTruthSocialEvents(): Promise<CatalystEvent[]> {
  const events: CatalystEvent[] = [];

  for (const [acct, avatar] of MONITORED_ACCOUNTS) {
    // Resolve account ID
    let accountId = accountIdCache.get(acct);
    if (!accountId) {
      accountId = await lookupAccountId(acct) ?? undefined;
      if (!accountId) continue;
      accountIdCache.set(acct, accountId);
    }

    const sinceId = lastSeenId.get(acct);
    const statuses = await fetchStatuses(accountId, sinceId);

    if (statuses.length > 0) {
      // Update last seen to newest status (first in array)
      lastSeenId.set(acct, statuses[0].id);
    }

    for (const status of statuses) {
      const text = stripHtml(status.content);
      if (!text) continue;

      events.push(buildCatalystEvent({
        source: 'political',
        author: status.account.display_name || acct,
        handle: `@${status.account.acct}`,
        avatar: avatar as string,
        platform: 'Truth Social',
        headline: makeHeadline(status.account.display_name || acct, text),
        content: text,
        timestamp: Math.floor(new Date(status.created_at).getTime() / 1000),
        url: status.url,
      }));
    }
  }

  return events;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Quick smoke test**

```bash
cd server && npx tsx -e "
const { fetchTruthSocialEvents } = require('./src/lib/truthSocial');
fetchTruthSocialEvents().then((events: any[]) => {
  console.log('Fetched', events.length, 'events');
  if (events.length > 0) console.log('First:', events[0].headline);
}).catch((e: any) => console.error('Error:', e.message));
"
```

Expected: fetches events (count depends on recent Truth Social posts)

- [ ] **Step 4: Commit**

```bash
git add server/src/lib/truthSocial.ts
git commit -m "feat: add Truth Social fetcher using Mastodon API"
```

---

### Task 4: News RSS Fetcher

**Files:**
- Create: `server/src/lib/newsRss.ts`

- [ ] **Step 1: Create the RSS fetcher**

```typescript
// server/src/lib/newsRss.ts
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
  author: string;  // outlet name
  platform: string; // short name for display
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

// Track seen article GUIDs/links to avoid duplicates across polls
const seenArticles = new Set<string>();

async function fetchFeed(feed: FeedConfig): Promise<CatalystEvent[]> {
  try {
    const parsed = await parser.parseURL(feed.url);
    const events: CatalystEvent[] = [];

    for (const item of parsed.items.slice(0, 10)) { // latest 10 per feed
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

  // Sort newest first
  events.sort((a, b) => b.timestamp - a.timestamp);
  return events;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Quick smoke test**

```bash
cd server && npx tsx -e "
const { fetchRssEvents } = require('./src/lib/newsRss');
fetchRssEvents().then((events: any[]) => {
  console.log('Fetched', events.length, 'RSS events');
  if (events.length > 0) {
    console.log('First:', events[0].headline);
    console.log('Coin:', events[0].coin, 'Sentiment:', events[0].sentiment);
  }
}).catch((e: any) => console.error('Error:', e.message));
"
```

Expected: fetches articles from RSS feeds

- [ ] **Step 4: Commit**

```bash
git add server/src/lib/newsRss.ts
git commit -m "feat: add RSS news fetcher for CoinDesk, Cointelegraph, The Block"
```

---

### Task 5: Live Feed Manager

**Files:**
- Create: `server/src/lib/liveFeedManager.ts`

- [ ] **Step 1: Create the feed manager**

```typescript
// server/src/lib/liveFeedManager.ts
import { CatalystEvent } from '../data/events';
import { fetchTruthSocialEvents } from './truthSocial';
import { fetchRssEvents } from './newsRss';

type EventCallback = (event: CatalystEvent) => void;

// Stores all events fetched so far (for initial load on new connections)
const allLiveEvents: CatalystEvent[] = [];
const seenIds = new Set<string>();

let onNewEvent: EventCallback | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

export function getAllLiveEvents(): CatalystEvent[] {
  return [...allLiveEvents];
}

export function setOnNewEvent(cb: EventCallback) {
  onNewEvent = cb;
}

function addEvent(event: CatalystEvent) {
  // Deduplicate by a content hash (headline + timestamp)
  const key = `${event.headline}:${event.timestamp}`;
  if (seenIds.has(key)) return;
  seenIds.add(key);

  allLiveEvents.push(event);
  if (onNewEvent) onNewEvent(event);
}

async function poll() {
  console.log('[LiveFeed] Polling Truth Social + RSS...');

  try {
    const [truthEvents, rssEvents] = await Promise.allSettled([
      fetchTruthSocialEvents(),
      fetchRssEvents(),
    ]);

    if (truthEvents.status === 'fulfilled') {
      for (const e of truthEvents.value) addEvent(e);
      console.log(`[LiveFeed] Truth Social: ${truthEvents.value.length} new`);
    } else {
      console.error('[LiveFeed] Truth Social poll failed:', truthEvents.reason);
    }

    if (rssEvents.status === 'fulfilled') {
      for (const e of rssEvents.value) addEvent(e);
      console.log(`[LiveFeed] RSS: ${rssEvents.value.length} new`);
    } else {
      console.error('[LiveFeed] RSS poll failed:', rssEvents.reason);
    }
  } catch (err) {
    console.error('[LiveFeed] Poll error:', err);
  }
}

export function startLiveFeed(intervalMs: number = 120000) {
  // Initial fetch
  poll();

  // Then poll on interval (default 2 minutes)
  pollInterval = setInterval(poll, intervalMs);
  console.log(`[LiveFeed] Started, polling every ${intervalMs / 1000}s`);
}

export function stopLiveFeed() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/liveFeedManager.ts
git commit -m "feat: add live feed manager for polling and deduplication"
```

---

### Task 6: Wire Up newsServer.ts to Use Live Feed

**Files:**
- Modify: `server/src/ws/newsServer.ts`
- Modify: `server/src/data/events.ts`

- [ ] **Step 1: Update newsServer.ts to use liveFeedManager**

Replace the entire contents of `server/src/ws/newsServer.ts` with:

```typescript
// server/src/ws/newsServer.ts
import WebSocket, { WebSocketServer } from 'ws';
import { catalystEvents } from '../data/events';
import { startLiveFeed, getAllLiveEvents, setOnNewEvent } from '../lib/liveFeedManager';

export function setupNewsServer(wss: WebSocketServer) {
  // Start live feed polling (Truth Social + RSS)
  startLiveFeed(120000); // poll every 2 minutes

  // When a new live event arrives, broadcast to all connected clients
  setOnNewEvent((event) => {
    const payload = JSON.stringify({ type: 'new_event', data: event });
    wss.clients.forEach(c => {
      if (c.readyState === WebSocket.OPEN) c.send(payload);
    });
  });

  wss.on('connection', (ws) => {
    console.log('Client connected to news WS');

    // Send hardcoded historical events + any live events fetched so far
    const allEvents = [...catalystEvents, ...getAllLiveEvents()];
    ws.send(JSON.stringify({
      type: 'initial_events',
      data: allEvents,
    }));

    ws.on('close', () => console.log('Client disconnected from news WS'));
  });

  console.log('News server started — live feed active');
}
```

- [ ] **Step 2: Update events.ts — remove hardcoded news/political from upcomingEvents**

Keep `catalystEvents` as historical demo data. Remove `upcomingEvents` export since live feed replaces it:

In `server/src/data/events.ts`, remove the entire `upcomingEvents` array and its export. The `catalystEvents` array stays unchanged — it serves as historical demo data shown on initial load.

Find and delete everything from `// Events queued for live push` to the end of the file (lines 316-437).

- [ ] **Step 3: Verify it compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Test the server starts**

```bash
cd server && timeout 5 npx tsx src/index.ts || true
```

Expected: should see:
```
[LiveFeed] Started, polling every 120s
[LiveFeed] Polling Truth Social + RSS...
News server started — live feed active
AIx Terminal server on http://localhost:3001
```

- [ ] **Step 5: Commit**

```bash
git add server/src/ws/newsServer.ts server/src/data/events.ts
git commit -m "feat: wire newsServer to live Truth Social + RSS feeds"
```

---

### Task 7: Verify Full Integration

- [ ] **Step 1: Start the full app**

```bash
npm run dev
```

- [ ] **Step 2: Check server logs**

Verify you see:
- `[LiveFeed] Started, polling every 120s`
- `[LiveFeed] Truth Social: X new`
- `[LiveFeed] RSS: X new`

- [ ] **Step 3: Open the app in browser**

Navigate to `http://localhost:3000`. Verify:
- Historical hardcoded events still appear on the chart
- New live RSS events appear with blue (news) vertical lines
- New live Truth Social events appear with orange (political) vertical lines
- Event tooltips show correct author, headline, content
- Source filter toggles work for live events

- [ ] **Step 4: Final commit with any fixes**

```bash
git add -A
git commit -m "feat: live Truth Social + RSS integration complete"
```
