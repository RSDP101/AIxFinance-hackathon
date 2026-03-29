# AIx Terminal

A crypto trading terminal with integrated news feeds and catalyst event overlays on the price chart.

## Quick Start

```bash
# Install dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Run both client and server
npm run dev
```

Open **http://localhost:5173** in your browser.

## What You'll See

- **Left panel** — Live BTC/USDT chart (real prices from OKX), order book, order form, positions
- **Right panel** — News feed with Social, Political, and Markets tabs
- **Chart markers** — Colored dots on the chart showing news catalysts (hover for details)
- **Top bar** — Switch pairs (BTC/ETH/SOL/TAO), toggle event filters, view balance

## Tech Stack

React + Vite | Node.js + Express | TradingView Lightweight Charts | Tailwind CSS | Zustand
