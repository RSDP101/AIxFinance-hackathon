# CryptoSignal Terminal — Design Spec

## Overview

A crypto trading terminal (Hyperliquid-inspired) that overlays social media and news events on price charts as colored vertical lines. Users can hover event lines for details and filter by event category and individual source. News and Truth Social events are fetched live via RSS feeds and the Mastodon-compatible API; X/Twitter events are hardcoded for the demo. Architected to support additional real data sources and a public API.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Charting:** TradingView Lightweight Charts
- **Layout:** react-resizable-panels
- **Styling:** Tailwind CSS (dark theme)
- **Language:** TypeScript

## Supported Coins

BTC, ETH, SOL — selectable via top bar tabs.

## Project Structure

```
├── app/
│   ├── page.tsx                — Single-page terminal
│   ├── layout.tsx              — Root layout, fonts, global styles
│   └── api/
│       ├── events/route.ts     — REST API for event data (merges all sources)
│       └── ingest/route.ts     — Endpoint to trigger data refresh
├── components/
│   ├── Terminal.tsx             — Main layout with resizable panels
│   ├── Chart.tsx               — Lightweight Charts + event overlay rendering
│   ├── OrderBook.tsx           — Mock order book with bid/ask depth bars
│   ├── TopBar.tsx              — Coin selector, price display, event filter toggles
│   ├── EventTooltip.tsx        — Hover popover for event line details
│   └── SourceFilterPopover.tsx — Dropdown with per-source checkboxes
├── data/
│   ├── prices.ts               — Hardcoded OHLCV data per coin
│   ├── orderbook.ts            — Hardcoded bid/ask levels per coin
│   └── twitter-events.ts      — Hardcoded X/Twitter events (demo only)
└── lib/
    ├── types.ts                — Shared TypeScript types
    ├── truth-social.ts         — Truth Social fetcher (Mastodon API)
    ├── news-rss.ts             — RSS feed fetcher + parser
    └── event-classifier.ts    — Maps raw posts/articles to SignalEvents (coin tagging, sentiment)
```

## Data Models

### SignalEvent

```typescript
type EventSource = 'political' | 'news' | 'crypto_twitter'
type CoinId = 'BTC' | 'ETH' | 'SOL'

interface SignalEvent {
  id: string
  source: EventSource
  sourceAuthor: string        // e.g. "Elon Musk", "Reuters", "Trump"
  sourceHandle?: string       // e.g. "@elonmusk", "@reuters"
  coin: CoinId
  timestamp: number           // unix seconds, aligned to candle times
  headline: string
  summary: string             // 1-2 sentence description
  url?: string
  priceImpact?: {
    percent: number
    direction: 'up' | 'down'
    windowMinutes: number     // e.g. 60 = "in next hour"
  }
  sentiment?: 'bullish' | 'bearish' | 'neutral'
}
```

### Candle

```typescript
interface Candle {
  time: number    // unix seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}
```

### OrderBookLevel

```typescript
interface OrderBookLevel {
  price: number
  size: number
  total: number   // cumulative size
}

interface OrderBook {
  asks: OrderBookLevel[]  // sorted price ascending
  bids: OrderBookLevel[]  // sorted price descending
}
```

### FilterState

```typescript
// Per coin, per category, which specific sourceAuthors are enabled
type FilterState = Record<CoinId, Record<EventSource, Set<string>>>
```

## Layout

Single page, three zones:

1. **Top bar** (fixed height, ~48px)
   - Left: App name ("CryptoSignal"), coin selector tabs (BTC/ETH/SOL)
   - Center-right: Current price + 24h change
   - Right: Three category filter toggles (Political / News / Crypto Twitter) — each is a pill button, filled when active. Clicking opens a SourceFilterPopover dropdown with checkboxes for individual sources within that category.

2. **Chart panel** (~70% width, resizable)
   - TradingView Lightweight Charts rendering candlestick data
   - Volume histogram below candles
   - Event overlay: vertical dashed lines colored by category
   - Small colored label at top of each event line showing truncated headline
   - Hover on event line shows EventTooltip popover

3. **Order book panel** (~30% width, resizable)
   - Header: "ORDER BOOK"
   - Column headers: Price (USDT) | Size | Total
   - Asks (red, top half) with depth bar backgrounds
   - Spread display (current price + spread %)
   - Bids (green, bottom half) with depth bar backgrounds
   - Event legend at bottom

Panels are resizable via react-resizable-panels with a drag handle between chart and order book.

## Event Overlay System

### Rendering
- Each event that passes the current filter is rendered as a vertical line on the chart
- Uses Lightweight Charts `addLineSeries` for vertical lines and `markers` for labels
- Line styles: dashed vertical line spanning full chart height
- Color coding:
  - Political: #FF9800 (orange)
  - News: #2196F3 (blue)
  - Crypto Twitter: #9C27B0 (purple)
- Small label at the top of each line with source icon + truncated headline

### Hover Tooltip (EventTooltip)
Positioned popover that appears on hover, showing:
- Source category icon + label (colored)
- Headline (bold)
- Source author + handle
- Timestamp (formatted)
- Summary text (1-2 sentences)
- Price impact line: e.g. "↑ +2.1% in 1hr" (green/red colored)

