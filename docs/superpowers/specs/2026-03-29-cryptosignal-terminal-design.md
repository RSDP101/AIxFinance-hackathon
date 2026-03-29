# CryptoSignal Terminal — Design Spec

## Overview

A crypto trading terminal (Hyperliquid-inspired) that overlays social media and news events on price charts as colored vertical lines. Users can hover event lines for details and filter by event category and individual source. Market data (candles, ticker) is live via OKX exchange APIs. Event data is currently hardcoded but architected for live integration with Truth Social (Mastodon API) and RSS news feeds.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Backend:** Express.js server with WebSocket support (`ws` library)
- **Charting:** TradingView Lightweight Charts v5
- **Layout:** react-resizable-panels
- **Styling:** Tailwind CSS (dark theme) + CSS custom properties
- **Market Data:** OKX Exchange REST + WebSocket APIs
- **Language:** TypeScript (full stack)

## Supported Coins

BTC, ETH, SOL, TAO — selectable via top bar tabs. OKX trading pairs: `{COIN}-USDT`.

## Project Structure

```
├── app/
│   ├── page.tsx                — Single-page terminal (dynamic import of Terminal)
│   ├── layout.tsx              — Root layout, fonts, global styles
│   └── globals.css             — CSS custom properties, dark theme
├── components/
│   ├── Terminal.tsx             — Main layout, filter state management, panel layout
│   ├── Chart.tsx               — Lightweight Charts + event overlay (LineSeries + markers)
│   ├── OrderBook.tsx           — Mock order book with depth bar visualization
│   ├── TopBar.tsx              — Coin selector, price display, filter toggles + source popover
│   └── EventTooltip.tsx        — Hover popover for event line details
├── hooks/
│   ├── useMarketData.ts        — WebSocket hook for live candles + ticker from Express server
│   └── useNewsFeed.ts          — WebSocket hook for event stream from Express server
├── data/
│   └── orderbook.ts            — Procedurally generated order books (seeded RNG)
├── lib/
│   └── types.ts                — Shared TypeScript types (CatalystEvent, Candle, etc.)
├── server/
│   └── src/
│       ├── index.ts            — Express + WebSocket server setup (port 3001)
│       ├── routes/
│       │   └── market.ts       — REST proxy to OKX (/api/candles, /api/ticker)
│       └── ws/
│           ├── okxProxy.ts     — WebSocket proxy to OKX for live market data
│           └── newsServer.ts   — WebSocket server pushing events to clients
├── server/src/data/
│   └── events.ts               — Hardcoded event data (catalystEvents + upcomingEvents)
└── client/                     — (Legacy Vite-based app, not actively used)
```

## Data Models

### CatalystEvent

```typescript
type EventSource = 'political' | 'news' | 'social'
type CoinId = 'BTC' | 'ETH' | 'SOL' | 'TAO'

interface CatalystEvent {
  id: string
  source: EventSource
  author: string              // e.g. "Elon Musk", "Reuters", "Trump"
  handle: string              // e.g. "@elonmusk", "@reuters"
  avatar: string              // emoji avatar for display
  coin: CoinId
  timestamp: number           // unix seconds
  headline: string
  content: string             // 1-2 sentence description
  platform: string            // e.g. "X", "Truth Social", "CoinDesk"
  url?: string
  priceImpact?: {
    percent: number
    direction: 'up' | 'down'
    windowMinutes: number
  }
  sentiment?: 'bullish' | 'bearish' | 'neutral'
  likes?: number              // social proof metrics
  reposts?: number
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
// Per coin, per category, which specific authors are enabled
type FilterState = Record<CoinId, Record<EventSource, Set<string>>>
```

## Architecture

### Two-Process Setup

1. **Next.js frontend** (port 3000) — renders the terminal UI, connects to Express server
2. **Express backend** (port 3001) — proxies OKX APIs, streams events via WebSocket

### Data Flow

```
OKX REST API ──→ Express /api/candles, /api/ticker ──→ Next.js client (initial load)
OKX WebSocket ──→ Express /ws/market proxy ──→ Next.js client (live updates)
Hardcoded events ──→ Express /ws/news ──→ Next.js client (event stream)
```

### WebSocket Channels

- **`/ws/market`** — proxies OKX WebSocket for live ticker + candle updates. Client sends `{ type: 'subscribe', coin: 'BTC' }` to switch coins.
- **`/ws/news`** — streams CatalystEvents to clients. On connection, sends all historical `catalystEvents`. Then pushes `upcomingEvents` one at a time every 10-18 seconds to simulate a live feed.

### REST Endpoints (Express server)

