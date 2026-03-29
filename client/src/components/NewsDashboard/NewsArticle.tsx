import type { CatalystEvent } from '../../types/events';
import { EVENT_COLORS } from '../../types/events';
import { timeAgo } from '../../utils/formatters';
import { useTradingStore } from '../../store/tradingStore';

interface Props {
  event: CatalystEvent;
  isNew?: boolean;
}

const SOURCE_COLORS: Record<string, string> = {
  'The New York Times': '#999',
  'Washington Post': '#999',
  'Reuters': '#FF8C00',
  'Bloomberg': '#FF6600',
  'BBC News': '#BB1919',
  'CoinDesk': '#0A6EBD',
  'CNBC': '#008456',
  'The Block': '#000',
  'Financial Times': '#FCD0B1',
};

export default function NewsArticle({ event, isNew }: Props) {
  const setScrollToTimestamp = useTradingStore((s) => s.setScrollToTimestamp);

  return (
    <div
      onClick={() => setScrollToTimestamp(event.timestamp)}
      className={`p-3 border rounded-lg bg-bg-surface hover:bg-bg-surface-light/80 transition-all cursor-pointer group ${
        isNew ? 'animate-new-item' : 'border-border'
      }`}
    >
      {/* Source header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: EVENT_COLORS[event.source] }}
          />
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: SOURCE_COLORS[event.author] || '#9891a8' }}
          >
            {event.author}
          </span>
        </div>
        <span className="text-[10px] text-text-muted">{timeAgo(event.timestamp)}</span>
      </div>

      {/* Headline */}
      <h3 className="text-[13px] font-bold text-text-primary leading-snug mb-1.5 group-hover:text-purple-light transition-colors">
        {event.headline}
      </h3>

      {/* Summary */}
      <p className="text-[11px] text-text-secondary leading-relaxed mb-2">
        {event.content}
      </p>

      {/* Impact */}
      {event.priceImpact && (
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-bold"
            style={{ color: event.priceImpact.direction === 'up' ? '#22c55e' : '#ef4444' }}
          >
            {event.priceImpact.direction === 'up' ? '↑' : '↓'} {event.priceImpact.percent}%
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor:
                event.sentiment === 'bullish' ? '#22c55e12' :
                event.sentiment === 'bearish' ? '#ef444412' : '#9891a812',
              color:
                event.sentiment === 'bullish' ? '#22c55e' :
                event.sentiment === 'bearish' ? '#ef4444' : '#9891a8',
            }}
          >
            {event.sentiment}
          </span>
        </div>
      )}
    </div>
  );
}
