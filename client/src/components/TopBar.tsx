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
    <div className="flex items-center justify-between px-4 py-2 bg-bg-surface border-b border-border h-14 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple" />
          <span className="font-bold text-lg text-yellow">AIx</span>
          <span className="font-bold text-lg">Terminal</span>
        </div>

        <div className="flex items-center gap-1 ml-4">
          {PAIRS.map((pair) => (
            <button
              key={pair}
              onClick={() => setSelectedPair(pair as Pair)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                selectedPair === pair
                  ? 'bg-purple text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-light'
              }`}
            >
              {pair.replace('-', '/')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-6">
        {ticker ? (
          <>
            <div className={`text-xl font-bold font-tabular ${isPositive ? 'text-green' : 'text-red'}`}>
              ${formatPrice(ticker.last, selectedPair)}
            </div>
            <div className="flex flex-col text-xs text-text-secondary">
              <span>24h</span>
              <span className={`font-medium ${isPositive ? 'text-green' : 'text-red'}`}>
                {formatPercent(ticker.change24h)}
              </span>
            </div>
            <div className="flex flex-col text-xs text-text-secondary">
              <span>High</span>
              <span className="text-text-primary font-tabular">${formatPrice(ticker.high24h, selectedPair)}</span>
            </div>
            <div className="flex flex-col text-xs text-text-secondary">
              <span>Low</span>
              <span className="text-text-primary font-tabular">${formatPrice(ticker.low24h, selectedPair)}</span>
            </div>
            <div className="flex flex-col text-xs text-text-secondary">
              <span>Vol</span>
              <span className="text-text-primary font-tabular">{formatVolume(ticker.vol24h)}</span>
            </div>
          </>
        ) : (
          <span className="text-text-muted text-sm">Connecting...</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Filter toggles */}
        <div className="flex items-center gap-1">
          {filterSources.map((src) => (
            <button
              key={src}
              onClick={() => toggleFilter(src)}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border"
              style={{
                borderColor: filters[src] ? EVENT_COLORS[src] : '#2d2554',
                backgroundColor: filters[src] ? EVENT_COLORS[src] + '20' : 'transparent',
                color: filters[src] ? EVENT_COLORS[src] : '#6b6380',
              }}
            >
              {filterEmoji[src]} {EVENT_LABELS[src]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-bg-surface-light px-3 py-1.5 rounded-lg">
          <Wallet className="w-4 h-4 text-yellow" />
          <span className="text-xs text-text-secondary">Balance:</span>
          <span className="text-xs font-bold font-tabular">
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
