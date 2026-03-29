# CryptoSignal Terminal

A crypto trading terminal that overlays real-time and historical news events on price charts, with propagation forensics to trace which wallets moved first on market-moving events.

## Quick Start

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Set API keys (optional — app works without them)
export GUARDIAN_API_KEY="your-key"       # https://open-platform.theguardian.com/access/
export NYT_API_KEY="your-key"            # https://developer.nytimes.com/
export TRUTHSOCIAL_USERNAME="your-user"  # optional, for Truth Social sidecar
export TRUTHSOCIAL_PASSWORD="your-pass"

# Run everything
npm run dev
```

Open **http://localhost:3000** in your browser.

## Features

### Trading Terminal (`/`)
- **Live candlestick chart** — Real BTC/ETH/SOL/TAO prices from OKX, with volume histogram
- **Event overlays** — News and social media events as colored markers on the chart
  - Truth Social (orange) — Trump posts via Python sidecar using truthbrush
  - News (blue) — Live RSS from CoinDesk, Cointelegraph, The Block + historical from Guardian & NYT
  - Twitter/X (purple) — Hardcoded demo events from major crypto accounts
- **Date range picker** — Select any time range; candle size auto-adjusts, historical news fetched automatically
- **Shift+drag zoom** — Hold Shift and drag on the chart to zoom into a region
- **Event density filtering** — When events overlap, only the most impactful ones are shown
- **Order book** — Mock bid/ask depth with spread display
- **Two-level filtering** — Toggle event categories on/off, drill into individual sources
- **Click to analyze** — Click any event to open propagation forensics in a new tab

### Propagation Forensics (`/graph`)
- **Wallet tracing** — Enter a crypto event and trace which wallets moved first
- **Multi-event analysis** — Add multiple events to find wallets that repeatedly appear early
- **3D force graph** — Interactive visualization of event-to-wallet propagation
- **Repeat mover detection** — Identifies wallets that show up across multiple events

## Architecture

```
Next.js 14 (App Router)          Express Server (port 3001)
├── / (Terminal)                  ├── /api/candles (OKX proxy)
│   ├── Chart.tsx                 ├── /api/ticker (OKX proxy)
│   ├── TopBar.tsx                ├── /api/events (live + historical)
│   ├── OrderBook.tsx             ├── /ws/market (OKX WebSocket relay)
│   └── EventTooltip.tsx          ├── /ws/news (live event broadcast)
├── /graph (Forensics)            └── lib/
│   └── ForceGraph3D/2D               ├── guardianNews.ts
└── /api/propagation                   ├── nytNews.ts
                                       ├── newsRss.ts
Python Sidecar (optional)              ├── truthSocial.ts
└── scripts/fetch-truth-social.py      └── liveFeedManager.ts
```

## Data Sources

| Source | Type | Data |
|--------|------|------|
| OKX | Real-time | Price candles, ticker, WebSocket updates |
| Guardian API | Historical | Macro news back to 1999 (free, API key required) |
| NYT API | Historical | Macro news back to 1851 (free, API key required) |
| CoinDesk, Cointelegraph, The Block | Live RSS | Crypto news articles |
| Truth Social | Live | Trump posts via truthbrush Python sidecar |
| Twitter/X | Hardcoded | Demo events from major crypto accounts |

## Tech Stack

Next.js 14 | React | TypeScript | TradingView Lightweight Charts | Tailwind CSS | Express | WebSocket | react-resizable-panels | react-force-graph-3d
