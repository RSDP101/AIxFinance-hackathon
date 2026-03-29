# Timescale, Zoom & UI Improvements — Design Spec

## Overview

Three UI enhancements to the CryptoSignal Terminal:
1. **Date range picker** in the top bar — select arbitrary start/end times, candle size auto-selects
2. **Shift+drag range zoom** — hold Shift and drag on the chart to zoom into a selected region
3. **Event density filtering** — when events overlap visually, keep only those preceding the biggest price moves

Additionally: no vertical scrolling (already enforced, maintain it), and events are fetched for the selected time range via a new REST endpoint.

## 1. Date Range Picker

### UI
Two datetime inputs in the top bar, between the coin tabs and the price display. Styled to match the dark terminal aesthetic (dark background inputs, subtle border, monospace font). Labels: "From" and "To".

Default range on load: last 5 hours (matching current 1m/300-candle behavior).

### Auto Candle Size Selection

When the user changes the date range, the candle bar size is computed from the span:

```typescript
function selectBarSize(rangeSeconds: number): string {
  if (rangeSeconds < 2 * 3600) return '1m';        // < 2 hours
  if (rangeSeconds < 12 * 3600) return '5m';       // 2-12 hours
  if (rangeSeconds < 2 * 86400) return '15m';      // 12h - 2 days
  if (rangeSeconds < 7 * 86400) return '1H';       // 2-7 days
  if (rangeSeconds < 30 * 86400) return '4H';      // 7-30 days
  return '1D';                                      // 30+ days
}
```

### Data Flow on Range Change

1. Compute `barSize` from `(to - from)` seconds
2. Fetch candles: `GET /api/candles?instId=BTC-USDT&bar=1H&after=<from_ms>&before=<to_ms>`
   - OKX candles endpoint accepts `after` (unix ms, fetch candles after this time) and `before` (unix ms, fetch candles before this time)
3. Fetch events: `GET /api/events?from=<from_unix>&to=<to_unix>`
4. Chart renders with new data, calls `fitContent()`
5. WebSocket live candle updates continue — new candles that fall within the range are appended

### State

`Terminal.tsx` gains:
```typescript
const [timeRange, setTimeRange] = useState<{ from: number; to: number }>({
  from: Math.floor(Date.now() / 1000) - 5 * 3600,
  to: Math.floor(Date.now() / 1000),
});
```

`selectedTimeframe` (bar size) is derived, not stored — computed from `timeRange` via `selectBarSize()`.

### Server Changes

Update `server/src/routes/market.ts` candles endpoint to pass `after` and `before` to OKX:
```
GET /api/candles?instId=BTC-USDT&bar=1H&after=1711900000000&before=1712504000000
```

OKX API docs: `after` and `before` are unix timestamps in milliseconds.

## 2. Shift+Drag Range Zoom

### Interaction
1. User holds Shift and presses mouse button on the chart
2. During drag, a semi-transparent overlay rectangle is drawn (full chart height, spanning the drag region horizontally). Color: `rgba(240, 185, 11, 0.1)` (accent gold, low opacity) with `1px solid var(--accent)` vertical edges.
3. On mouse release, the chart zooms to the selected time range via `chart.timeScale().setVisibleLogicalRange()`
4. A small "Reset" button appears in the top-right corner of the chart panel
5. Clicking "Reset" calls `chart.timeScale().fitContent()` to restore the full view
6. The "Reset" button disappears after clicking

### Implementation
- A transparent overlay `div` is positioned absolutely over the chart container
- Event listeners: `mousedown`, `mousemove`, `mouseup` on the overlay
- Only activates when `event.shiftKey === true`; otherwise, events pass through to the chart (pointer-events: none when Shift is not held)
- Uses `chart.timeScale().coordinateToTime(x)` to convert pixel X positions to timestamps
- Uses `chart.timeScale().coordinateToLogical(x)` for setting the visible logical range
- This is a **view-only zoom** — it does not change the date range inputs or refetch data

### Component
Add zoom state and overlay rendering directly in `Chart.tsx`:
- `isZoomDragging: boolean`
- `zoomStart: number | null` (pixel X)
- `zoomEnd: number | null` (pixel X)
- `isZoomed: boolean` (controls Reset button visibility)

