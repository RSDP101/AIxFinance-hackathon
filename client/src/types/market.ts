export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickerData {
  instId: string;
  last: number;
  open24h: number;
  high24h: number;
  low24h: number;
  vol24h: number;
  change24h: number;
  ts: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export const PAIRS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'TAO-USDT'] as const;
export type Pair = (typeof PAIRS)[number];
