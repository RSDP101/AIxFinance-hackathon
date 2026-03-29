# AIx Terminal — Design Document

## 1. Vision

Existing crypto terminals (Hyperliquid, Binance, Coinbase) treat trading and news as separate experiences. Traders constantly alt-tab between their terminal, Twitter, Truth Social, and news sites — missing critical signals.

**AIx Terminal** merges both into a single screen: a professional perps trading interface on the left, with a live categorized news dashboard on the right. Trade while the world talks.

---

## 2. Core Features

### 2.1 Trading Panel (Left 65%)

| Feature | Details |
|---------|---------|
| **Chart** | TradingView `lightweight-charts` candlestick chart with 1m candles. Dark theme, purple crosshair. Real-time updates via OKX WebSocket. |
| **Pairs** | BTC/USDT, ETH/USDT, SOL/USDT, TAO/USDT — selectable from the top bar. |
| **Order Types** | Market, Limit, Stop-Loss, Take-Profit — tabbed interface similar to Hyperliquid. |
| **Leverage** | Slider from 1x to 5x with snap points. |
| **Order Book** | 15 bid + 15 ask levels, simulated around real mid-price with Gaussian-distributed sizes. Updates every 500ms. |
| **Open Positions** | Table showing pair, side, size, entry price, current price, PnL ($/%%), leverage, close button. PnL updates in real-time. |
| **Simulated Balance** | Starts at $100,000 USDT. Deducted on order placement, credited on position close. |

**Price Data:** All price data is **real**, sourced from OKX public API (no auth needed for market data). Orders and positions are simulated locally.

### 2.2 News Dashboard (Right 35%)

Three categorized tabs:

| Tab | Content | Visual Style |
|-----|---------|-------------|
| **Social** | Truth Social posts (Trump), X/Twitter posts (Elon, Vitalik, Saylor, Whale Alert, Cathie Wood, CZ) | Tweet-like cards: emoji avatar, display name, handle, platform badge, content, likes/reposts, relative timestamp |
| **Geopolitics / War** | NYT, Washington Post, Reuters, BBC, Al Jazeera, Financial Times | Article cards: source name, bold headline, 2-line summary, timestamp |
| **Markets** | Bloomberg, CoinDesk, CNBC, The Block | Same article card format, market-focused headlines |

**Feed Behavior:**
- On page load: 3 social + 2 geo + 2 market items appear immediately.
- Every 8–15 seconds: a new item pushes to a random category via WebSocket.
- New items animate in from the top with a yellow glow that fades over 3 seconds.
- A notification toast appears at the top-right for items arriving in non-active tabs.
- Each feed is capped at 50 items (oldest removed).

**All news is simulated** via pre-written mock data with randomized timestamps. This is a hackathon — the mock server cycles through items to create a realistic "live feed" feel.

### 2.3 Top Bar

```
[AIx Terminal logo] [BTC/USDT] [ETH/USDT] [SOL/USDT] [TAO/USDT]     $97,432.10  +2.34%  24h High  24h Low  24h Vol     [💰 Balance: $100,000.00]
```

- Pair selector buttons (active = purple filled)
- Large current price with green/red coloring
- 24h stats: change%, high, low, volume
- Simulated wallet balance

---

## 3. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + Vite + TypeScript | Fast dev, modern tooling |
| Styling | Tailwind CSS v4 | Rapid dark theme customization |
| State | Zustand | Minimal boilerplate, fast for hackathon |
| Animations | Framer Motion | Smooth enter/exit for news feed |
| Charts | `lightweight-charts` v4 | TradingView's official lib, native candlesticks |
| Icons | Lucide React | Clean, consistent icon set |
| Backend | Node.js + Express + TypeScript | Simple, same language as frontend |
| WebSocket | `ws` library | Lightweight, works with Express |
| Dev runner | `concurrently` + `tsx watch` | Hot-reload for both client and server |

---

