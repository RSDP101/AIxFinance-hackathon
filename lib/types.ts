export type EventSource = 'political' | 'news' | 'crypto_twitter'

export type CoinId = 'BTC' | 'ETH' | 'SOL'

export interface SignalEvent {
  id: string
  source: EventSource
  sourceAuthor: string
  sourceHandle?: string
  coin: CoinId
  timestamp: number
  headline: string
  summary: string
  url?: string
  priceImpact?: {
    percent: number
    direction: 'up' | 'down'
    windowMinutes: number
  }
  sentiment?: 'bullish' | 'bearish' | 'neutral'
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OrderBookLevel {
  price: number
  size: number
  total: number
}

export interface OrderBook {
  asks: OrderBookLevel[]
  bids: OrderBookLevel[]
}

export type FilterState = Record<CoinId, Record<EventSource, Set<string>>>

export const EVENT_COLORS: Record<EventSource, string> = {
  political: '#FF9800',
  news: '#2196F3',
  crypto_twitter: '#9C27B0',
}

export const EVENT_LABELS: Record<EventSource, string> = {
  political: 'Political',
  news: 'News',
  crypto_twitter: 'Crypto Twitter',
}

export const COINS: CoinId[] = ['BTC', 'ETH', 'SOL']
