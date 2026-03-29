# CryptoSignal Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a crypto trading terminal that overlays social/news events on candlestick charts with filtering, using hardcoded demo data.

**Architecture:** Next.js 14 App Router single-page app. Chart panel (TradingView Lightweight Charts) + order book panel (react-resizable-panels). Event overlay system renders filtered vertical lines on the chart with hover tooltips. REST API endpoint serves event data from hardcoded sources.

**Tech Stack:** Next.js 14, TypeScript, TradingView Lightweight Charts, react-resizable-panels, Tailwind CSS

---

## File Structure

```
app/
  page.tsx                — Single-page terminal (renders <Terminal />)
  layout.tsx              — Root layout, fonts, global styles, Tailwind
  globals.css             — Tailwind directives + dark theme custom styles
  api/events/route.ts     — REST API for event data
components/
  Terminal.tsx             — Main layout with resizable panels
  Chart.tsx               — Lightweight Charts + event overlay rendering
  OrderBook.tsx            — Mock order book with bid/ask depth bars
  TopBar.tsx               — Coin selector, price display, event filter toggles
  EventTooltip.tsx         — Hover popover for event line details
  SourceFilterPopover.tsx  — Dropdown with per-source checkboxes
data/
  prices.ts               — Hardcoded OHLCV data per coin
  orderbook.ts            — Hardcoded bid/ask levels per coin
  events.ts               — Hardcoded SignalEvent[] with ~15-20 events
lib/
  types.ts                — Shared TypeScript types
```

---

### Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.ts`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`

- [ ] **Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/owenyang/Documents/AIxFinance-hackathon
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --no-turbopack
```

When prompted about overwriting files, say yes. This creates the standard Next.js 14 scaffold with Tailwind already configured.

- [ ] **Step 2: Install additional dependencies**

Run:
```bash
npm install lightweight-charts react-resizable-panels
```

- [ ] **Step 3: Configure dark theme in globals.css**

Replace `app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-main: #0b0e11;
  --bg-panel: #12161c;
  --border: #1e2530;
  --text-primary: #eeeeee;
  --text-secondary: #888888;
  --text-muted: #666666;
  --green: #0ecb81;
  --red: #f6465d;
  --accent: #f0b90b;
  --event-political: #FF9800;
  --event-news: #2196F3;
  --event-crypto-twitter: #9C27B0;
}

