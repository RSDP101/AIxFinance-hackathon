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
    const update = () => setBook(generateOrderBook(ticker.last, 10));
    update();
    const iv = setInterval(update, 600);
    return () => clearInterval(iv);
  }, [ticker?.last]);

  if (!ticker) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-xs">
        Waiting for data...
      </div>
    );
  }

  const maxTotal = Math.max(
    ...book.asks.map((l: any) => l.total),
    ...book.bids.map((l: any) => l.total),
    1
  );

  const spread = book.asks[0] && book.bids[0]
    ? ((book.asks[0].price - book.bids[0].price) / ticker.last * 100).toFixed(3)
    : '0.000';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-3 py-1.5 border-b border-border">
        Order Book
      </div>

      {/* Column headers */}
      <div className="flex text-[9px] text-text-muted px-3 py-1 border-b border-border/50">
        <span className="flex-1">Price</span>
        <span className="w-16 text-right">Size</span>
        <span className="w-16 text-right">Total</span>
      </div>

      {/* Asks (lowest at bottom) */}
      <div className="flex-1 flex flex-col justify-end overflow-hidden">
        {[...book.asks].reverse().map((level: any, i: number) => {
          const pct = (level.total / maxTotal) * 100;
          return (
            <div key={`a${i}`} className="flex text-[11px] px-3 py-[2px] relative hover:bg-red/5">
              <div
                className="absolute top-0 bottom-0 right-0 opacity-10 depth-bar"
                style={{ background: '#ef4444', width: `${pct}%` }}
              />
              <span className="flex-1 text-red font-tabular relative z-10">
                {formatPrice(level.price, selectedPair)}
              </span>
              <span className="w-16 text-right text-text-secondary font-tabular relative z-10">
                {level.size.toFixed(4)}
              </span>
              <span className="w-16 text-right text-text-muted font-tabular relative z-10">
                {level.total.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Spread / mid price */}
      <div className="flex items-center justify-between px-3 py-1.5 border-y border-border bg-bg-surface-light/50">
        <span className="text-sm font-bold text-text-primary font-tabular">
          ${formatPrice(ticker.last, selectedPair)}
        </span>
        <span className="text-[9px] text-text-muted">
          Spread {spread}%
        </span>
      </div>

      {/* Bids */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {book.bids.map((level: any, i: number) => {
          const pct = (level.total / maxTotal) * 100;
          return (
            <div key={`b${i}`} className="flex text-[11px] px-3 py-[2px] relative hover:bg-green/5">
              <div
                className="absolute top-0 bottom-0 right-0 opacity-10 depth-bar"
                style={{ background: '#22c55e', width: `${pct}%` }}
              />
              <span className="flex-1 text-green font-tabular relative z-10">
                {formatPrice(level.price, selectedPair)}
              </span>
              <span className="w-16 text-right text-text-secondary font-tabular relative z-10">
                {level.size.toFixed(4)}
              </span>
              <span className="w-16 text-right text-text-muted font-tabular relative z-10">
                {level.total.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
