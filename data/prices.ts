import { Candle, CoinId } from '@/lib/types'

// Seeded PRNG (mulberry32) — deterministic across server/client
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function generateCandles(
  startPrice: number,
  count: number,
  startTime: number,
  volatility: number,
  seed: number
): Candle[] {
  const rand = mulberry32(seed)
  const candles: Candle[] = []
  let price = startPrice

  for (let i = 0; i < count; i++) {
    const change = (rand() - 0.48) * volatility * price
    const open = price
    const close = price + change
    const high = Math.max(open, close) + rand() * volatility * price * 0.5
    const low = Math.min(open, close) - rand() * volatility * price * 0.5
    const volume = Math.round(100 + rand() * 900)

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

const START_TIME = 1711929600
const CANDLE_COUNT = 168

export const priceData: Record<CoinId, Candle[]> = {
  BTC: generateCandles(67500, CANDLE_COUNT, START_TIME, 0.003, 12345),
  ETH: generateCandles(3550, CANDLE_COUNT, START_TIME, 0.004, 67890),
  SOL: generateCandles(160, CANDLE_COUNT, START_TIME, 0.006, 24680),
}
