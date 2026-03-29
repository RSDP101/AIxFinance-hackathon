# AIx Terminal — Final Design

## The Pitch

Every crypto terminal (Hyperliquid, Binance, Coinbase) treats trading and news as separate apps. Traders alt-tab between charts, Twitter, Truth Social, and news sites — reacting late to catalysts.

**AIx Terminal** puts it all on one screen: a professional chart with **event lines overlaid directly on the price action**, plus a live categorized news feed on the side. Hover any event line to see what moved the market. Trade while the world talks.

---

## The Killer Feature: Catalyst Lines on Chart

Vertical dashed lines appear on the candlestick chart at the exact timestamp of each news event. Color-coded by category. Hover to see a tooltip with the full details + price impact.

This is what makes us different from every other terminal. A trader can scroll back in time and instantly see **what caused every move**.

```
         Trump post    Elon tweet     Fed rate cut       NYT article
            │              │               │                 │
    ┌───────┼──────────────┼───────────────┼─────────────────┼──────┐
    │  ▄▄   │         ▄▄   │   ▄▄▄▄▄      │   ▄▄     ▄▄    │      │
    │ █  █▄ │  ▄▄▄   █  █  │  █     █▄    │  █  █   █  █▄▄ │      │
    │      ██ █  █▄▄█    █ │ █       █▄▄▄▄█▄█    █▄█       │      │
    │         █    █       █│█                               │      │
    └───────┼──────────────┼───────────────┼─────────────────┼──────┘
            │              │               │                 │
        [orange]       [purple]         [blue]           [blue]
```

**On hover → tooltip:**
```
┌──────────────────────────────────┐
│ 🟠 POLITICAL                     │
│ Donald J. Trump · @realDonaldTrump│
│ "Bitcoin is going TO THE MOON..." │
│ Mar 28, 2026 · 2:34 PM           │
│ ↑ +2.1% in 1hr · Bullish         │
└──────────────────────────────────┘
```

---

## Architecture (Simplified for Hackathon)

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React + Vite)                │
│                                                         │
│  ┌───────────────────────────┐ ┌──────────────────────┐ │
│  │     Chart + Event Lines   │ │   News Feed (tabs)   │ │
│  │     Order Book            │ │   Social | Geo | Mkt │ │
│  │     Order Form            │ │   Tweet cards        │ │
│  │     Positions             │ │   Article cards      │ │
│  └───────────┬───────────────┘ └──────────┬───────────┘ │
│              │                            │             │
│     WS /ws/market                WS /ws/news            │
└──────────────┼────────────────────────────┼─────────────┘
               │                            │
┌──────────────┼────────────────────────────┼─────────────┐
│          Express Server (port 3001)                      │
│                                                         │
│  OKX WS Proxy ──► wss://ws.okx.com (real prices)       │
│  REST /api/candles ──► OKX REST (historical candles)    │
│  Mock News WS ──► pushes events every 8-15s             │
└─────────────────────────────────────────────────────────┘
```

**What's real:** Price data (OKX public API, no auth needed).
**What's simulated:** Orders, positions, balance, news events, order book.

---

## Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ TopBar                                                           │
│ [AIx Terminal]  [BTC/USDT][ETH/USDT][SOL/USDT][TAO/USDT]       │
│                 $97,432.10 +2.34%  Hi/Lo/Vol   [Balance $100K]   │
│ Filter toggles: [🟠 Political] [🔵 News] [🟣 Social]           │
├──────────────────────────────────────┬───────────────────────────┤
│ TRADING PANEL (65%)                  │ NEWS DASHBOARD (35%)      │
│                                      │                           │
│ ┌──────────────────────────────────┐ │ ┌───────────────────────┐ │
│ │                                  │ │ │ [Social][Geo][Markets] │ │
│ │  Candlestick Chart               │ │ │                       │ │
│ │  with EVENT OVERLAY LINES        │ │ │ 🇺🇸 Trump post card   │ │
│ │  (hover for tooltip)             │ │ │ 🚀 Elon tweet card    │ │
│ │                                  │ │ │ 📰 NYT article card   │ │
│ │  55% height                      │ │ │ ⚡ Saylor tweet card  │ │
│ └──────────────────────────────────┘ │ │ 📰 Bloomberg card     │ │
│                                      │ │ ...                    │ │
│ ┌──────────────┬───────────────────┐ │ │                       │ │
│ │ Order Book   │ Order Form        │ │ │ (scrollable, items    │ │
│ │              │ [Mkt][Lmt][SL][TP]│ │ │  animate in with      │ │
│ │ asks (red)   │ Price: ________   │ │ │  yellow glow)         │ │
│ │ --spread--   │ Size:  ________   │ │ │                       │ │
│ │ bids (green) │ [1x ════o═ 5x]   │ │ │                       │ │
│ │              │ [LONG]  [SHORT]   │ │ │                       │ │
│ └──────────────┴───────────────────┘ │ │                       │ │
│                                      │ │                       │ │
│ ┌──────────────────────────────────┐ │ │                       │ │
│ │ Positions  Pair|Side|Entry|PnL|X │ │ │                       │ │
│ └──────────────────────────────────┘ │ └───────────────────────┘ │
└──────────────────────────────────────┴───────────────────────────┘
```

