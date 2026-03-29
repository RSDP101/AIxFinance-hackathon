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

/**
 * Deduplicates events so only ONE event per candle is shown (the highest-impact one).
 * Then applies pixel-gap filtering so markers don't visually overlap.
 */
export function filterOverlappingEvents(
  events: CatalystEvent[],
  candles: Candle[],
  timeScale: ITimeScaleApi<Time>,
  minPixelGap: number = 60
): CatalystEvent[] {
  if (events.length === 0) return events

  // Score all events
  const scored = events
    .map((e) => ({ event: e, score: scoreEvent(e, candles) }))

  // Step 1: Deduplicate per candle — only keep the highest-scoring event per candle time
  // Snap to nearest actual candle time (same logic as Chart.tsx marker placement)
  function snapToCandle(ts: number): number {
    let closest = candles[0]?.time ?? ts
    let minDist = Math.abs(ts - closest)
    for (const c of candles) {
      const d = Math.abs(ts - c.time)
      if (d < minDist) { minDist = d; closest = c.time }
      if (c.time > ts) break
    }
    return closest
  }

  const perCandle = new Map<number, { event: CatalystEvent; score: number }>()

  for (const s of scored) {
    const candleTime = snapToCandle(s.event.timestamp)
    const existing = perCandle.get(candleTime)
    if (!existing || s.score > existing.score) {
      perCandle.set(candleTime, s)
    }
  }

  // Step 2: Sort by timestamp and apply pixel-gap filtering
  let filtered = Array.from(perCandle.values())
    .sort((a, b) => a.event.timestamp - b.event.timestamp)

  let changed = true
  while (changed) {
    changed = false
    const next: typeof filtered = [filtered[0]]

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