## 3. Event Density Filtering

### Purpose
When many events would overlap visually (especially on longer timescales), show only the most impactful ones — those preceding the biggest price changes.

### Algorithm

```typescript
function filterOverlappingEvents(
  events: CatalystEvent[],
  candles: Candle[],
  timeScale: ITimeScaleApi,
  minPixelGap: number = 40
): CatalystEvent[] {
  // 1. Score each event by price impact
  //    For each event, find the candle at event.timestamp, then look at
  //    the next 5 candles. Score = max absolute % change from event candle's close.

  // 2. Sort events by timestamp

  // 3. Walk left to right. For each pair of adjacent events:
  //    - Convert timestamps to pixel X via timeScale.timeToCoordinate()
  //    - If pixel distance < minPixelGap, remove the one with lower score

  // 4. Repeat pass until no overlaps remain

  // Return filtered array
}
```

### Price Impact Scoring

```typescript
function scoreEvent(event: CatalystEvent, candles: Candle[]): number {
  // Find the candle at or just after the event timestamp
  const eventIdx = candles.findIndex(c => c.time >= event.timestamp);
  if (eventIdx < 0) return 0;

  const basePrice = candles[eventIdx].close;
  let maxChange = 0;

  // Look at next 5 candles
  for (let i = 1; i <= 5 && eventIdx + i < candles.length; i++) {
    const change = Math.abs(candles[eventIdx + i].close - basePrice) / basePrice;
    maxChange = Math.max(maxChange, change);
  }

  return maxChange;
}
```

### Where Applied
Called in `Chart.tsx` inside the event markers `useEffect`, before building the markers array. Uses `chartRef.current.timeScale()` for pixel coordinate conversion.

### Zoom Adaptation
Because filtering uses pixel distance, it automatically adapts to zoom level:
- Zoomed out → more overlap → fewer events shown (only biggest movers)
- Zoomed in → less overlap → more events visible

## 4. Events REST API

### New Endpoint

`GET /api/events`

Query parameters:
- `from` (optional): unix timestamp (seconds), start of range
- `to` (optional): unix timestamp (seconds), end of range

Response:
```json
{
  "events": [CatalystEvent, ...]
}
```

### Implementation

New route file: `server/src/routes/events.ts`

```typescript
// Reads from catalystEvents (hardcoded) + getAllLiveEvents() (from liveFeedManager)
// Filters by timestamp range if from/to provided
```

Register in `server/src/index.ts`: `app.use('/api', eventsRoutes);`

### Client Integration

New hook or extension of `useNewsFeed`:
- On date range change, fetch `GET /api/events?from=X&to=Y`
- Merge with any live WebSocket events that fall within range
- Pass merged array to Chart

## 5. No Vertical Scroll

Already enforced via `body { overflow: hidden }` in globals.css and `h-screen flex flex-col` in Terminal.tsx. The date range picker inputs must fit within the existing 48px top bar height. Use compact datetime inputs styled inline.

## Files to Modify

| Action | File | Change |
|--------|------|--------|
| Modify | `components/TopBar.tsx` | Add date range picker inputs, pass timeRange up |
| Modify | `components/Chart.tsx` | Add Shift+drag zoom overlay, Reset button, event density filtering |
| Modify | `components/Terminal.tsx` | Add timeRange state, pass to useCandles and events fetch |
| Modify | `hooks/useMarketData.ts` | Accept timeRange + auto bar size, pass after/before to API |
| Create | `hooks/useEvents.ts` | REST fetch for events by time range, merge with WebSocket |
| Modify | `hooks/useNewsFeed.ts` | Keep for WebSocket live events, used by useEvents for merging |
| Create | `server/src/routes/events.ts` | REST endpoint for events with time range filter |
| Modify | `server/src/routes/market.ts` | Pass after/before params to OKX candles API |
| Modify | `server/src/index.ts` | Register events route |
| Create | `lib/eventDensity.ts` | filterOverlappingEvents + scoreEvent utilities |
| Create | `lib/barSize.ts` | selectBarSize utility |
