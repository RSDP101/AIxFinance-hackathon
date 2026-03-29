import type { CatalystEvent } from '../../types/events';
import { EVENT_COLORS } from '../../types/events';
import { timeAgo, formatNumber } from '../../utils/formatters';
import { useTradingStore } from '../../store/tradingStore';

interface Props {
  event: CatalystEvent;
  isNew?: boolean;
}

export default function SocialPost({ event, isNew }: Props) {
  const setScrollToTimestamp = useTradingStore((s) => s.setScrollToTimestamp);

  const platformColor = event.platform === 'Truth Social' ? '#4a90d9' : '#e2e0ea';
  const platformBg = event.platform === 'Truth Social' ? '#4a90d920' : '#e2e0ea15';

  return (
    <div
      onClick={() => setScrollToTimestamp(event.timestamp)}
      className={`p-3 border border-border rounded-lg bg-bg-surface hover:bg-bg-surface-light transition-all cursor-pointer ${
        isNew ? 'animate-new-item' : ''
      }`}
    >
      {/* Header: avatar, name, handle, platform, time */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{event.avatar}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-text-primary truncate">{event.author}</span>
            <svg className="w-3.5 h-3.5 text-blue shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            {event.handle && <span>{event.handle}</span>}
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-medium"
              style={{ backgroundColor: platformBg, color: platformColor }}
            >
              {event.platform}
            </span>
            <span>{timeAgo(event.timestamp)}</span>
          </div>
        </div>
        {/* Source indicator dot */}
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: EVENT_COLORS[event.source] }}
        />
      </div>

      {/* Content */}
      <p className="text-[13px] text-text-primary leading-relaxed mb-2">
        {event.content}
      </p>

      {/* Footer: impact + engagement */}
      <div className="flex items-center gap-3 text-[11px] text-text-muted">
        {event.priceImpact && (
          <span
            className="font-medium"
            style={{ color: event.priceImpact.direction === 'up' ? '#22c55e' : '#ef4444' }}
          >
            {event.priceImpact.direction === 'up' ? '↑' : '↓'} {event.priceImpact.percent}% in {event.priceImpact.windowMinutes}m
          </span>
        )}
        {event.likes && <span>❤ {formatNumber(event.likes)}</span>}
        {event.reposts && <span>🔁 {formatNumber(event.reposts)}</span>}
      </div>
    </div>
  );
}
