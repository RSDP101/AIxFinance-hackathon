# Timescale, Zoom & UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a date range picker with auto candle sizing, Shift+drag range zoom, event density filtering by price impact, and a REST events endpoint with time range query support.

**Architecture:** Date range state in Terminal.tsx drives data fetching — `useCandles` passes `after`/`before` to OKX via the Express proxy, and a new `useEvents` hook fetches events for the range from a new REST endpoint. Chart.tsx gets a zoom overlay for Shift+drag and a density filter that prunes overlapping event markers by price impact score.

**Tech Stack:** Lightweight Charts v5 (timeScale API), React 18, Express.js, OKX REST API.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/barSize.ts` | `selectBarSize(rangeSeconds)` utility |
| Create | `lib/eventDensity.ts` | `filterOverlappingEvents()` + `scoreEvent()` utilities |
| Create | `hooks/useEvents.ts` | REST fetch for events by time range + merge with WS |
| Create | `server/src/routes/events.ts` | REST endpoint `GET /api/events?from=&to=` |
| Modify | `server/src/index.ts` | Register events route |
| Modify | `server/src/routes/market.ts` | Pass `after`/`before` params to OKX |
| Modify | `hooks/useMarketData.ts` | Accept timeRange, compute bar size, pass after/before |
| Modify | `components/TopBar.tsx` | Add date range picker inputs |
| Modify | `components/Terminal.tsx` | Add timeRange state, wire new hooks |
| Modify | `components/Chart.tsx` | Add Shift+drag zoom overlay, Reset button, density filter |

---

### Task 1: Bar Size Utility

**Files:**
- Create: `lib/barSize.ts`

- [ ] **Step 1: Create the utility**

```typescript
// lib/barSize.ts
export function selectBarSize(rangeSeconds: number): string {
  if (rangeSeconds < 2 * 3600) return '1m';
  if (rangeSeconds < 12 * 3600) return '5m';
  if (rangeSeconds < 2 * 86400) return '15m';
  if (rangeSeconds < 7 * 86400) return '1H';
  if (rangeSeconds < 30 * 86400) return '4H';
  return '1D';
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/barSize.ts
git commit -m "feat: add bar size auto-selection utility"
```

---

### Task 2: Events REST Endpoint

**Files:**
- Create: `server/src/routes/events.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create the events route**

```typescript
// server/src/routes/events.ts
import { Router, Request, Response } from 'express';
import { catalystEvents } from '../data/events';
import { getAllLiveEvents } from '../lib/liveFeedManager';

const router = Router();

router.get('/events', (req: Request, res: Response) => {
  const from = req.query.from ? Number(req.query.from) : undefined;
  const to = req.query.to ? Number(req.query.to) : undefined;

  let events = [...catalystEvents, ...getAllLiveEvents()];

  if (from !== undefined) {
    events = events.filter(e => e.timestamp >= from);
  }
  if (to !== undefined) {
    events = events.filter(e => e.timestamp <= to);
  }

  events.sort((a, b) => a.timestamp - b.timestamp);

  res.json({ events });
});

export default router;
```

- [ ] **Step 2: Register in index.ts**

In `server/src/index.ts`, add the import and route registration. After the existing `app.use('/api', marketRoutes);` line, add:

```typescript
import eventsRoutes from './routes/events';
```

And change the route registration to:

```typescript
app.use('/api', marketRoutes);
app.use('/api', eventsRoutes);
```

- [ ] **Step 3: Verify it compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/events.ts server/src/index.ts
git commit -m "feat: add REST endpoint for events with time range filter"
```

---

### Task 3: Update Market Route for Time Range

**Files:**
- Modify: `server/src/routes/market.ts`

- [ ] **Step 1: Pass after/before to OKX candles endpoint**

In `server/src/routes/market.ts`, update the `/candles` handler. Replace the existing route handler with:

```typescript
router.get('/candles', async (req: Request, res: Response) => {
  const { instId = 'BTC-USDT', bar = '1m', limit = '300', after, before } = req.query;
  try {
    const params = new URLSearchParams({
      instId: String(instId),
      bar: String(bar),
      limit: String(limit),
    });
    if (after) params.set('after', String(after));
    if (before) params.set('before', String(before));

    const url = `https://www.okx.com/api/v5/market/candles?${params}`;
    const response = await fetch(url);
    const json: any = await response.json();

    if (json.code !== '0') {
      res.status(400).json({ error: json.msg });
      return;
    }

    const candles = json.data
      .map((d: string[]) => ({
        time: Math.floor(Number(d[0]) / 1000),
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5]),
      }))
      .reverse();

    res.json(candles);
  } catch (err) {
    console.error('OKX candles error:', err);
    res.status(500).json({ error: 'Failed to fetch candles' });
  }
});
```

- [ ] **Step 2: Verify it compiles**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/market.ts
git commit -m "feat: support after/before time params in candles endpoint"
```