## 4. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Browser (React)                      │
│                                                          │
│  ┌─────────────────────────┐  ┌────────────────────────┐ │
│  │     Trading Panel       │  │    News Dashboard      │ │
│  │  ┌───────────────────┐  │  │  [Social|Geo|Markets]  │ │
│  │  │ TradingView Chart │  │  │  ┌──────────────────┐  │ │
│  │  └───────────────────┘  │  │  │  Tweet Card       │  │ │
│  │  ┌─────────┬─────────┐  │  │  │  Article Card     │  │ │
│  │  │ Order   │ Order   │  │  │  │  ...               │  │ │
│  │  │ Book    │ Form    │  │  │  └──────────────────┘  │ │
│  │  └─────────┴─────────┘  │  │                        │ │
│  │  ┌───────────────────┐  │  │  [Notification Toasts] │ │
│  │  │ Open Positions    │  │  │                        │ │
│  │  └───────────────────┘  │  │                        │ │
│  └─────────────────────────┘  └────────────────────────┘ │
│                                                          │
│  WS: /ws/market ─────┐      WS: /ws/news ─────┐        │
└──────────────────────┼──────────────────────────┼────────┘
                       │                          │
┌──────────────────────┼──────────────────────────┼────────┐
│                Express Server (port 3001)                 │
│                                                          │
│  ┌───────────────────┐     ┌────────────────────────┐    │
│  │ OKX WS Proxy      │     │  Mock News Server      │    │
│  │ - Single OKX conn │     │  - Pre-written posts   │    │
│  │ - Broadcasts to   │     │  - Random 8-15s push   │    │
│  │   all clients     │     │  - 3 categories        │    │
│  └────────┬──────────┘     └────────────────────────┘    │
│           │                                              │
│  ┌────────┴──────────┐     ┌────────────────────────┐    │
│  │ REST: /api/candles│     │ REST: /api/ticker       │    │
│  │ (OKX proxy)       │     │ (OKX proxy)             │    │
│  └───────────────────┘     └────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │   OKX Public WebSocket  │
         │   wss://ws.okx.com      │
         │   - tickers (4 pairs)   │
         │   - candle1m (4 pairs)  │
         └─────────────────────────┘
```

---

## 5. Data Flow

### 5.1 Market Data (Real)

1. Server connects to OKX public WebSocket (`wss://ws.okx.com:8443/ws/v5/public`)
2. Subscribes to `tickers` and `candle1m` channels for all 4 pairs
3. Sends `ping` every 25s to keep connection alive
4. When client connects to `/ws/market`, server sends latest cached tickers immediately, then broadcasts all updates
5. Client also fetches `/api/candles` (REST) for initial 300 historical candles — server proxies to OKX REST API to avoid CORS

### 5.2 News Data (Simulated)

1. Server holds ~30 pre-written mock items across 3 categories
2. On client connect to `/ws/news`, server sends initial batch (3 social + 2 geo + 2 market)
3. Every 8–15s (random), server picks a random category and pushes the next item with a fresh timestamp
4. Client prepends to the correct feed, shows notification toast if item is for a non-active tab

### 5.3 Trading (Simulated, Local)

1. All orders and positions live in Zustand store (client-side only)
2. Market orders → instant position at current price, margin deducted from balance
3. Limit/SL/TP orders → stored as pending, a `useEffect` checks on each tick if trigger price is crossed
4. Closing a position → calculates PnL based on current price, credits balance
5. PnL formula: `direction × ((currentPrice - entryPrice) / entryPrice) × size × leverage`

---

## 6. Visual Design

### 6.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#0f0b1a` | Main background (very dark purple-black) |
| `bg-surface` | `#1a1333` | Cards, panels |
| `bg-surface-light` | `#241d40` | Hover states, input backgrounds |
| `bg-surface-lighter` | `#2d2554` | Active states |
| `text-primary` | `#e2e0ea` | Main text |
| `text-secondary` | `#9891a8` | Labels, muted text |
| `text-muted` | `#6b6380` | Placeholder text |
| `purple` | `#7C3AED` | Primary accent — selected states, crosshair, active buttons |
| `yellow` | `#FBBF24` | Secondary accent — logo, tab underline, new-item glow, leverage handle |
| `green` | `#22c55e` | Profit, long/buy, bid, positive change |
| `red` | `#ef4444` | Loss, short/sell, ask, negative change |
| `border` | `#2d2554` | Dividers, card borders |

