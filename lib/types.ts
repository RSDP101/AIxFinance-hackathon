export type EventSource = 'truthsocial' | 'news' | 'twitter'

export type CoinId = 'BTC' | 'ETH' | 'SOL' | 'TAO'

// OKX instrument IDs
export const COIN_INST_ID: Record<CoinId, string> = {
  BTC: 'BTC-USDT',
  ETH: 'ETH-USDT',
  SOL: 'SOL-USDT',
  TAO: 'TAO-USDT',
}

export interface CatalystEvent {
  id: string
  source: EventSource
  author: string
  handle?: string
  avatar: string
  coin: string // e.g. 'BTC-USDT' or 'ALL'
  timestamp: number
  headline: string
  content: string
  platform: string
  priceImpact?: {
    percent: number
    direction: 'up' | 'down'
    windowMinutes: number
  }
  sentiment: 'bullish' | 'bearish' | 'neutral'
  likes?: number
  reposts?: number
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TickerData {
  instId: string
  last: number
  open24h: number
  high24h: number
  low24h: number
  vol24h: number
  change24h: number
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
  truthsocial: '#FF9800',
  news: '#2196F3',
  twitter: '#9C27B0',
}

export const EVENT_LABELS: Record<EventSource, string> = {
  truthsocial: 'Truth Social',
  news: 'News',
  twitter: 'Twitter/X',
}

export const COINS: CoinId[] = ['BTC', 'ETH', 'SOL', 'TAO']

export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