body {
  background-color: var(--bg-main);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

/* Monospace for prices/data */
.font-mono {
  font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
}
```

- [ ] **Step 4: Configure layout.tsx**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CryptoSignal Terminal',
  description: 'Crypto trading terminal with social signal overlay',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="h-screen w-screen overflow-hidden">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Create placeholder page**

Replace `app/page.tsx` with:

```tsx
export default function Home() {
  return (
    <div className="h-screen flex items-center justify-center text-[var(--text-secondary)]">
      CryptoSignal Terminal — Loading...
    </div>
  )
}
```

- [ ] **Step 6: Verify dev server starts**

Run:
```bash
npm run dev &
sleep 3
curl -s http://localhost:3000 | head -20
kill %1
```

Expected: HTML response containing "CryptoSignal Terminal"

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 14 project with Tailwind dark theme"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create shared types**

Create `lib/types.ts`:

```typescript
export type EventSource = 'political' | 'news' | 'crypto_twitter'

export type CoinId = 'BTC' | 'ETH' | 'SOL'

export interface SignalEvent {
  id: string
  source: EventSource
  sourceAuthor: string
  sourceHandle?: string
  coin: CoinId
  timestamp: number
  headline: string
  summary: string
  url?: string
  priceImpact?: {
    percent: number
    direction: 'up' | 'down'
    windowMinutes: number
  }
  sentiment?: 'bullish' | 'bearish' | 'neutral'
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OrderBookLevel {
  price: number
  size: number
  total: number
}

export interface OrderBook {
  asks: OrderBookLevel[]
  bids: OrderBookLevel[]
}

export type FilterState = Record<CoinId, Record<EventSource, Set<string>>>

export const EVENT_COLORS: Record<EventSource, string> = {
  political: '#FF9800',
  news: '#2196F3',
  crypto_twitter: '#9C27B0',
}

export const EVENT_LABELS: Record<EventSource, string> = {
  political: 'Political',
  news: 'News',
  crypto_twitter: 'Crypto Twitter',
}

export const COINS: CoinId[] = ['BTC', 'ETH', 'SOL']
```

- [ ] **Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit lib/types.ts
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared TypeScript types for events, candles, order book"
```

---

### Task 3: Hardcoded Demo Data — Prices

**Files:**
- Create: `data/prices.ts`

- [ ] **Step 1: Create BTC price data**

Create `data/prices.ts`. We generate ~168 candles (7 days of hourly data) per coin. Starting timestamp: `1711929600` (April 1, 2024 00:00 UTC). Each candle is 3600 seconds apart.

```typescript
import { Candle, CoinId } from '@/lib/types'

// Helper to generate realistic candle data
function generateCandles(
  startPrice: number,
  count: number,
  startTime: number,
  volatility: number
): Candle[] {
  const candles: Candle[] = []
  let price = startPrice

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * volatility * price
    const open = price
    const close = price + change
    const high = Math.max(open, close) + Math.random() * volatility * price * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * price * 0.5
    const volume = Math.round(100 + Math.random() * 900)

    candles.push({
      time: startTime + i * 3600,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    })
    price = close
  }
  return candles
}

const START_TIME = 1711929600 // April 1, 2024 00:00 UTC
const CANDLE_COUNT = 168 // 7 days hourly

// Pre-seed with deterministic data by using fixed random sequences
// For the hackathon demo, we regenerate on module load — this is fine
export const priceData: Record<CoinId, Candle[]> = {
  BTC: generateCandles(67500, CANDLE_COUNT, START_TIME, 0.003),
  ETH: generateCandles(3550, CANDLE_COUNT, START_TIME, 0.004),
  SOL: generateCandles(160, CANDLE_COUNT, START_TIME, 0.006),
}
```

- [ ] **Step 2: Verify import works**

Run:
```bash
npx tsx -e "import { priceData } from './data/prices'; console.log('BTC candles:', priceData.BTC.length, 'First:', JSON.stringify(priceData.BTC[0]))"
```

Expected: Shows 168 candles with a BTC price around $67,500

- [ ] **Step 3: Commit**

```bash
git add data/prices.ts
git commit -m "feat: add hardcoded OHLCV price data for BTC, ETH, SOL"
```

---

### Task 4: Hardcoded Demo Data — Order Book

**Files:**
- Create: `data/orderbook.ts`

- [ ] **Step 1: Create order book data**

Create `data/orderbook.ts`:

```typescript
import { OrderBook, CoinId } from '@/lib/types'

function generateOrderBook(midPrice: number, spreadPercent: number, levels: number): OrderBook {
  const halfSpread = midPrice * spreadPercent / 200
  const asks = []
  const bids = []
  let askTotal = 0
  let bidTotal = 0

  for (let i = 0; i < levels; i++) {
    const askSize = Math.round((0.1 + Math.random() * 2) * 1000) / 1000
    askTotal += askSize
    asks.push({
      price: Math.round((midPrice + halfSpread + i * midPrice * 0.0005) * 100) / 100,
      size: askSize,
      total: Math.round(askTotal * 1000) / 1000,
    })

    const bidSize = Math.round((0.1 + Math.random() * 2) * 1000) / 1000
    bidTotal += bidSize
    bids.push({
      price: Math.round((midPrice - halfSpread - i * midPrice * 0.0005) * 100) / 100,
      size: bidSize,
      total: Math.round(bidTotal * 1000) / 1000,
    })
  }

  return { asks, bids }
}

export const orderBookData: Record<CoinId, OrderBook> = {
  BTC: generateOrderBook(67800, 0.02, 8),
  ETH: generateOrderBook(3580, 0.03, 8),
  SOL: generateOrderBook(162, 0.05, 8),
}
```

- [ ] **Step 2: Verify import works**

Run:
```bash
npx tsx -e "import { orderBookData } from './data/orderbook'; console.log('BTC asks:', orderBookData.BTC.asks.length, 'bids:', orderBookData.BTC.bids.length)"
```

Expected: 8 asks, 8 bids

- [ ] **Step 3: Commit**

```bash
git add data/orderbook.ts
git commit -m "feat: add hardcoded order book data for BTC, ETH, SOL"
```

---

### Task 5: Hardcoded Demo Data — Events

**Files:**
- Create: `data/events.ts`

- [ ] **Step 1: Create event data**

Create `data/events.ts`. Events are timestamped to align with candles (using `START_TIME + N * 3600`):

```typescript
import { SignalEvent } from '@/lib/types'

const START_TIME = 1711929600 // Must match prices.ts

export const eventData: SignalEvent[] = [
  // === BTC Events ===
  {
    id: 'evt-1',
    source: 'political',
    sourceAuthor: 'Donald Trump',
    sourceHandle: '@realDonaldTrump',
    coin: 'BTC',
    timestamp: START_TIME + 12 * 3600,
    headline: 'Trump posts pro-Bitcoin statement on Truth Social',
    summary: 'Former president declares Bitcoin is "the future of American finance" and pledges crypto-friendly policies if elected.',
    priceImpact: { percent: 3.2, direction: 'up', windowMinutes: 120 },
    sentiment: 'bullish',
  },
  {
    id: 'evt-2',
    source: 'crypto_twitter',
    sourceAuthor: 'Elon Musk',
    sourceHandle: '@elonmusk',
    coin: 'BTC',
    timestamp: START_TIME + 30 * 3600,
    headline: 'Musk hints at Tesla BTC payment revival',
    summary: 'Elon Musk tweets a Bitcoin emoji with lightning bolt, sparking speculation Tesla may re-enable BTC payments.',
    priceImpact: { percent: 2.1, direction: 'up', windowMinutes: 60 },
    sentiment: 'bullish',
  },
  {
    id: 'evt-3',
    source: 'news',
    sourceAuthor: 'Reuters',
    sourceHandle: '@Reuters',
    coin: 'BTC',
    timestamp: START_TIME + 48 * 3600,
    headline: 'Fed holds rates steady, signals patience',
    summary: 'Federal Reserve keeps interest rates unchanged. Powell signals no rush to cut, but acknowledges disinflation progress.',
    priceImpact: { percent: 1.5, direction: 'up', windowMinutes: 240 },
    sentiment: 'bullish',
  },
  {
    id: 'evt-4',
    source: 'news',
    sourceAuthor: 'CoinDesk',
    sourceHandle: '@CoinDesk',
    coin: 'BTC',
    timestamp: START_TIME + 72 * 3600,
    headline: 'BlackRock BTC ETF sees record inflows',
    summary: 'iShares Bitcoin Trust (IBIT) records $780M in single-day inflows, the highest since launch.',
    priceImpact: { percent: 2.8, direction: 'up', windowMinutes: 180 },
    sentiment: 'bullish',
  },
  {
    id: 'evt-5',
    source: 'political',
    sourceAuthor: 'Elizabeth Warren',
    sourceHandle: '@SenWarren',
    coin: 'BTC',
    timestamp: START_TIME + 100 * 3600,
    headline: 'Warren introduces new crypto regulation bill',
    summary: 'Senator Warren proposes the Digital Asset Anti-Money Laundering Act, requiring stricter KYC for DeFi protocols.',
    priceImpact: { percent: 1.8, direction: 'down', windowMinutes: 120 },
    sentiment: 'bearish',
  },
  {
    id: 'evt-6',
    source: 'crypto_twitter',
    sourceAuthor: 'Michael Saylor',
    sourceHandle: '@saylor',
    coin: 'BTC',
    timestamp: START_TIME + 120 * 3600,
    headline: 'MicroStrategy buys another 12,000 BTC',
    summary: 'Michael Saylor announces MicroStrategy has acquired an additional 12,000 BTC for $820 million, total holdings now 205,000 BTC.',
    priceImpact: { percent: 1.9, direction: 'up', windowMinutes: 60 },
    sentiment: 'bullish',
  },

  // === ETH Events ===
  {
    id: 'evt-7',
    source: 'political',
    sourceAuthor: 'Gary Gensler',
    sourceHandle: '@GaryGensler',
    coin: 'ETH',
    timestamp: START_TIME + 18 * 3600,
    headline: 'SEC chair signals openness to ETH ETF approval',
    summary: 'In congressional testimony, Gensler acknowledges Ethereum staking mechanism and hints at potential spot ETH ETF approval timeline.',
    priceImpact: { percent: 4.5, direction: 'up', windowMinutes: 180 },
    sentiment: 'bullish',
  },
  {
    id: 'evt-8',
    source: 'crypto_twitter',
    sourceAuthor: 'Vitalik Buterin',
    sourceHandle: '@VitalikButerin',
    coin: 'ETH',
    timestamp: START_TIME + 42 * 3600,
    headline: 'Vitalik outlines ETH scaling roadmap update',
    summary: 'Vitalik publishes blog post detailing "The Surge" phase progress, predicting 100k TPS on L2s by end of year.',
    priceImpact: { percent: 2.3, direction: 'up', windowMinutes: 120 },
    sentiment: 'bullish',
  },
  {
    id: 'evt-9',
    source: 'news',
    sourceAuthor: 'Bloomberg',
    sourceHandle: '@Bloomberg',
    coin: 'ETH',
    timestamp: START_TIME + 65 * 3600,
    headline: 'Ethereum gas fees hit 6-month low',
    summary: 'Average Ethereum gas fees drop to 8 gwei as Dencun upgrade and L2 adoption reduce mainnet congestion significantly.',
    priceImpact: { percent: 1.2, direction: 'up', windowMinutes: 60 },
    sentiment: 'bullish',
  },
  {
    id: 'evt-10',
    source: 'news',
    sourceAuthor: 'The Block',
    sourceHandle: '@TheBlock__',
    coin: 'ETH',
    timestamp: START_TIME + 90 * 3600,
    headline: 'Major DeFi protocol hacked for $45M on Ethereum',
    summary: 'A reentrancy exploit drains $45M from a top-10 DeFi lending protocol. Team pauses contracts and begins investigation.',
    priceImpact: { percent: 3.1, direction: 'down', windowMinutes: 60 },
    sentiment: 'bearish',
  },
  {
    id: 'evt-11',
    source: 'political',
    sourceAuthor: 'EU Parliament',
    coin: 'ETH',
    timestamp: START_TIME + 130 * 3600,
    headline: 'EU finalizes MiCA stablecoin regulations',
    summary: 'European Parliament passes final MiCA implementation rules for stablecoins, creating clearer framework for DeFi protocols on Ethereum.',
    priceImpact: { percent: 1.0, direction: 'up', windowMinutes: 240 },
    sentiment: 'neutral',
  },

  // === SOL Events ===
  {
    id: 'evt-12',
    source: 'news',
    sourceAuthor: 'Reuters',
    sourceHandle: '@Reuters',
    coin: 'SOL',
    timestamp: START_TIME + 24 * 3600,
    headline: 'Solana DeFi TVL surpasses $8B milestone',
    summary: 'Reuters reports Solana ecosystem total value locked reaches all-time high, driven by Jupiter DEX and Marinade Finance growth.',
    priceImpact: { percent: 3.5, direction: 'up', windowMinutes: 120 },
    sentiment: 'bullish',
  },
  {
    id: 'evt-13',
    source: 'crypto_twitter',
    sourceAuthor: 'Solana Foundation',
    sourceHandle: '@SolanaFndn',
    coin: 'SOL',
    timestamp: START_TIME + 55 * 3600,
    headline: 'Solana Foundation announces $100M ecosystem fund',
    summary: 'New developer grant program targets AI x DeFi integrations and mobile-first applications on Solana.',
    priceImpact: { percent: 2.7, direction: 'up', windowMinutes: 180 },
    sentiment: 'bullish',
  },
  {
    id: 'evt-14',
    source: 'news',
    sourceAuthor: 'CoinDesk',
    sourceHandle: '@CoinDesk',
    coin: 'SOL',
    timestamp: START_TIME + 80 * 3600,
    headline: 'Solana network experiences 2-hour outage',
    summary: 'Solana mainnet halts block production for approximately 2 hours due to a consensus bug. Validators coordinate restart.',
    priceImpact: { percent: 5.2, direction: 'down', windowMinutes: 60 },
    sentiment: 'bearish',
  },
  {
    id: 'evt-15',
    source: 'crypto_twitter',
    sourceAuthor: 'Anatoly Yakovenko',
    sourceHandle: '@aaboronkov',
    coin: 'SOL',
    timestamp: START_TIME + 95 * 3600,
    headline: 'Yakovenko teases Firedancer mainnet timeline',
    summary: 'Solana co-founder shares Firedancer validator client benchmark showing 600k TPS in testnet, hints at Q3 mainnet deployment.',
    priceImpact: { percent: 4.1, direction: 'up', windowMinutes: 120 },
    sentiment: 'bullish',
  },
  {
    id: 'evt-16',
    source: 'political',
    sourceAuthor: 'SEC',
    coin: 'SOL',
    timestamp: START_TIME + 110 * 3600,
    headline: 'SEC drops Solana from securities classification list',
    summary: 'In an amended filing, the SEC removes SOL from its list of tokens it considers securities, a major regulatory win.',
    priceImpact: { percent: 6.8, direction: 'up', windowMinutes: 240 },
    sentiment: 'bullish',
  },
  {
    id: 'evt-17',
    source: 'news',
    sourceAuthor: 'Bloomberg',
    sourceHandle: '@Bloomberg',
    coin: 'SOL',
    timestamp: START_TIME + 140 * 3600,
    headline: 'Visa expands USDC settlements to Solana',
    summary: 'Visa announces Solana as second blockchain for USDC payment settlements, alongside Ethereum. Live pilot with select merchants.',
    priceImpact: { percent: 3.9, direction: 'up', windowMinutes: 180 },
    sentiment: 'bullish',
  },
]
```

- [ ] **Step 2: Verify data loads**

Run:
```bash
npx tsx -e "import { eventData } from './data/events'; console.log('Events:', eventData.length); const coins = new Set(eventData.map(e => e.coin)); console.log('Coins:', [...coins]); const sources = new Set(eventData.map(e => e.source)); console.log('Sources:', [...sources])"
```

Expected: 17 events, 3 coins, 3 sources

- [ ] **Step 3: Commit**

```bash
git add data/events.ts
git commit -m "feat: add hardcoded signal events for BTC, ETH, SOL demo"
```

---

### Task 6: API Endpoint

**Files:**
- Create: `app/api/events/route.ts`

- [ ] **Step 1: Create the events API route**

Create `app/api/events/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { eventData } from '@/data/events'
import { CoinId, EventSource } from '@/lib/types'

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const coin = params.get('coin') as CoinId | null
  const source = params.get('source') as EventSource | null
  const author = params.get('author')
  const from = params.get('from')
  const to = params.get('to')

  if (!coin) {
    return NextResponse.json(
      { error: 'coin parameter is required' },
      { status: 400 }
    )
  }

  let events = eventData.filter((e) => e.coin === coin)

  if (source) {
    events = events.filter((e) => e.source === source)
  }
  if (author) {
    events = events.filter((e) => e.sourceAuthor === author)
  }
  if (from) {
    events = events.filter((e) => e.timestamp >= Number(from))
  }
  if (to) {
    events = events.filter((e) => e.timestamp <= Number(to))
  }

  const sources = [...new Set(events.map((e) => e.source))]

  return NextResponse.json({
    events,
    meta: {
      coin,
      count: events.length,
      sources,
    },
  })
}
```

- [ ] **Step 2: Test the API endpoint**

Run:
```bash
npm run dev &
sleep 3
curl -s "http://localhost:3000/api/events?coin=BTC" | npx -y json
kill %1
```

Expected: JSON with BTC events and meta object

- [ ] **Step 3: Commit**

```bash
git add app/api/events/route.ts
git commit -m "feat: add REST API endpoint for event data"
```

---

### Task 7: TopBar Component

**Files:**
- Create: `components/TopBar.tsx`

- [ ] **Step 1: Create the TopBar component**

Create `components/TopBar.tsx`:

```tsx
'use client'

import { CoinId, EventSource, FilterState, COINS, EVENT_COLORS, EVENT_LABELS } from '@/lib/types'
import { useState, useRef, useEffect } from 'react'

interface TopBarProps {
  selectedCoin: CoinId
  onCoinChange: (coin: CoinId) => void
  currentPrice: number
  priceChange24h: number
  filterState: FilterState
  onFilterChange: (filterState: FilterState) => void
  allAuthors: Record<EventSource, string[]>
}

export default function TopBar({
  selectedCoin,
  onCoinChange,
  currentPrice,
  priceChange24h,
  filterState,
  onFilterChange,
  allAuthors,
}: TopBarProps) {
  const [openPopover, setOpenPopover] = useState<EventSource | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopover(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const coinFilter = filterState[selectedCoin]

  function isCategoryActive(source: EventSource): boolean {
    return coinFilter[source].size > 0
  }

  function toggleCategory(source: EventSource) {
    const newFilter = { ...filterState }
    const current = coinFilter[source]
    const all = allAuthors[source]

    if (current.size === all.length) {
      // All enabled -> disable all
      newFilter[selectedCoin] = {
        ...coinFilter,
        [source]: new Set<string>(),
      }
    } else {
      // Some or none enabled -> enable all
      newFilter[selectedCoin] = {
        ...coinFilter,
        [source]: new Set(all),
      }
    }
    onFilterChange(newFilter)
  }

  function toggleAuthor(source: EventSource, author: string) {
    const newFilter = { ...filterState }
    const newSet = new Set(coinFilter[source])
    if (newSet.has(author)) {
      newSet.delete(author)
    } else {
      newSet.add(author)
    }
    newFilter[selectedCoin] = {
      ...coinFilter,
      [source]: newSet,
    }
    onFilterChange(newFilter)
  }

  function handleCategoryClick(source: EventSource) {
    if (openPopover === source) {
      setOpenPopover(null)
    } else {
      setOpenPopover(source)
    }
  }

  const changeColor = priceChange24h >= 0 ? 'var(--green)' : 'var(--red)'
  const changeSign = priceChange24h >= 0 ? '+' : ''

  return (
    <div
      className="flex items-center justify-between px-4 h-12 border-b"
      style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}
    >
      {/* Left: Logo + Coin tabs */}
      <div className="flex items-center gap-4">
        <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>
          CryptoSignal
        </span>
        <div className="flex gap-1">
          {COINS.map((coin) => (
            <button
              key={coin}
              onClick={() => onCoinChange(coin)}
              className="px-3 py-1 text-xs font-bold rounded transition-colors"
              style={{
                backgroundColor:
                  selectedCoin === coin ? 'var(--accent)' : 'transparent',
                color:
                  selectedCoin === coin ? '#0b0e11' : 'var(--text-secondary)',
              }}
            >
              {coin}
            </button>
          ))}
        </div>
      </div>

      {/* Center-right: Price */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-bold">
          ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="font-mono text-xs" style={{ color: changeColor }}>
          {changeSign}{priceChange24h.toFixed(2)}%
        </span>
      </div>

      {/* Right: Filter toggles */}
      <div className="flex items-center gap-2 relative" ref={popoverRef}>
        {(['political', 'news', 'crypto_twitter'] as EventSource[]).map((source) => {
          const active = isCategoryActive(source)
          return (
            <div key={source} className="relative">
              <button
                onClick={() => handleCategoryClick(source)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  toggleCategory(source)
                }}
                className="px-3 py-1 text-xs font-medium rounded-full border transition-colors"
                style={{
                  backgroundColor: active ? EVENT_COLORS[source] + '20' : 'transparent',
                  borderColor: active ? EVENT_COLORS[source] : 'var(--border)',
                  color: active ? EVENT_COLORS[source] : 'var(--text-muted)',
                }}
              >
                {EVENT_LABELS[source]}
              </button>

              {openPopover === source && (
                <div
                  className="absolute top-full right-0 mt-1 py-2 px-3 rounded-lg shadow-xl z-50 min-w-[200px]"
                  style={{
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="text-xs font-medium" style={{ color: EVENT_COLORS[source] }}>
                      {EVENT_LABELS[source]}
                    </span>
                    <button
                      onClick={() => toggleCategory(source)}
                      className="text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {coinFilter[source].size === allAuthors[source].length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  {allAuthors[source].map((author) => (
                    <label
                      key={author}
                      className="flex items-center gap-2 py-1 cursor-pointer text-xs"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <input
                        type="checkbox"
                        checked={coinFilter[source].has(author)}
                        onChange={() => toggleAuthor(source, author)}
                        className="rounded"
                        style={{ accentColor: EVENT_COLORS[source] }}
                      />
                      {author}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/TopBar.tsx
git commit -m "feat: add TopBar with coin selector and event filter toggles"
```

---

### Task 8: OrderBook Component

**Files:**
- Create: `components/OrderBook.tsx`

- [ ] **Step 1: Create the OrderBook component**

Create `components/OrderBook.tsx`:

```tsx
'use client'

import { OrderBook as OrderBookType, EventSource, EVENT_COLORS, EVENT_LABELS } from '@/lib/types'

interface OrderBookProps {
  data: OrderBookType
  currentPrice: number
}

export default function OrderBook({ data, currentPrice }: OrderBookProps) {
  const maxTotal = Math.max(
    data.asks[data.asks.length - 1]?.total ?? 0,
    data.bids[data.bids.length - 1]?.total ?? 0
  )

  const spread = data.asks[0] && data.bids[0]
    ? data.asks[0].price - data.bids[0].price
    : 0
  const spreadPercent = currentPrice > 0 ? (spread / currentPrice) * 100 : 0

  return (
    <div
      className="flex flex-col h-full text-xs"
      style={{ backgroundColor: 'var(--bg-panel)' }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 font-bold text-xs tracking-wider border-b"
        style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
      >
        ORDER BOOK
      </div>

      {/* Column headers */}
      <div
        className="grid grid-cols-3 px-3 py-1 text-right border-b"
        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
      >
        <span>Price (USDT)</span>
        <span>Size</span>
        <span>Total</span>
      </div>

      {/* Asks (reversed so lowest ask is at bottom, nearest to spread) */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end px-1">
        {[...data.asks].reverse().map((level, i) => (
          <div key={`ask-${i}`} className="relative grid grid-cols-3 px-2 py-[2px] text-right font-mono">
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundColor: 'var(--red)',
                width: `${(level.total / maxTotal) * 100}%`,
                right: 0,
                left: 'auto',
              }}
            />
            <span style={{ color: 'var(--red)' }}>{level.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span style={{ color: 'var(--text-primary)' }}>{level.size.toFixed(3)}</span>
            <span style={{ color: 'var(--text-secondary)' }}>{level.total.toFixed(3)}</span>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div
        className="px-3 py-2 text-center font-mono border-y"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
          ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
        <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
          Spread: {spread.toFixed(2)} ({spreadPercent.toFixed(3)}%)
        </span>
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-hidden px-1">
        {data.bids.map((level, i) => (
          <div key={`bid-${i}`} className="relative grid grid-cols-3 px-2 py-[2px] text-right font-mono">
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundColor: 'var(--green)',
                width: `${(level.total / maxTotal) * 100}%`,
                right: 0,
                left: 'auto',
              }}
            />
            <span style={{ color: 'var(--green)' }}>{level.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span style={{ color: 'var(--text-primary)' }}>{level.size.toFixed(3)}</span>
            <span style={{ color: 'var(--text-secondary)' }}>{level.total.toFixed(3)}</span>
          </div>
        ))}
      </div>

      {/* Event Legend */}
      <div
        className="px-3 py-2 border-t flex flex-wrap gap-3"
        style={{ borderColor: 'var(--border)' }}
      >
        {(['political', 'news', 'crypto_twitter'] as EventSource[]).map((source) => (
          <div key={source} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: EVENT_COLORS[source] }}
            />
            <span style={{ color: 'var(--text-muted)' }} className="text-[10px]">
              {EVENT_LABELS[source]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/OrderBook.tsx
git commit -m "feat: add OrderBook component with depth bars and event legend"
```

---

### Task 9: EventTooltip Component

**Files:**
- Create: `components/EventTooltip.tsx`

- [ ] **Step 1: Create the EventTooltip component**

Create `components/EventTooltip.tsx`:

```tsx
'use client'

import { SignalEvent, EVENT_COLORS, EVENT_LABELS } from '@/lib/types'

interface EventTooltipProps {
  event: SignalEvent
  x: number
  y: number
}

export default function EventTooltip({ event, x, y }: EventTooltipProps) {
  const color = EVENT_COLORS[event.source]

  const impactColor =
    event.priceImpact?.direction === 'up' ? 'var(--green)' : 'var(--red)'
  const impactArrow = event.priceImpact?.direction === 'up' ? '↑' : '↓'
  const impactSign = event.priceImpact?.direction === 'up' ? '+' : '-'

  const windowLabel = event.priceImpact
    ? event.priceImpact.windowMinutes >= 60
      ? `${event.priceImpact.windowMinutes / 60}hr`
      : `${event.priceImpact.windowMinutes}min`
    : ''

  const date = new Date(event.timestamp * 1000)
  const formattedTime = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return (
    <div
      className="absolute z-50 pointer-events-none rounded-lg shadow-2xl p-3 max-w-[280px]"
      style={{
        left: x + 12,
        top: y - 20,
        backgroundColor: 'var(--bg-panel)',
        border: `1px solid ${color}40`,
      }}
    >
      {/* Source label */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-medium uppercase" style={{ color }}>
          {EVENT_LABELS[event.source]}
        </span>
      </div>

      {/* Headline */}
      <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        {event.headline}
      </div>

      {/* Author + time */}
      <div className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>
        {event.sourceAuthor}
        {event.sourceHandle && (
          <span style={{ color: 'var(--text-secondary)' }}> {event.sourceHandle}</span>
        )}
        <span className="ml-2">{formattedTime}</span>
      </div>

      {/* Summary */}
      <div className="text-[11px] mb-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {event.summary}
      </div>

      {/* Price impact */}
      {event.priceImpact && (
        <div className="text-xs font-mono font-bold" style={{ color: impactColor }}>
          {impactArrow} {impactSign}{event.priceImpact.percent.toFixed(1)}% in {windowLabel}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/EventTooltip.tsx
git commit -m "feat: add EventTooltip popover component"
```

---

### Task 10: Chart Component with Event Overlay

**Files:**
- Create: `components/Chart.tsx`

This is the most complex component. It renders TradingView Lightweight Charts, adds volume histogram, and overlays event vertical lines with hover tooltips.

- [ ] **Step 1: Create the Chart component**

Create `components/Chart.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  Time,
  LineStyle,
  SeriesMarker,
} from 'lightweight-charts'
import { Candle, SignalEvent, EVENT_COLORS } from '@/lib/types'
import EventTooltip from './EventTooltip'

interface ChartProps {
  candles: Candle[]
  events: SignalEvent[]
}

export default function Chart({ candles, events }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const eventLineSeriesRef = useRef<ISeriesApi<'Line'>[]>([])
  const [tooltip, setTooltip] = useState<{ event: SignalEvent; x: number; y: number } | null>(null)

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0b0e11' },
        textColor: '#888',
      },
      grid: {
        vertLines: { color: '#1e253020' },
        horzLines: { color: '#1e253020' },
      },
      crosshair: {
        vertLine: { color: '#666', width: 1, style: LineStyle.Dashed },
        horzLine: { color: '#666', width: 1, style: LineStyle.Dashed },
      },
      timeScale: {
        borderColor: '#1e2530',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1e2530',
      },
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderUpColor: '#0ecb81',
      borderDownColor: '#f6465d',
      wickUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
    })

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      eventLineSeriesRef.current = []
    }
  }, [])

  // Update candle + volume data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return

    const candleData: CandlestickData[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    const volumeData: HistogramData[] = candles.map((c) => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? '#0ecb8130' : '#f6465d30',
    }))

    candleSeriesRef.current.setData(candleData)
    volumeSeriesRef.current.setData(volumeData)
  }, [candles])

  // Update event overlays
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return

    // Remove old event line series
    eventLineSeriesRef.current.forEach((series) => {
      try {
        chartRef.current?.removeSeries(series)
      } catch {
        // series may already be removed
      }
    })
    eventLineSeriesRef.current = []

    // Add markers to candle series for event labels
    const markers: SeriesMarker<Time>[] = events
      .map((evt) => ({
        time: evt.timestamp as Time,
        position: 'aboveBar' as const,
        color: EVENT_COLORS[evt.source],
        shape: 'arrowDown' as const,
        text: evt.headline.slice(0, 20) + (evt.headline.length > 20 ? '...' : ''),
      }))
      .sort((a, b) => (a.time as number) - (b.time as number))

    candleSeriesRef.current.setMarkers(markers)

    // Add vertical line series for each event
    events.forEach((evt) => {
      if (!chartRef.current) return
      const color = EVENT_COLORS[evt.source]

      const lineSeries = chartRef.current.addLineSeries({
        color: color + '60',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })

      // Create a vertical-ish line by setting two points at the event time
      const candle = candles.find((c) => c.time === evt.timestamp)
      if (candle) {
        lineSeries.setData([
          { time: evt.timestamp as Time, value: candle.low * 0.999 },
        ])
      }

      eventLineSeriesRef.current.push(lineSeries)
    })
  }, [events, candles])

  // Tooltip on crosshair move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!chartRef.current || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const timeScale = chartRef.current.timeScale()
      const logical = timeScale.coordinateToLogical(x)
      if (logical === null) {
        setTooltip(null)
        return
      }

      const time = timeScale.coordinateToTime(x)
      if (time === null) {
        setTooltip(null)
        return
      }

      // Find event within ~2 candles of the cursor position
      const timeNum = time as number
      const threshold = 3600 * 2 // 2 hours
      const hoveredEvent = events.find(
        (evt) => Math.abs(evt.timestamp - timeNum) < threshold
      )

      if (hoveredEvent) {
        setTooltip({ event: hoveredEvent, x, y })
      } else {
        setTooltip(null)
      }
    },
    [events]
  )

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTooltip(null)}
    >
      {tooltip && (
        <EventTooltip
          event={tooltip.event}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Chart.tsx
git commit -m "feat: add Chart component with candlestick, volume, and event overlay"
```

---

### Task 11: Terminal Layout Component

**Files:**
- Create: `components/Terminal.tsx`

- [ ] **Step 1: Create the Terminal component**

Create `components/Terminal.tsx`:

```tsx
'use client'

import { useState, useMemo } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { CoinId, EventSource, FilterState, SignalEvent } from '@/lib/types'
import { priceData } from '@/data/prices'
import { orderBookData } from '@/data/orderbook'
import { eventData } from '@/data/events'
import TopBar from './TopBar'
import Chart from './Chart'
import OrderBook from './OrderBook'

function buildInitialFilterState(): FilterState {
  const coins: CoinId[] = ['BTC', 'ETH', 'SOL']
  const sources: EventSource[] = ['political', 'news', 'crypto_twitter']

  const state = {} as FilterState
  for (const coin of coins) {
    state[coin] = {} as Record<EventSource, Set<string>>
    for (const source of sources) {
      const authors = eventData
        .filter((e) => e.coin === coin && e.source === source)
        .map((e) => e.sourceAuthor)
      state[coin][source] = new Set([...new Set(authors)])
    }
  }
  return state
}

export default function Terminal() {
  const [selectedCoin, setSelectedCoin] = useState<CoinId>('BTC')
  const [filterState, setFilterState] = useState<FilterState>(buildInitialFilterState)

  const candles = priceData[selectedCoin]
  const orderBook = orderBookData[selectedCoin]

  const lastCandle = candles[candles.length - 1]
  const firstCandle = candles[0]
  const currentPrice = lastCandle?.close ?? 0
  const priceChange24h = firstCandle
    ? ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100
    : 0

  // Get all authors per source (across all events for the selected coin)
  const allAuthors = useMemo(() => {
    const result: Record<EventSource, string[]> = {
      political: [],
      news: [],
      crypto_twitter: [],
    }
    const sources: EventSource[] = ['political', 'news', 'crypto_twitter']
    for (const source of sources) {
      const authors = eventData
        .filter((e) => e.coin === selectedCoin && e.source === source)
        .map((e) => e.sourceAuthor)
      result[source] = [...new Set(authors)]
    }
    return result
  }, [selectedCoin])

  // Filter events based on current filter state
  const filteredEvents = useMemo(() => {
    const coinFilter = filterState[selectedCoin]
    return eventData.filter((e) => {
      if (e.coin !== selectedCoin) return false
      return coinFilter[e.source].has(e.sourceAuthor)
    })
  }, [selectedCoin, filterState])

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-main)' }}>
      <TopBar
        selectedCoin={selectedCoin}
        onCoinChange={setSelectedCoin}
        currentPrice={currentPrice}
        priceChange24h={priceChange24h}
        filterState={filterState}
        onFilterChange={setFilterState}
        allAuthors={allAuthors}
      />
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={70} minSize={40}>
          <Chart candles={candles} events={filteredEvents} />
        </Panel>
        <PanelResizeHandle
          className="w-1 transition-colors hover:bg-[var(--accent)]"
          style={{ backgroundColor: 'var(--border)' }}
        />
        <Panel defaultSize={30} minSize={20}>
          <OrderBook data={orderBook} currentPrice={currentPrice} />
        </Panel>
      </PanelGroup>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Terminal.tsx
git commit -m "feat: add Terminal layout with resizable chart and order book panels"
```

---

### Task 12: Wire Up the Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update page.tsx to render Terminal**

Replace `app/page.tsx` with:

```tsx
import Terminal from '@/components/Terminal'

export default function Home() {
  return <Terminal />
}
```

- [ ] **Step 2: Verify the app renders**

Run:
```bash
npm run dev &
sleep 3
curl -s http://localhost:3000 | grep -c "CryptoSignal"
kill %1
```

Expected: At least 1 match (the page renders the Terminal component)

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire up Terminal component to main page"
```

---

### Task 13: Build Verification & Polish

**Files:**
- Possibly modify: multiple files for TypeScript errors

- [ ] **Step 1: Run production build**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors. If there are TypeScript or import errors, fix them.

- [ ] **Step 2: Fix any build errors**

Address any type errors, missing imports, or Lightweight Charts API incompatibilities. Common issues:
- `Time` type casting may need `as Time` or `UTCTimestamp`
- Lightweight Charts v4 API may differ from v3 — check series creation methods
- ResizeObserver types may need explicit handling

- [ ] **Step 3: Run the dev server and visually verify**

Run:
```bash
npm run dev
```

Open `http://localhost:3000` in a browser and verify:
- Dark theme renders correctly
- Coin tabs switch between BTC/ETH/SOL
- Candlestick chart renders with volume
- Event markers appear on chart
- Order book shows bids and asks
- Filter toggles open popovers with author checkboxes
- Hovering near event markers shows tooltip

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve build errors and polish terminal"
```

---

## Summary

| Task | Component | Key Files |
|------|-----------|-----------|
| 1 | Project Scaffolding | package.json, layout, globals.css |
| 2 | TypeScript Types | lib/types.ts |
| 3 | Price Data | data/prices.ts |
| 4 | Order Book Data | data/orderbook.ts |
| 5 | Event Data | data/events.ts |
| 6 | API Endpoint | app/api/events/route.ts |
| 7 | TopBar | components/TopBar.tsx |
| 8 | OrderBook | components/OrderBook.tsx |
| 9 | EventTooltip | components/EventTooltip.tsx |
| 10 | Chart + Overlay | components/Chart.tsx |
| 11 | Terminal Layout | components/Terminal.tsx |
| 12 | Page Wiring | app/page.tsx |
| 13 | Build & Polish | Various |
