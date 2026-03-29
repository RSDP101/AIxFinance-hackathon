import { OrderBook, CoinId } from '@/lib/types'

function generateOrderBook(midPrice: number, spreadPercent: number, levels: number): OrderBook {
  const halfSpread = midPrice * spreadPercent / 200
  const asks = []
  const bids = []
  let askTotal = 0
  let bidTotal = 0

  for (let i = 0; i < levels; i++) {
    const askSize = Math.round((0.1 + Math.random() * 2) * 1000) / 1000
    askTotal += askSize
    asks.push({
      price: Math.round((midPrice + halfSpread + i * midPrice * 0.0005) * 100) / 100,
      size: askSize,
      total: Math.round(askTotal * 1000) / 1000,
    })

    const bidSize = Math.round((0.1 + Math.random() * 2) * 1000) / 1000
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
  BTC: generateOrderBook(67800, 0.02, 8),
  ETH: generateOrderBook(3580, 0.03, 8),
  SOL: generateOrderBook(162, 0.05, 8),
}
