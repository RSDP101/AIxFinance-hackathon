import { useState, useEffect } from 'react';
import { useTradingStore } from '../../store/tradingStore';
import { generateOrderBook } from '../../utils/orderBookSim';
import { formatPrice } from '../../utils/formatters';

export default function OrderBook() {
  const selectedPair = useTradingStore((s) => s.selectedPair);
  const ticker = useTradingStore((s) => s.tickers[s.selectedPair]);
  const [book, setBook] = useState({ bids: [] as any[], asks: [] as any[] });

  useEffect(() => {
    if (!ticker) return;
    const update = () => setBook(generateOrderBook(ticker.last, 12));
    update();
    const iv = setInterval(update, 500);
    return () => clearInterval(iv);
  }, [ticker?.last]);

  if (!ticker) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
        Loading...
      </div>
    );
  }

  const maxTotal = Math.max(
    ...book.asks.map((l: any) => l.total),
    ...book.bids.map((l: any) => l.total),
    1
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="text-xs font-bold text-text-secondary px-3 py-2 border-b border-border">
        ORDER BOOK
      </div>

      {/* Header */}
      <div className="flex text-[10px] text-text-muted px-3 py-1 border-b border-border">
        <span className="flex-1">Price (USDT)</span>
        <span className="w-20 text-right">Size</span>
        <span className="w-20 text-right">Total</span>
      </div>

      {/* Asks (reversed so lowest ask is at bottom) */}
      <div className="flex-1 flex flex-col justify-end overflow-hidden">
        {[...book.asks].reverse().map((level: any, i: number) => (
          <div key={`a${i}`} className="flex text-[11px] px-3 py-[1px] relative">
            <div
              className="absolute inset-0 opacity-15"
              style={{
                background: '#ef4444',
                width: `${(level.total / maxTotal) * 100}%`,
                marginLeft: 'auto',
              }}
            />
            <span className="flex-1 text-red font-tabular relative z-10">
              {formatPrice(level.price, selectedPair)}
            </span>
            <span className="w-20 text-right text-text-secondary font-tabular relative z-10">
              {level.size.toFixed(4)}
            </span>
            <span className="w-20 text-right text-text-muted font-tabular relative z-10">
              {level.total.toFixed(4)}
            </span>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div className="flex items-center justify-center py-1.5 border-y border-border bg-bg-surface-light">
        <span className="text-sm font-bold text-text-primary font-tabular">
          ${formatPrice(ticker.last, selectedPair)}
        </span>
        <span className="text-[10px] text-text-muted ml-2">
          Spread: {((book.asks[0]?.price - book.bids[0]?.price) / ticker.last * 100).toFixed(3)}%
        </span>
      </div>

      {/* Bids */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {book.bids.map((level: any, i: number) => (
          <div key={`b${i}`} className="flex text-[11px] px-3 py-[1px] relative">
            <div
              className="absolute inset-0 opacity-15"
              style={{
                background: '#22c55e',
                width: `${(level.total / maxTotal) * 100}%`,
                marginLeft: 'auto',
              }}
            />
            <span className="flex-1 text-green font-tabular relative z-10">
              {formatPrice(level.price, selectedPair)}
            </span>
            <span className="w-20 text-right text-text-secondary font-tabular relative z-10">
              {level.size.toFixed(4)}
            </span>
            <span className="w-20 text-right text-text-muted font-tabular relative z-10">
              {level.total.toFixed(4)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
