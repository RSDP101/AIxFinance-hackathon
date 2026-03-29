import { useTradingStore } from '../store/tradingStore';
import { PAIRS } from '../types/market';
import type { Pair } from '../types/market';
import type { EventSource } from '../types/events';
import { EVENT_COLORS, EVENT_LABELS } from '../types/events';
import { formatPrice, formatPercent, formatVolume } from '../utils/formatters';
import { TrendingUp, Wallet } from 'lucide-react';

export default function TopBar() {
  const selectedPair = useTradingStore((s) => s.selectedPair);
  const setSelectedPair = useTradingStore((s) => s.setSelectedPair);
  const tickers = useTradingStore((s) => s.tickers);
  const balance = useTradingStore((s) => s.balance);
  const filters = useTradingStore((s) => s.filters);
  const toggleFilter = useTradingStore((s) => s.toggleFilter);

  const ticker = tickers[selectedPair];
  const isPositive = ticker ? ticker.change24h >= 0 : true;

  const filterSources: EventSource[] = ['political', 'news', 'social'];
  const filterEmoji: Record<EventSource, string> = {
    political: '🟠',
    news: '🔵',
    social: '🟣',
  };

  return (
    <div className="flex items-center justify-between px-4 bg-bg-surface border-b border-border h-12 shrink-0">
      {/* Left: Logo + Pairs */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 mr-2">
          <TrendingUp className="w-5 h-5 text-purple" />
          <span className="font-bold text-base text-yellow tracking-tight">AIx</span>
          <span className="font-bold text-base tracking-tight">Terminal</span>
        </div>

        <div className="flex items-center gap-0.5 bg-bg-primary/50 rounded-md p-0.5">
          {PAIRS.map((pair) => (
            <button
              key={pair}
              onClick={() => setSelectedPair(pair as Pair)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                selectedPair === pair
                  ? 'bg-purple text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {pair.replace('-', '/')}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Price stats */}
      <div className="flex items-center gap-5">
        {ticker ? (
          <>
            <div className={`text-xl font-bold font-tabular ${isPositive ? 'text-green' : 'text-red'}`}>
              ${formatPrice(ticker.last, selectedPair)}
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex flex-col items-end">
                <span className="text-text-muted text-[9px]">24h Change</span>
                <span className={`font-semibold font-tabular ${isPositive ? 'text-green' : 'text-red'}`}>
                  {formatPercent(ticker.change24h)}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-text-muted text-[9px]">High</span>
                <span className="text-text-primary font-tabular">${formatPrice(ticker.high24h, selectedPair)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-text-muted text-[9px]">Low</span>
                <span className="text-text-primary font-tabular">${formatPrice(ticker.low24h, selectedPair)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-text-muted text-[9px]">Volume</span>
                <span className="text-text-primary font-tabular">{formatVolume(ticker.vol24h)}</span>
              </div>
            </div>
          </>
        ) : (
          <span className="text-text-muted text-sm animate-pulse">Connecting to OKX...</span>
        )}
      </div>

      {/* Right: Filters + Balance */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1">
          {filterSources.map((src) => (
            <button
              key={src}
              onClick={() => toggleFilter(src)}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer border"
              style={{
                borderColor: filters[src] ? EVENT_COLORS[src] : '#2d2554',
                backgroundColor: filters[src] ? EVENT_COLORS[src] + '15' : 'transparent',
                color: filters[src] ? EVENT_COLORS[src] : '#6b6380',
              }}
            >
              {filterEmoji[src]} {EVENT_LABELS[src]}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-1.5 bg-bg-surface-light/50 px-2.5 py-1 rounded-md">
          <Wallet className="w-3.5 h-3.5 text-yellow" />
          <span className="text-[11px] font-bold font-tabular">
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
