import type { CatalystEvent } from '../../types/events';
import { EVENT_COLORS, EVENT_LABELS } from '../../types/events';
import { timeAgo, formatNumber } from '../../utils/formatters';

interface Props {
  event: CatalystEvent;
  x: number;
  y: number;
}

export default function EventTooltip({ event, x, y }: Props) {
  const color = EVENT_COLORS[event.source];

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: x + 12, top: y - 10 }}
    >
      <div className="bg-bg-surface border border-border rounded-lg p-3 shadow-2xl max-w-xs">
        {/* Category badge */}
        <div
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mb-2"
          style={{ backgroundColor: color + '20', color }}
        >
          {EVENT_LABELS[event.source]}
        </div>

        {/* Author line */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">{event.avatar}</span>
          <div>
            <span className="text-sm font-bold text-text-primary">{event.author}</span>
            {event.handle && (
              <span className="text-xs text-text-muted ml-1.5">{event.handle}</span>
            )}
          </div>
        </div>

        {/* Headline */}
        <p className="text-sm font-semibold text-text-primary mb-1">{event.headline}</p>

        {/* Content preview */}
        <p className="text-xs text-text-secondary mb-2 line-clamp-2">{event.content}</p>

        {/* Price impact */}
        {event.priceImpact && (
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-xs font-bold"
              style={{ color: event.priceImpact.direction === 'up' ? '#22c55e' : '#ef4444' }}
            >
              {event.priceImpact.direction === 'up' ? '↑' : '↓'}{' '}
              {event.priceImpact.direction === 'up' ? '+' : '-'}
              {event.priceImpact.percent}% in {event.priceImpact.windowMinutes}min
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor:
                  event.sentiment === 'bullish' ? '#22c55e20' :
                  event.sentiment === 'bearish' ? '#ef444420' : '#9891a820',
                color:
                  event.sentiment === 'bullish' ? '#22c55e' :
                  event.sentiment === 'bearish' ? '#ef4444' : '#9891a8',
              }}
            >
              {event.sentiment}
            </span>
          </div>
        )}

        {/* Footer: platform + time + engagement */}
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{event.platform}</span>
          <span>{timeAgo(event.timestamp)}</span>
          {event.likes && <span>❤ {formatNumber(event.likes)}</span>}
          {event.reposts && <span>🔁 {formatNumber(event.reposts)}</span>}
        </div>
      </div>
    </div>
  );
}
