import { Candle, CoinId } from '@/lib/types'

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

const START_TIME = 1711929600
const CANDLE_COUNT = 168

export const priceData: Record<CoinId, Candle[]> = {
  BTC: generateCandles(67500, CANDLE_COUNT, START_TIME, 0.003),
  ETH: generateCandles(3550, CANDLE_COUNT, START_TIME, 0.004),
  SOL: generateCandles(160, CANDLE_COUNT, START_TIME, 0.006),
}