### Two-Level Filtering
1. **Category toggles** in top bar — toggle entire categories on/off
2. **Source filter popover** — click a category toggle to open dropdown with checkboxes for individual sourceAuthors within that category
3. Filter state is **per-coin** — switching coins restores that coin's filter state
4. Default: all sources enabled

## API Endpoint

`GET /api/events`

Query parameters:
- `coin` (required): BTC | ETH | SOL
- `source` (optional): political | news | crypto_twitter
- `author` (optional): filter by sourceAuthor
- `from` (optional): unix timestamp, start of range
- `to` (optional): unix timestamp, end of range

Response:
```json
{
  "events": [SignalEvent, ...],
  "meta": {
    "coin": "BTC",
    "count": 5,
    "sources": ["political", "news"]
  }
}
```

The API merges events from all three sources (live Truth Social, live RSS, hardcoded Twitter) and returns them unified under the SignalEvent schema.

## Data Sources

### Live: Truth Social (Political events)
- **API:** Mastodon-compatible REST API at `truthsocial.com/api/v1/`
- **No auth required** for read-only access
- **Monitored accounts:** Trump (`realDonaldTrump`), and potentially other political figures
- **Flow:**
  1. `GET /api/v1/accounts/lookup?acct=realDonaldTrump` → get account ID
  2. `GET /api/v1/accounts/:id/statuses?limit=20` → get recent posts
  3. `event-classifier.ts` scans post content for crypto keywords (bitcoin, crypto, BTC, ETH, etc.)
  4. Matching posts become SignalEvents with `source: 'political'`
- **Rate limit:** ~300 req/5min. Poll every 2-5 minutes.
- **Library:** Direct `fetch` calls (no external dependency needed)

### Live: News RSS Feeds (News events)
- **Feeds:**
  - CoinDesk: `https://www.coindesk.com/arc/outboundfeeds/rss/`
  - Cointelegraph: `https://cointelegraph.com/rss`
  - The Block: `https://www.theblock.co/rss.xml`
  - CNBC Crypto: `https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=33002079`
- **Library:** `rss-parser` (Node.js)
- **Flow:**
  1. Poll each feed every 5 minutes via Next.js API route
  2. Parse title, description, link, pubDate
  3. `event-classifier.ts` scans title/description for coin mentions to tag relevant coins
  4. Matching articles become SignalEvents with `source: 'news'`, `sourceAuthor` = outlet name
- **No auth, no rate limits, completely free**

### Hardcoded: X/Twitter (Crypto Twitter events)
- X API is too expensive ($100/mo minimum) for a hackathon
- 8-10 hardcoded events representing notable crypto Twitter moments
- Examples: Elon tweets about BTC, Vitalik posts about ETH roadmap, Solana Foundation announcements
- Stored in `data/twitter-events.ts`

### Event Classifier (`lib/event-classifier.ts`)
Simple keyword-based classifier that:
1. Scans post/article text for coin keywords to assign `coin` field:
   - BTC: "bitcoin", "btc", "$btc"
   - ETH: "ethereum", "eth", "$eth", "vitalik"
   - SOL: "solana", "sol", "$sol"
   - If no specific coin matched, tag as relevant to all coins
2. Assigns basic sentiment from keyword signals:
   - Bullish: "bullish", "moon", "pump", "rally", "surge", "buy"
   - Bearish: "bearish", "crash", "dump", "sell", "fear", "ban"
   - Neutral: default
3. No AI/ML — just string matching. Fast and predictable.

### Hardcoded Demo Data (non-event)

#### Prices
~100-200 candles per coin (1-hour timeframe), representing roughly a week of data. Realistic price ranges:
- BTC: ~$65,000-$70,000
- ETH: ~$3,400-$3,800
- SOL: ~$140-$180

#### Order Book
5-8 levels each side (bids/asks) per coin. Static, realistic spreads.

## Styling

Dark theme matching Hyperliquid's aesthetic:
- Background: #0b0e11 (main), #12161c (panels/headers)
- Borders: #1e2530
- Text: #eee (primary), #888 (secondary), #666 (muted)
- Green (bullish): #0ecb81
- Red (bearish): #f6465d
- Accent/brand: #f0b90b (gold, for selected coin tab)
- Monospace font for prices/data, sans-serif for labels

## Data Refresh Strategy

- **Server-side caching:** Truth Social and RSS data is fetched server-side in Next.js API routes and cached in-memory (simple Map or module-level variable). Cache TTL: 2 minutes for Truth Social, 5 minutes for RSS.
- **Client polling:** The frontend polls `/api/events` every 60 seconds to pick up new events.
- **No WebSockets needed** — polling is sufficient for the demo cadence.

## Out of Scope (for hackathon)

- Real-time WebSocket streaming
- Trading functionality (placing orders)
- User authentication
- Persistent filter preferences
- Mobile responsive layout
- Multiple timeframe selection
- Additional chart indicators (MA, RSI, etc.)
- AI/ML-based sentiment analysis (keyword matching is sufficient)
- X/Twitter live integration (cost-prohibitive)