### 6.2 Typography

- Font: Inter / system-ui
- Prices and numbers: `font-variant-numeric: tabular-nums` for aligned digits
- Pair selector: 14px medium
- Chart price: 24px bold
- News headlines: 15px bold
- Body text: 13px regular

### 6.3 Animations

| Element | Animation |
|---------|-----------|
| New news item | Slide down + fade in (0.3s) via Framer Motion |
| New item highlight | Yellow glow border that fades over 3s (CSS keyframe) |
| Price change | Brief green/red pulse shadow (1s) |
| Notification toast | Slide in from right, auto-dismiss after 4s |
| Order book levels | No animation (updates in-place every 500ms for performance) |

### 6.4 Layout (1920px reference)

```
┌──────────────────────────────────────────────────────────────────┐
│ TopBar (h-14)                                                    │
├──────────────────────────────────┬───────────────────────────────┤
│ Trading Panel (65% width)        │ News Dashboard (35% width)    │
│ ┌──────────────────────────────┐ │ ┌───────────────────────────┐ │
│ │                              │ │ │ [Social] [Geo] [Markets]  │ │
│ │  Candlestick Chart           │ │ │                           │ │
│ │  (60% of panel height)       │ │ │  📱 Tweet Card            │ │
│ │                              │ │ │  📱 Tweet Card            │ │
│ └──────────────────────────────┘ │ │  📰 Article Card          │ │
│ ┌──────────────┬───────────────┐ │ │  📱 Tweet Card            │ │
│ │ Order Book   │ Order Form    │ │ │  📰 Article Card          │ │
│ │ (asks red)   │ [Mkt|Lmt|SL] │ │ │  ...                      │ │
│ │ --spread--   │ Price: ____   │ │ │                           │ │
│ │ (bids green) │ Size:  ____   │ │ │                           │ │
│ │              │ [1x ===o 5x]  │ │ │                           │ │
│ │              │ [LONG] [SHORT]│ │ │                           │ │
│ └──────────────┴───────────────┘ │ │                           │ │
│ ┌──────────────────────────────┐ │ │                           │ │
│ │ Open Positions Table         │ │ │                           │ │
│ │ Pair|Side|Size|Entry|PnL|X   │ │ │                           │ │
│ └──────────────────────────────┘ │ └───────────────────────────┘ │
└──────────────────────────────────┴───────────────────────────────┘
```

---

## 7. File Structure