- `GET /api/candles?coin=BTC&bar=1m&limit=300` — fetches OHLCV from OKX
- `GET /api/ticker?coin=BTC` — fetches current price + 24h change from OKX

## Layout

Single page, three zones:

1. **Top bar** (fixed height, ~48px)
   - Left: App name ("CryptoSignal"), coin selector tabs (BTC/ETH/SOL/TAO)
   - Center-right: Current price + 24h change
   - Right: Three category filter toggles (Political / News / Social) — each is a pill button, filled when active. Clicking opens a dropdown popover with checkboxes for individual sources within that category.

2. **Chart panel** (~70% width, resizable)
   - TradingView Lightweight Charts rendering live candlestick data
   - Volume histogram below candles
   - Event overlay: colored LineSeries for vertical lines + arrow markers
   - Hover on event line area shows EventTooltip popover

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
- Uses Lightweight Charts `LineSeries` for vertical lines and `createSeriesMarkers` for arrow markers
- Color coding:
  - Political: #FF9800 (orange)
  - News: #2196F3 (blue)
  - Social: #9C27B0 (purple)

### Hover Tooltip (EventTooltip)
Positioned popover that appears on hover, showing:
- Source category icon + label (colored)
- Headline (bold)
- Author + handle
- Timestamp (formatted)
- Content text (1-2 sentences)
- Price impact line: e.g. "↑ +2.1% in 1hr" (green/red colored)
- Social proof metrics (likes, reposts) when available

### Two-Level Filtering
1. **Category toggles** in top bar — toggle entire categories on/off
2. **Source filter popover** — click a category toggle to open dropdown with checkboxes for individual authors within that category
3. Filter state is **per-coin** — switching coins restores that coin's filter state
4. Default: all sources enabled
5. Filtering is performed **client-side** in Terminal.tsx

## Data Sources

### Live: Market Data (OKX Exchange)
- **Candles:** REST endpoint fetches last 300 1-minute candles on load; WebSocket streams updates
- **Ticker:** REST endpoint for initial price; WebSocket for live updates
- **Proxied through Express** to avoid CORS issues

### Hardcoded: Events (all categories currently)
- **14 historical `catalystEvents`** spanning political, news, and social categories
- **8 `upcomingEvents`** queued to push every 10-18 seconds (simulates live feed)
- Stored in `server/src/data/events.ts`
- Each event has pre-assigned coin, sentiment, priceImpact, and social metrics

### Hardcoded: Order Book
- Procedurally generated in `data/orderbook.ts` using seeded PRNG (mulberry32)
- Deterministic across server/client renders
- Realistic spreads and depth per coin

## Future Data Sources (Not Yet Implemented)

### Truth Social (Political events)
- **API:** Mastodon-compatible REST API at `truthsocial.com/api/v1/`
- **No auth required** for read-only access
- **Monitored accounts:** Trump (`realDonaldTrump`), other political figures
- **Flow:** lookup account → fetch statuses → classify for crypto keywords → emit as CatalystEvent
- **Rate limit:** ~300 req/5min

### News RSS Feeds
- **Feeds:** CoinDesk, Cointelegraph, The Block, CNBC Crypto
- **Library:** `rss-parser` (Node.js)
- **Flow:** poll feeds every 5 min → parse title/description → classify by coin mention → emit as CatalystEvent
- **Free, no auth, no rate limits**

### Event Classifier (needed for live sources)
Simple keyword-based classifier to:
1. Tag coins from content: "bitcoin"→BTC, "ethereum"→ETH, "solana"→SOL, etc.
2. Assign sentiment from keyword signals (bullish/bearish/neutral)
3. No AI/ML — just string matching

### X/Twitter
- Not planned for hackathon (API costs $100+/mo minimum)
- Hardcoded events serve as demo data

## Styling

Dark theme matching Hyperliquid's aesthetic, implemented via CSS custom properties:
- `--bg-main`: #0b0e11
- `--bg-panel`: #12161c
- `--border`: #1e2530
- `--text-primary`: #eee
- `--text-secondary`: #888
- `--text-muted`: #666
- `--green` (bullish): #0ecb81
- `--red` (bearish): #f6465d
- `--accent` (brand): #f0b90b (gold, for selected coin tab)
- Monospace font for prices/data, sans-serif for labels

## Out of Scope (for hackathon)

- Trading functionality (placing orders)
- User authentication
- Persistent filter preferences
- Mobile responsive layout
- Multiple timeframe selection
- Additional chart indicators (MA, RSI, etc.)
- AI/ML-based sentiment analysis
- X/Twitter live integration (cost-prohibitive)
- REST API for events (currently WebSocket only)