---

## Features (Priority Order)

### P0 — Must ship (the demo)

#### 1. Candlestick Chart with Event Overlay Lines
- `lightweight-charts` v4 candlestick chart
- Real 1m candle data from OKX (300 historical + live updates)
- **Vertical marker lines** at event timestamps, color-coded:
  - 🟠 Political (Trump, government): `#FF9800`
  - 🔵 News (NYT, Reuters, Bloomberg): `#2196F3`
  - 🟣 Social/Crypto Twitter (Elon, Vitalik, Saylor): `#9C27B0`
- **Hover tooltip** on each line showing: source, author, headline, summary, price impact, sentiment
- Chart markers API for the labels at bottom of lines

#### 2. News Dashboard (right panel)
- Three tabs: Social | Geopolitics | Markets
- **Social posts**: tweet-like cards (avatar emoji, name, handle, platform badge, content, likes, reposts, timestamp)
- **News articles**: article cards (source name, bold headline, 2-line summary, timestamp)
- New items animate in (slide + fade via Framer Motion)
- New items get a yellow glow border that fades over 3s
- Notification toast for items arriving in non-active tabs
- Clicking a news item scrolls the chart to that event's timestamp

#### 3. Category Filter Toggles
- Three pill buttons in the top bar: Political / News / Social
- Toggle on/off → shows/hides corresponding event lines on the chart
- Active = filled with category color, inactive = outline only

#### 4. Top Bar
- App name + logo
- Pair selector (BTC/USDT, ETH/USDT, SOL/USDT, TAO/USDT)
- Current price (large, green/red)
- 24h change, high, low, volume
- Simulated balance ($100,000)

### P1 — Should ship (makes it feel real)

#### 5. Order Form
- Tabs: Market | Limit | Stop-Loss | Take-Profit
- Price input (disabled for market), Size input (USDT)
- Long (green) / Short (red) buttons
- Leverage slider 1x–5x with yellow accent
- All orders simulated locally in Zustand

#### 6. Order Book
- 12 bid + 12 ask levels, simulated around real mid-price
- Depth bar backgrounds (green bids, red asks)
- Spread display in the middle
- Updates every 500ms with slight jitter

#### 7. Open Positions Table
- Pair, Side, Size, Entry, Current, PnL, Leverage, Close button
- PnL updates live from ticker data
- Green/red coloring

### P2 — Nice to have (if time allows)

- Sound effect on new social post arrival
- Click event line → highlight corresponding news card
- Sparkline mini-charts in top bar for non-selected pairs

---

## Event Data Model

```typescript
type EventSource = 'political' | 'news' | 'social';

interface CatalystEvent {
  id: string;
  source: EventSource;
  author: string;
  handle?: string;
  avatar: string;             // emoji for hackathon
  coin: string;               // "BTC-USDT" etc., or "ALL" for macro
  timestamp: number;          // unix seconds, aligned to candle times
  headline: string;
  content: string;            // full post text or article summary
  platform: string;           // "Truth Social", "X", "NYT", etc.
  priceImpact?: {
    percent: number;
    direction: 'up' | 'down';
    windowMinutes: number;
  };
  sentiment: 'bullish' | 'bearish' | 'neutral';
  likes?: number;
  reposts?: number;
}
```

Events serve **dual purpose**: they render as lines on the chart AND as cards in the news feed. One data model, two views.

---

## Pre-loaded Demo Events (~20 events)

Events are hardcoded with timestamps aligned to the last 5 hours of real candle data. On page load, all historical events appear as lines on the chart. New events push in via WebSocket every 8-15s and add a new line + news card simultaneously.

**Political:**
- Trump: "Bitcoin is going TO THE MOON! USA will be the CRYPTO CAPITAL"
- Trump: "NEW TARIFFS on countries creating CBDCs to replace the DOLLAR"
- Trump: "We are building a STRATEGIC BITCOIN RESERVE"
- Trump: "Just signed the most BEAUTIFUL Executive Order on Digital Assets"

