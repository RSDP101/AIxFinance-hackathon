import { OrderBook, CoinId } from '@/lib/types'

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function generateOrderBook(midPrice: number, spreadPercent: number, levels: number, seed: number): OrderBook {
  const rand = mulberry32(seed)
  const halfSpread = midPrice * spreadPercent / 200
  const asks = []
  const bids = []
  let askTotal = 0
  let bidTotal = 0

  for (let i = 0; i < levels; i++) {
    const askSize = Math.round((0.1 + rand() * 2) * 1000) / 1000
    askTotal += askSize
    asks.push({
      price: Math.round((midPrice + halfSpread + i * midPrice * 0.0005) * 100) / 100,
      size: askSize,
      total: Math.round(askTotal * 1000) / 1000,
    })

    const bidSize = Math.round((0.1 + rand() * 2) * 1000) / 1000
    bidTotal += bidSize
    bids.push({
      price: Math.round((midPrice - halfSpread - i * midPrice * 0.0005) * 100) / 100,
      size: bidSize,
      total: Math.round(bidTotal * 1000) / 1000,
    })
  }

  return { asks, bids }
}

export const orderBookData: Record<CoinId, OrderBook> = {
  BTC: generateOrderBook(67800, 0.02, 8, 11111),
  ETH: generateOrderBook(3580, 0.03, 8, 22222),
  SOL: generateOrderBook(162, 0.05, 8, 33333),
  TAO: generateOrderBook(420, 0.08, 8, 44444),
}
