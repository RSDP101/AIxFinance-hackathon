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

  const scored = events
    .map((e) => ({ event: e, score: scoreEvent(e, candles) }))
    .sort((a, b) => a.event.timestamp - b.event.timestamp)

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
