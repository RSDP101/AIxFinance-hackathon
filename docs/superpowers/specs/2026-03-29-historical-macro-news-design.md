# Historical Macro News Integration — Design Spec

## Overview

Add historical macro news from the Guardian and New York Times to the CryptoSignal Terminal. When the user selects a date range via the existing date picker, the server fetches the most relevant articles from both APIs for that period, classifies them, and returns them as `CatalystEvent[]` alongside existing live events. Articles appear as blue (news) markers on the chart with source attribution in the tooltip.

## Data Sources

### Guardian Open Platform API

- **Endpoint:** `https://content.guardianapis.com/search`
- **Auth:** API key via `api-key` query param. Env var: `GUARDIAN_API_KEY`
- **Free tier:** 5,000 req/day, 10 req/sec
- **History depth:** Back to 1999
- **Sort:** `order-by=relevance` — returns articles ranked by keyword match quality
- **Page size:** `page-size=50` per category query

**Query params:**
- `from-date` / `to-date` — ISO date format (YYYY-MM-DD)
- `section` — Guardian section filter
- `q` — keyword query (OR-joined)
- `show-fields=headline,trailText` — returns headline + summary
- `order-by=relevance`
- `page-size=50`

### NYT Article Search API

- **Endpoint:** `https://api.nytimes.com/svc/search/v2/articlesearch.json`
- **Auth:** API key via `api-key` query param. Env var: `NYT_API_KEY`
- **Free tier:** 500 req/day, 5 req/min
- **History depth:** Back to 1851
- **Sort:** `sort=relevance` — returns articles ranked by keyword match quality
- **Page size:** 10 per page (NYT fixed), fetch page 0 only per category

**Query params:**
- `begin_date` / `end_date` — YYYYMMDD format
- `fq` — filter query, e.g. `news_desk:("Business" "Foreign")`
- `q` — keyword query
- `sort=relevance`

## Category Keywords

Four macro categories, each queried separately against both APIs:

### Fed / Central Banks
- **Guardian section:** `business`
- **NYT news desk:** `Business`
- **Keywords:** `"federal reserve" OR "interest rate" OR "rate cut" OR "rate hike" OR "central bank" OR "monetary policy" OR "quantitative easing" OR "inflation" OR "CPI" OR "Powell" OR "ECB" OR "Bank of England"`

### Trade / Tariffs
- **Guardian section:** `business`
- **NYT news desk:** `Business`
- **Keywords:** `"tariff" OR "trade war" OR "trade deal" OR "sanctions" OR "import duty" OR "export ban" OR "trade deficit" OR "trade surplus" OR "WTO" OR "embargo" OR "protectionism" OR "free trade" OR "customs" OR "dumping"`

### Geopolitics
- **Guardian section:** `world`
- **NYT news desk:** `Foreign`
- **Keywords:** `"war" OR "ceasefire" OR "invasion" OR "NATO" OR "summit" OR "diplomatic" OR "missile" OR "nuclear"`

### Regulation
- **Guardian section:** `politics`, `us-news`
- **NYT news desk:** `Washington`, `Politics`
- **Keywords:** `"regulation" OR "SEC" OR "CFTC" OR "deregulation" OR "antitrust" OR "compliance" OR "enforcement" OR "subpoena" OR "investigation" OR "indictment" OR "executive order" OR "legislation" OR "bill passed" OR "veto" OR "oversight"`

## Server Architecture

### New Files

| File | Responsibility |
|------|----------------|
| `server/src/lib/guardianNews.ts` | Fetch articles from Guardian API for a date range across all 4 categories |
| `server/src/lib/nytNews.ts` | Fetch articles from NYT API for a date range across all 4 categories |
| `server/src/lib/historicalNews.ts` | Orchestrator: calls both fetchers, deduplicates, caches results |

### Modified Files

