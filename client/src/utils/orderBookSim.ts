import type { OrderBookLevel } from '../types/market';

export function generateOrderBook(
  midPrice: number,
  levels: number = 12
): { bids: OrderBookLevel[]; asks: OrderBookLevel[] } {
  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];

  const spreadPct = 0.0001 + Math.random() * 0.0004;
  const spread = midPrice * spreadPct;

  let bidTotal = 0;
  let askTotal = 0;

  for (let i = 0; i < levels; i++) {
    const dist = 1 + i * 0.5;
    const step = spread * dist;
    const baseSize = (0.5 + Math.random()) * Math.exp(-i * 0.15);
    const mult = midPrice > 1000 ? 0.1 : midPrice > 10 ? 1 : 100;

    const bSize = baseSize * mult * (0.8 + Math.random() * 0.4);
    bidTotal += bSize;
    bids.push({
      price: midPrice - spread / 2 - step * i,
      size: +bSize.toFixed(4),
      total: +bidTotal.toFixed(4),
    });

    const aSize = baseSize * mult * (0.8 + Math.random() * 0.4);
    askTotal += aSize;
    asks.push({
      price: midPrice + spread / 2 + step * i,
      size: +aSize.toFixed(4),
      total: +askTotal.toFixed(4),
    });
  }

  return { bids, asks };
}