---

### Task 4: Update useCandles Hook for Time Range

**Files:**
- Modify: `hooks/useMarketData.ts`

- [ ] **Step 1: Update useCandles to accept timeRange**

Replace the entire `useCandles` function in `hooks/useMarketData.ts`:

```typescript
export function useCandles(coin: CoinId, timeRange: { from: number; to: number }) {
  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const instId = COIN_INST_ID[coin]

  // Compute bar size from range
  const rangeSeconds = timeRange.to - timeRange.from
  const barSize = selectBarSize(rangeSeconds)

  // Fetch historical candles for the range
  useEffect(() => {
    setLoading(true)
    const afterMs = timeRange.from * 1000
    const beforeMs = timeRange.to * 1000
    fetch(
      `${SERVER_URL}/api/candles?instId=${instId}&bar=${barSize}&limit=300&after=${afterMs}&before=${beforeMs}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCandles(data)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch candles:', err)
        setLoading(false)
      })
  }, [instId, barSize, timeRange.from, timeRange.to])

  // Subscribe to real-time candle updates
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/market`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'candle' && msg.data.instId === instId) {
          const c: Candle = {
            time: msg.data.time,
            open: msg.data.open,
            high: msg.data.high,
            low: msg.data.low,
            close: msg.data.close,
            volume: msg.data.volume,
          }
          setCandles((prev) => {
            if (prev.length === 0) return [c]
            const last = prev[prev.length - 1]
            if (last.time === c.time) {
              return [...prev.slice(0, -1), c]
            } else if (c.time > last.time) {
              return [...prev, c]
            }
            return prev
          })
        }
      } catch {}
    }

    ws.onerror = (err) => console.error('Market WS error:', err)

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [instId])

  return { candles, loading }
}
```

Add the import at the top of the file:

```typescript
import { selectBarSize } from '@/lib/barSize'
```