| File | Change |
|------|--------|
| `server/src/routes/events.ts` | When `from`/`to` provided, also call `historicalNews.fetchHistoricalEvents(from, to)` and merge |
| `server/src/lib/eventClassifier.ts` | Expand keyword lists for macro categories (Fed, Trade, Geopolitics, Regulation) |
| `server/src/data/events.ts` | Align `EventSource` type to match client: `'truthsocial' \| 'news' \| 'twitter'` (currently `'political' \| 'news' \| 'social'`). Update existing hardcoded events to use new source values. |

### No Changes Needed

These files already handle the flow correctly:
- `lib/types.ts` — `EventSource` is `'truthsocial' | 'news' | 'twitter'`; macro articles use `'news'`
- `hooks/useEvents.ts` — already fetches `/api/events?from=X&to=Y` and merges with WebSocket
- `components/Chart.tsx` — already renders event markers from the events array
- `components/Terminal.tsx` — already passes `timeRange` to `useEvents`

## Event Mapping

Guardian and NYT articles map to `CatalystEvent` via `buildCatalystEvent()`:

| CatalystEvent field | Guardian source | NYT source |
|---------------------|----------------|------------|
| `source` | `'news'` | `'news'` |
| `author` | `'The Guardian'` | `'New York Times'` |
| `avatar` | `'📰'` | `'📰'` |
| `platform` | `'Guardian'` | `'NYT'` |
| `headline` | `fields.headline` | `headline.main` |
| `content` | `fields.trailText` (stripped HTML) | `abstract` |
| `timestamp` | `webPublicationDate` (parsed to unix) | `pub_date` (parsed to unix) |
| `url` | `webUrl` | `web_url` |
| `coin` | Auto-classified by `eventClassifier` | Auto-classified by `eventClassifier` |
| `sentiment` | Auto-classified by `eventClassifier` | Auto-classified by `eventClassifier` |

Most macro articles will classify as `coin: 'ALL'` since they affect all markets, which is correct — they show on every coin's chart.

## Caching

In-memory LRU cache in `historicalNews.ts`:

- **Key:** `${from}-${to}` (unix timestamps)
- **Value:** `CatalystEvent[]`
- **Max entries:** 50 (oldest evicted on insert)
- **TTL:** None — historical articles don't change. Cache lives for the server session.
- **Cache hit:** Return immediately, no API calls.

## Deduplication

Between Guardian and NYT results (same story covered by both):

1. Normalize headlines: lowercase, strip punctuation
2. Compute word overlap between each pair of headlines
3. If two articles share >70% word overlap, keep the one with longer content
4. Applied after fetching, before caching

## Rate Limit Safety

- **Guardian:** 4 queries per date range (one per category). At 10/sec, no throttling needed.
- **NYT:** 4 queries per date range. At 5/min limit, add 1-second delay between NYT queries (total ~4 seconds for all categories).
- **Caching** ensures repeated views of the same date range cost zero API calls.
- **Graceful degradation:** If an API key is missing, that fetcher returns `[]` and logs a warning. The other source still works.

## Environment Variables

```
GUARDIAN_API_KEY=your-guardian-api-key
NYT_API_KEY=your-nyt-api-key
```

Sign up:
- Guardian: https://open-platform.theguardian.com/access/
- NYT: https://developer.nytimes.com/

Both are free and instant.

## Data Flow

```
User changes date range in TopBar
  → Terminal.tsx updates timeRange state
  → useEvents(timeRange) fires
  → GET /api/events?from=X&to=Y
  → events.ts route handler:
      1. Gets live events from liveFeedManager (filtered by range)
      2. Calls historicalNews.fetchHistoricalEvents(from, to)
         → Checks LRU cache
         → Cache miss: queries Guardian + NYT in parallel
         → Classifies articles via buildCatalystEvent()
         → Deduplicates
         → Caches result
      3. Merges live + historical, deduplicates by ID
      4. Returns sorted { events: CatalystEvent[] }
  → useEvents merges REST + WebSocket events
  → Chart renders markers with density filtering
```