**News:**
- NYT: "EU Announces Emergency Crypto Regulation Framework"
- Washington Post: "China Accelerates Digital Yuan Rollout"
- Reuters: "Russia-Ukraine Ceasefire Talks Resume, Markets Rally"
- Bloomberg: "Federal Reserve Signals Rate Cut in September"
- BBC: "UK Parliament Passes Digital Asset Bill"

**Social:**
- Elon: "Dogecoin is the people's crypto 🐕"
- Elon: "AI + Crypto = the future of finance"
- Vitalik: "Ethereum L2s processing more transactions than Visa"
- Saylor: "MicroStrategy acquired 12,000 more BTC"
- Cathie Wood: "Updated BTC target: $1.5M by 2030"
- Whale Alert: "49,999 BTC transferred to Coinbase"

Each event includes a plausible `priceImpact` and `sentiment`.

---

## Visual Design

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#0f0b1a` | Main background |
| `bg-surface` | `#1a1333` | Cards, panels |
| `bg-surface-light` | `#241d40` | Hover, inputs |
| `text-primary` | `#e2e0ea` | Main text |
| `text-secondary` | `#9891a8` | Labels |
| `purple` | `#7C3AED` | Primary accent |
| `yellow` | `#FBBF24` | Secondary accent, new-item glow |
| `green` | `#22c55e` | Profit, long, bid |
| `red` | `#ef4444` | Loss, short, ask |
| `orange` | `#FF9800` | Political event lines |
| `blue` | `#2196F3` | News event lines |
| `violet` | `#9C27B0` | Social event lines |

### Animations

| What | How |
|------|-----|
| New news card | `framer-motion` slide down + fade in (0.3s) |
| New item glow | CSS keyframe: yellow border + shadow → transparent (3s) |
| Price change | Green/red pulse shadow (1s) |
| Notification toast | Slide in from right, auto-dismiss 4s |
| Event line appear | Instant (added to chart markers) |
| Tooltip | CSS fade in (0.15s) on hover |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Animations | Framer Motion |
| Charts | `lightweight-charts` v4 |
| Icons | Lucide React |
| Backend | Node.js + Express |
| WebSocket | `ws` |

---

## File Structure

```
/
├── client/
│   └── src/
│       ├── App.tsx
│       ├── index.css
│       ├── main.tsx
│       ├── types/
│       │   ├── market.ts          # Candle, TickerData, Pair
│       │   ├── order.ts           # Order, Position
│       │   └── events.ts          # CatalystEvent, EventSource
│       ├── store/
│       │   └── tradingStore.ts    # All app state
│       ├── hooks/
│       │   ├── useMarketData.ts   # OKX WS + candle fetch
│       │   └── useNewsFeed.ts     # News WS + event state
│       ├── utils/
│       │   ├── formatters.ts      # Price, volume, time formatting
│       │   └── orderBookSim.ts    # Fake order book from real price
│       └── components/
│           ├── TopBar.tsx
│           ├── TradingPanel/
│           │   ├── TradingPanel.tsx
│           │   ├── Chart.tsx           # Chart + event overlay + tooltip
│           │   ├── EventTooltip.tsx    # Hover popover for event details
│           │   ├── OrderBook.tsx
│           │   ├── OrderForm.tsx
│           │   └── OpenPositions.tsx
│           └── NewsDashboard/
│               ├── NewsDashboard.tsx
│               ├── SocialPost.tsx
│               ├── NewsArticle.tsx
│               └── NotificationToast.tsx
│
├── server/
│   └── src/
│       ├── index.ts
│       ├── routes/market.ts       # OKX REST proxy
│       ├── ws/okxProxy.ts         # OKX WS proxy (real prices)
│       ├── ws/newsServer.ts       # Mock event push every 8-15s
│       └── data/
│           └── events.ts          # All CatalystEvent[] with timestamps
│
├── package.json
└── docs/FINAL_DESIGN.md
```

---

## Implementation Order (2-hour budget)

| Phase | Time | What |
|-------|------|------|
| 1 | 0:00–0:20 | Server: OKX proxy + mock event push. Client scaffold + Zustand store. |
| 2 | 0:20–0:50 | Chart with real candles + event overlay lines + hover tooltip. This is the hero feature. |
| 3 | 0:50–1:10 | News dashboard: tabs, social post cards, article cards, animated feed. |
| 4 | 1:10–1:30 | Top bar, order form, order book, positions table. |
| 5 | 1:30–1:50 | Filter toggles, click-to-scroll, notification toasts. |
| 6 | 1:50–2:00 | Polish: animations, spacing, edge cases. |

---

## How to Run

```bash
npm install && cd client && npm install && cd ../server && npm install && cd ..
npm run dev
# → http://localhost:5173
```