- [ ] **Step 2: Verify it compiles (will fail until Terminal.tsx is updated — that's expected)**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add hooks/useMarketData.ts lib/barSize.ts
git commit -m "feat: update useCandles to accept time range with auto bar sizing"
```

---

### Task 5: Create useEvents Hook

**Files:**
- Create: `hooks/useEvents.ts`

- [ ] **Step 1: Create the hook**

```typescript
// hooks/useEvents.ts
'use client'

import { useEffect, useState } from 'react'
import { CatalystEvent, SERVER_URL } from '@/lib/types'
import { useNewsFeed } from './useNewsFeed'

export function useEvents(timeRange: { from: number; to: number }) {
  const [restEvents, setRestEvents] = useState<CatalystEvent[]>([])
  const wsEvents = useNewsFeed()

  // Fetch events for the time range
  useEffect(() => {
    fetch(`${SERVER_URL}/api/events?from=${timeRange.from}&to=${timeRange.to}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.events && Array.isArray(data.events)) {
          setRestEvents(data.events)
        }
      })
      .catch((err) => console.error('Failed to fetch events:', err))
  }, [timeRange.from, timeRange.to])

  // Merge REST events with live WS events that fall within range
  const merged = [...restEvents]
  const restIds = new Set(restEvents.map((e) => e.id))

  for (const wsEvent of wsEvents) {
    if (
      !restIds.has(wsEvent.id) &&
      wsEvent.timestamp >= timeRange.from &&
      wsEvent.timestamp <= timeRange.to
    ) {
      merged.push(wsEvent)
    }
  }

  merged.sort((a, b) => a.timestamp - b.timestamp)
  return merged
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useEvents.ts
git commit -m "feat: add useEvents hook for time-range event fetching"
```

---

### Task 6: Event Density Filtering

**Files:**
- Create: `lib/eventDensity.ts`

- [ ] **Step 1: Create the density filter module**

```typescript
// lib/eventDensity.ts
import { CatalystEvent, Candle } from './types'
import type { ITimeScaleApi, Time } from 'lightweight-charts'

export function scoreEvent(event: CatalystEvent, candles: Candle[]): number {
  const eventIdx = candles.findIndex((c) => c.time >= event.timestamp)
  if (eventIdx < 0) return 0

  const basePrice = candles[eventIdx].close
  let maxChange = 0

  for (let i = 1; i <= 5 && eventIdx + i < candles.length; i++) {
    const change =
      Math.abs(candles[eventIdx + i].close - basePrice) / basePrice
    maxChange = Math.max(maxChange, change)
  }

  return maxChange
}

export function filterOverlappingEvents(
  events: CatalystEvent[],
  candles: Candle[],
  timeScale: ITimeScaleApi<Time>,
  minPixelGap: number = 40
): CatalystEvent[] {
  if (events.length === 0) return events

  // Score and sort by timestamp
  const scored = events
    .map((e) => ({ event: e, score: scoreEvent(e, candles) }))
    .sort((a, b) => a.event.timestamp - b.event.timestamp)

  // Iteratively remove overlapping events with lower scores
  let filtered = [...scored]
  let changed = true

  while (changed) {
    changed = false
    const next: typeof scored = [filtered[0]]

    for (let i = 1; i < filtered.length; i++) {
      const prev = next[next.length - 1]
      const curr = filtered[i]

      const prevX = timeScale.timeToCoordinate(prev.event.timestamp as Time)
      const currX = timeScale.timeToCoordinate(curr.event.timestamp as Time)

      if (prevX === null || currX === null) {
        next.push(curr)
        continue
      }

      const gap = Math.abs(currX - prevX)
      if (gap < minPixelGap) {
        // Keep the one with higher score
        if (curr.score > prev.score) {
          next[next.length - 1] = curr
        }
        changed = true
      } else {
        next.push(curr)
      }
    }

    filtered = next
  }

  return filtered.map((s) => s.event)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/eventDensity.ts
git commit -m "feat: add event density filter by price impact score"
```

---

### Task 7: Update TopBar with Date Range Picker

**Files:**
- Modify: `components/TopBar.tsx`

- [ ] **Step 1: Add timeRange props and date inputs**

Add to the `TopBarProps` interface:

```typescript
interface TopBarProps {
  selectedCoin: CoinId
  onCoinChange: (coin: CoinId) => void
  currentPrice: number
  priceChange24h: number
  filterState: FilterState
  onFilterChange: (filterState: FilterState) => void
  allAuthors: Record<EventSource, string[]>
  timeRange: { from: number; to: number }
  onTimeRangeChange: (range: { from: number; to: number }) => void
}
```

Update the function signature to accept the new props:

```typescript
export default function TopBar({
  selectedCoin,
  onCoinChange,
  currentPrice,
  priceChange24h,
  filterState,
  onFilterChange,
  allAuthors,
  timeRange,
  onTimeRangeChange,
}: TopBarProps) {
```

Add two helper functions inside the component, after the existing state declarations:

```typescript
  function toLocalDatetime(unix: number): string {
    const d = new Date(unix * 1000)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function fromLocalDatetime(val: string): number {
    return Math.floor(new Date(val).getTime() / 1000)
  }
```

Add the date range picker between the coin tabs and the price display. Replace the `{/* Center-right: Price */}` section with:

```tsx
      {/* Center: Date range + Price */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>From</label>
          <input
            type="datetime-local"
            value={toLocalDatetime(timeRange.from)}
            onChange={(e) => {
              const val = fromLocalDatetime(e.target.value)
              if (val && val < timeRange.to) {
                onTimeRangeChange({ from: val, to: timeRange.to })
              }
            }}
            className="px-1 py-0.5 text-xs font-mono rounded"
            style={{
              backgroundColor: 'var(--bg-main)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          />
          <label className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>To</label>
          <input
            type="datetime-local"
            value={toLocalDatetime(timeRange.to)}
            onChange={(e) => {
              const val = fromLocalDatetime(e.target.value)
              if (val && val > timeRange.from) {
                onTimeRangeChange({ from: timeRange.from, to: val })
              }
            }}
            className="px-1 py-0.5 text-xs font-mono rounded"
            style={{
              backgroundColor: 'var(--bg-main)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          />
        </div>

        <span className="font-mono text-sm font-bold">
          ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="font-mono text-xs" style={{ color: changeColor }}>
          {changeSign}{priceChange24h.toFixed(2)}%
        </span>
      </div>
```

- [ ] **Step 2: Commit**

```bash
git add components/TopBar.tsx
git commit -m "feat: add date range picker to TopBar"
```

---

### Task 8: Update Terminal.tsx to Wire Everything Together

**Files:**
- Modify: `components/Terminal.tsx`

- [ ] **Step 1: Replace Terminal.tsx with updated version**

Key changes:
- Add `timeRange` state (default: last 5 hours)
- Pass `timeRange` to `useCandles`
- Replace `useNewsFeed` with `useEvents(timeRange)`
- Pass `timeRange` and `onTimeRangeChange` to TopBar

Replace the entire file:

```typescript
'use client'

import { useState, useMemo } from 'react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { CoinId, EventSource, FilterState, CatalystEvent, COIN_INST_ID } from '@/lib/types'
import { useCandles, useTicker } from '@/hooks/useMarketData'
import { useEvents } from '@/hooks/useEvents'
import { orderBookData } from '@/data/orderbook'
import TopBar from './TopBar'
import Chart from './Chart'
import OrderBook from './OrderBook'

function buildFilterState(events: CatalystEvent[]): FilterState {
  const coins: CoinId[] = ['BTC', 'ETH', 'SOL', 'TAO']
  const sources: EventSource[] = ['political', 'news', 'social']

  const state = {} as FilterState
  for (const coin of coins) {
    state[coin] = {} as Record<EventSource, Set<string>>
    const instId = COIN_INST_ID[coin]
    for (const source of sources) {
      const authors = events
        .filter((e) => (e.coin === instId || e.coin === 'ALL') && e.source === source)
        .map((e) => e.author)
      state[coin][source] = new Set(authors)
    }
  }
  return state
}

export default function Terminal() {
  const [selectedCoin, setSelectedCoin] = useState<CoinId>('BTC')
  const [timeRange, setTimeRange] = useState<{ from: number; to: number }>({
    from: Math.floor(Date.now() / 1000) - 5 * 3600,
    to: Math.floor(Date.now() / 1000),
  })
  const { candles, loading } = useCandles(selectedCoin, timeRange)
  const ticker = useTicker(selectedCoin)
  const allEvents = useEvents(timeRange)
  const [filterState, setFilterState] = useState<FilterState | null>(null)

  const orderBook = orderBookData[selectedCoin] ?? orderBookData.BTC

  const currentPrice = ticker?.last ?? candles[candles.length - 1]?.close ?? 0
  const priceChange24h = ticker?.change24h ?? 0

  const effectiveFilter = useMemo(() => {
    if (filterState) return filterState
    if (allEvents.length > 0) return buildFilterState(allEvents)
    const coins: CoinId[] = ['BTC', 'ETH', 'SOL', 'TAO']
    const sources: EventSource[] = ['political', 'news', 'social']
    const state = {} as FilterState
    for (const coin of coins) {
      state[coin] = {} as Record<EventSource, Set<string>>
      for (const source of sources) {
        state[coin][source] = new Set<string>()
      }
    }
    return state
  }, [filterState, allEvents])

  const allAuthors = useMemo(() => {
    const result: Record<EventSource, string[]> = {
      political: [],
      news: [],
      social: [],
    }
    const instId = COIN_INST_ID[selectedCoin]
    const sources: EventSource[] = ['political', 'news', 'social']
    for (const source of sources) {
      const authors = allEvents
        .filter((e) => (e.coin === instId || e.coin === 'ALL') && e.source === source)
        .map((e) => e.author)
      result[source] = Array.from(new Set(authors))
    }
    return result
  }, [selectedCoin, allEvents])

  const filteredEvents = useMemo(() => {
    const instId = COIN_INST_ID[selectedCoin]
    const coinFilter = effectiveFilter[selectedCoin]
    return allEvents.filter((e) => {
      if (e.coin !== instId && e.coin !== 'ALL') return false
      return coinFilter[e.source]?.has(e.author) ?? false
    })
  }, [selectedCoin, effectiveFilter, allEvents])

  function handleFilterChange(newFilter: FilterState) {
    setFilterState(newFilter)
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-main)' }}>
      <TopBar
        selectedCoin={selectedCoin}
        onCoinChange={setSelectedCoin}
        currentPrice={currentPrice}
        priceChange24h={priceChange24h}
        filterState={effectiveFilter}
        onFilterChange={handleFilterChange}
        allAuthors={allAuthors}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
      <PanelGroup orientation="horizontal" className="flex-1">
        <Panel defaultSize={70} minSize={40}>
          {loading && candles.length === 0 ? (
            <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
              Loading chart data...
            </div>
          ) : (
            <Chart candles={candles} events={filteredEvents} />
          )}
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

- [ ] **Step 2: Verify the app compiles**

```bash
npx next build 2>&1 | head -20
```

Or just run `npm run dev:client` and check for errors in the console.

- [ ] **Step 3: Commit**

```bash
git add components/Terminal.tsx
git commit -m "feat: wire time range state to candles and events"
```

---

### Task 9: Add Shift+Drag Zoom and Density Filter to Chart

**Files:**
- Modify: `components/Chart.tsx`

- [ ] **Step 1: Update Chart.tsx with zoom overlay and density filtering**

Replace the entire file:

```typescript
'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  createSeriesMarkers,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarkerBar,
  type Time,
  type ISeriesMarkersPluginApi,
} from 'lightweight-charts'
import { Candle, CatalystEvent, EVENT_COLORS } from '@/lib/types'
import { filterOverlappingEvents } from '@/lib/eventDensity'
import EventTooltip from './EventTooltip'

interface ChartProps {
  candles: Candle[]
  events: CatalystEvent[]
}

export default function Chart({ candles, events }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)

  const [tooltip, setTooltip] = useState<{
    event: CatalystEvent
    x: number
    y: number
  } | null>(null)

  // Zoom state
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomDrag, setZoomDrag] = useState<{
    startX: number
    currentX: number
  } | null>(null)
  const isDraggingRef = useRef(false)

  // Chart initialization
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#0b0e11' },
        textColor: '#848e9c',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1b1e23' },
        horzLines: { color: '#1b1e23' },
      },
      crosshair: {
        vertLine: {
          color: '#848e9c40',
          labelBackgroundColor: '#1b1e23',
        },
        horzLine: {
          color: '#848e9c40',
          labelBackgroundColor: '#1b1e23',
        },
      },
      timeScale: {
        borderColor: '#1b1e23',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1b1e23',
      },
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderVisible: false,
      wickUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    return () => {
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      markersPluginRef.current = null
    }
  }, [])

  // Update candle data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return

    const candleData = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    const volumeData = candles.map((c) => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? '#0ecb8140' : '#f6465d40',
    }))

    candleSeriesRef.current.setData(candleData)
    volumeSeriesRef.current.setData(volumeData)

    chartRef.current?.timeScale().fitContent()
    setIsZoomed(false)
  }, [candles])

  // Update event markers with density filtering
  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current || candles.length === 0) return

    const timeScale = chartRef.current.timeScale()

    // Filter events to those within candle range
    const first = candles[0]?.time ?? 0
    const last = candles[candles.length - 1]?.time ?? 0
    const inRange = events.filter(
      (e) => e.timestamp >= first && e.timestamp <= last
    )

    // Apply density filtering
    const filtered = filterOverlappingEvents(inRange, candles, timeScale)

    const markers: SeriesMarkerBar<Time>[] = filtered
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((e) => ({
        time: e.timestamp as Time,
        position: 'aboveBar' as const,
        shape: 'circle' as const,
        color: EVENT_COLORS[e.source],
        text: e.headline.slice(0, 25),
        size: 2,
      }))

    if (markersPluginRef.current) {
      markersPluginRef.current.setMarkers(markers)
    } else {
      markersPluginRef.current = createSeriesMarkers(candleSeriesRef.current, markers)
    }
  }, [events, candles])

  // Crosshair move handler for tooltip
  const handleCrosshairMove = useCallback(
    (param: { point?: { x: number; y: number }; time?: Time }) => {
      if (!param.point || !param.time) {
        setTooltip(null)
        return
      }

      const cursorTime = param.time as number
      const threshold = 120
      const nearEvent = events.find(
        (e) => Math.abs(e.timestamp - cursorTime) <= threshold
      )

      if (nearEvent) {
        setTooltip({
          event: nearEvent,
          x: param.point.x,
          y: param.point.y,
        })
      } else {
        setTooltip(null)
      }
    },
    [events]
  )

  // Subscribe to crosshair move
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    chart.subscribeCrosshairMove(handleCrosshairMove)
    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove)
    }
  }, [handleCrosshairMove])

  // Shift+drag zoom handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!e.shiftKey) return
      e.preventDefault()
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      isDraggingRef.current = true
      setZoomDrag({ startX: x, currentX: x })
    },
    []
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      setZoomDrag((prev) => (prev ? { ...prev, currentX: x } : null))
    },
    []
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current || !zoomDrag || !chartRef.current) {
        isDraggingRef.current = false
        setZoomDrag(null)
        return
      }

      isDraggingRef.current = false
      const ts = chartRef.current.timeScale()

      const leftX = Math.min(zoomDrag.startX, zoomDrag.currentX)
      const rightX = Math.max(zoomDrag.startX, zoomDrag.currentX)

      // Need at least 20px drag to count as a zoom
      if (rightX - leftX < 20) {
        setZoomDrag(null)
        return
      }

      const leftLogical = ts.coordinateToLogical(leftX)
      const rightLogical = ts.coordinateToLogical(rightX)

      if (leftLogical !== null && rightLogical !== null) {
        ts.setVisibleLogicalRange({ from: leftLogical, to: rightLogical })
        setIsZoomed(true)
      }

      setZoomDrag(null)
    },
    [zoomDrag]
  )

  function handleResetZoom() {
    chartRef.current?.timeScale().fitContent()
    setIsZoomed(false)
  }

  // Compute overlay rectangle style
  const overlayStyle = zoomDrag
    ? {
        left: Math.min(zoomDrag.startX, zoomDrag.currentX),
        width: Math.abs(zoomDrag.currentX - zoomDrag.startX),
      }
    : null

  return (
    <div
      className="relative w-full h-full"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Zoom selection overlay */}
      {overlayStyle && (
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            left: overlayStyle.left,
            width: overlayStyle.width,
            backgroundColor: 'rgba(240, 185, 11, 0.1)',
            borderLeft: '1px solid var(--accent)',
            borderRight: '1px solid var(--accent)',
          }}
        />
      )}

      {/* Reset zoom button */}
      {isZoomed && (
        <button
          onClick={handleResetZoom}
          className="absolute top-2 right-2 px-2 py-1 text-xs rounded"
          style={{
            backgroundColor: 'var(--bg-panel)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          Reset Zoom
        </button>
      )}

      {tooltip && (
        <EventTooltip event={tooltip.event} x={tooltip.x} y={tooltip.y} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify everything compiles and runs**

```bash
npm run dev
```

Open `http://localhost:3000` and verify:
- Date range picker appears in top bar
- Changing dates refetches candles and events
- Shift+drag on chart shows gold selection rectangle
- Releasing zooms into selected range
- "Reset Zoom" button appears and works
- Events on longer timescales are pruned to non-overlapping high-impact ones

- [ ] **Step 3: Commit**

```bash
git add components/Chart.tsx lib/eventDensity.ts
git commit -m "feat: add Shift+drag zoom and event density filtering to chart"
```
