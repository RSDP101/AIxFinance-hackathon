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

  const isTruth = event.platform === 'Truth Social';

  return (
    <div
      onClick={() => setScrollToTimestamp(event.timestamp)}
      className={`p-3 border rounded-lg bg-bg-surface hover:bg-bg-surface-light/80 transition-all cursor-pointer group ${
        isNew ? 'animate-new-item' : 'border-border'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-2.5 mb-2">
        <span className="text-xl leading-none mt-0.5">{event.avatar}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-text-primary truncate">{event.author}</span>
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill={isTruth ? '#4a90d9' : '#1d9bf0'}>
              <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.88 13.43 2 12 2s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81C9.33 21.12 10.57 22 12 22s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91C21.12 14.67 22 13.43 22 12zm-11.07 4.83-3.54-3.54 1.41-1.41 2.13 2.12 4.24-4.24 1.41 1.42-5.65 5.65z" />
            </svg>
            <span
              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
              style={{
                backgroundColor: isTruth ? '#4a90d915' : '#1d9bf015',
                color: isTruth ? '#4a90d9' : '#8899a6',
              }}
            >
              {event.platform}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-0.5">
            {event.handle && <span>{event.handle}</span>}
            <span>·</span>
            <span>{timeAgo(event.timestamp)}</span>
          </div>
        </div>
        <div
          className="w-2 h-2 rounded-full shrink-0 mt-1.5"
          style={{ backgroundColor: EVENT_COLORS[event.source] }}
        />
      </div>

      {/* Content */}
      <p className="text-[13px] text-text-primary leading-relaxed mb-2.5 pl-[34px]">
        {event.content}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-4 text-[11px] text-text-muted pl-[34px]">
        {event.priceImpact && (
          <span
            className="font-semibold"
            style={{ color: event.priceImpact.direction === 'up' ? '#22c55e' : '#ef4444' }}
          >
            {event.priceImpact.direction === 'up' ? '↑' : '↓'} {event.priceImpact.percent}% in {event.priceImpact.windowMinutes}m
          </span>
        )}
        {event.likes != null && <span className="hover:text-red transition-colors">♥ {formatNumber(event.likes)}</span>}
        {event.reposts != null && <span className="hover:text-green transition-colors">⟳ {formatNumber(event.reposts)}</span>}
      </div>
    </div>
  );
}