```
/
├── client/                     # React + Vite
│   └── src/
│       ├── App.tsx             # Root layout (TopBar + 2-panel split)
│       ├── index.css           # Tailwind config + custom theme + animations
│       ├── main.tsx            # Entry point
│       ├── types/              # TypeScript interfaces
│       │   ├── market.ts       #   Candle, TickerData, OrderBookLevel, Pair
│       │   ├── order.ts        #   Order, Position, OrderType, OrderSide
│       │   └── news.ts         #   SocialPost, NewsItem, NewsCategory
│       ├── store/
│       │   └── tradingStore.ts # Zustand: market state, orders, positions, news, notifications
│       ├── hooks/
│       │   ├── useMarketData.ts    # WS connection for tickers + candle fetching
│       │   └── useNewsWebSocket.ts # WS connection for news feed
│       ├── utils/
│       │   ├── formatters.ts       # Price, volume, PnL, time formatting
│       │   └── orderBookSim.ts     # Generate fake order book from real price
│       └── components/
│           ├── TopBar.tsx              # Pair selector, price, balance
│           ├── TradingPanel/
│           │   ├── TradingPanel.tsx     # Container
│           │   ├── Chart.tsx           # TradingView lightweight-charts
│           │   ├── OrderBook.tsx       # Bid/ask visualization
│           │   ├── OrderForm.tsx       # Order entry with type tabs
│           │   ├── LeverageSelector.tsx # 1x-5x slider
│           │   └── OpenPositions.tsx   # Positions table with live PnL
│           └── NewsDashboard/
│               ├── NewsDashboard.tsx    # Container with tabs
│               ├── SocialPost.tsx       # Tweet/Truth Social card
│               ├── NewsArticle.tsx      # Article headline card
│               └── NotificationToast.tsx # Animated toast alerts
│
├── server/                     # Express + WebSocket
│   └── src/
│       ├── index.ts            # Express app, HTTP server, WS routing
│       ├── routes/
│       │   └── market.ts       # GET /api/candles, GET /api/ticker (OKX proxy)
│       ├── ws/
│       │   ├── okxProxy.ts     # OKX WS → broadcast to clients
│       │   └── newsServer.ts   # Mock news push every 8-15s
│       └── data/
│           ├── mockSocial.ts   # Trump, Elon, Vitalik, Saylor, etc.
│           └── mockNews.ts     # NYT, Bloomberg, CoinDesk, etc.
│
├── package.json                # Root workspace scripts (dev, dev:client, dev:server)
└── DESIGN.md                   # This file
```

---

## 8. OKX API Details

| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `GET /api/v5/market/candles?instId=BTC-USDT&bar=1m&limit=300` | Historical candlesticks | No |
| `GET /api/v5/market/ticker?instId=BTC-USDT` | Current ticker snapshot | No |
| `wss://ws.okx.com:8443/ws/v5/public` | Real-time tickers + candles | No |

**WebSocket subscriptions:**
```json
{"op":"subscribe","args":[{"channel":"tickers","instId":"BTC-USDT"}]}
{"op":"subscribe","args":[{"channel":"candle1m","instId":"BTC-USDT"}]}
```

**Keep-alive:** Send `"ping"` every 25 seconds. Server responds with `"pong"`.

**Rate limits:** 20 requests/2s for REST candles (generous for our use case).

**Note:** All endpoints are public/unauthenticated. We proxy through our Express server to avoid browser CORS issues.

---

## 9. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Real vs simulated prices | Real (OKX) | Credibility for demo — trading terminal must show real prices |
| Real vs simulated orders | Simulated (local) | Hackathon constraint — no real money at risk |
| Real vs simulated news | Simulated (mock) | No Twitter/Truth Social API needed — mock server cycles realistic content |
| Server-side OKX proxy | Yes | Avoids CORS, single connection shared across all clients |
| Zustand over Redux | Zustand | Zero boilerplate, perfect for hackathon speed |
| Tailwind over CSS modules | Tailwind | Fastest way to build a custom dark theme inline |
| Framer Motion for news | Yes | Smooth enter/exit animations with minimal code |
| Order book simulated | Yes | Realistic enough for demo — uses real mid-price with Gaussian distribution |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| OKX WebSocket disconnects | Auto-reconnect with 3s delay; cache latest tickers for new clients |
| TAO-USDT might not exist on OKX | Verify at runtime; fallback to DOGE-USDT if needed |
| Chart perf with live updates | Use `series.update()` (O(1)), not `setData()` for live ticks |
| Order book looks fake | Gaussian size distribution + 500ms jitter + real mid-price |
| News feed memory leak | Cap at 50 items per category, remove oldest |
| Candle timestamps | OKX returns ms, lightweight-charts expects UTC seconds — divide by 1000 |

---

## 11. Running the Project

```bash
# Install all dependencies
cd client && npm install && cd ..
cd server && npm install && cd ..
npm install

# Start both client and server
npm run dev

# Client: http://localhost:5173
# Server: http://localhost:3001
# Vite proxies /api and /ws to server automatically
```
