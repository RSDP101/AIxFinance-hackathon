import type { CatalystEvent } from '../../types/events';
import { EVENT_COLORS } from '../../types/events';
import { timeAgo } from '../../utils/formatters';
import { useTradingStore } from '../../store/tradingStore';

interface Props {
  event: CatalystEvent;
  isNew?: boolean;
}

export default function NewsArticle({ event, isNew }: Props) {
  const setScrollToTimestamp = useTradingStore((s) => s.setScrollToTimestamp);

  return (
    <div
      onClick={() => setScrollToTimestamp(event.timestamp)}
      className={`p-3 border border-border rounded-lg bg-bg-surface hover:bg-bg-surface-light transition-all cursor-pointer ${
        isNew ? 'animate-new-item' : ''
      }`}
    >
      {/* Source + time header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">{event.avatar}</span>
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">
            {event.author}
          </span>
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: EVENT_COLORS[event.source] }}
          />
        </div>
        <span className="text-[10px] text-text-muted">{timeAgo(event.timestamp)}</span>
      </div>

      {/* Headline */}
      <h3 className="text-[13px] font-bold text-text-primary leading-snug mb-1">
        {event.headline}
      </h3>

      {/* Summary */}
      <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2 mb-2">
        {event.content}
      </p>

      {/* Impact badge */}
      {event.priceImpact && (
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-bold"
            style={{ color: event.priceImpact.direction === 'up' ? '#22c55e' : '#ef4444' }}
          >
            {event.priceImpact.direction === 'up' ? '↑' : '↓'} {event.priceImpact.percent}%
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              backgroundColor:
                event.sentiment === 'bullish' ? '#22c55e15' :
                event.sentiment === 'bearish' ? '#ef444415' : '#9891a815',
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
