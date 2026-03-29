'use client'

import { CatalystEvent, EVENT_COLORS, EVENT_LABELS } from '@/lib/types'

interface EventTooltipProps {
  event: CatalystEvent
  x: number
  y: number
}

export default function EventTooltip({ event, x, y }: EventTooltipProps) {
  const color = EVENT_COLORS[event.source]

  const impactColor =
    event.priceImpact?.direction === 'up' ? 'var(--green)' : 'var(--red)'
  const impactArrow = event.priceImpact?.direction === 'up' ? '↑' : '↓'
  const impactSign = event.priceImpact?.direction === 'up' ? '+' : '-'

  const windowLabel = event.priceImpact
    ? event.priceImpact.windowMinutes >= 60
      ? `${event.priceImpact.windowMinutes / 60}hr`
      : `${event.priceImpact.windowMinutes}min`
    : ''

  const date = new Date(event.timestamp * 1000)
  const formattedTime = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return (
    <div
      className="absolute z-50 rounded-lg shadow-2xl p-3 max-w-[280px]"
      style={{
        left: x + 12,
        top: y - 20,
        backgroundColor: 'var(--bg-panel)',
        border: `1px solid ${color}40`,
      }}
    >
      {/* Source label */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-medium uppercase" style={{ color }}>
          {EVENT_LABELS[event.source]}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {event.platform}
        </span>
      </div>

      {/* Headline */}
      <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        {event.headline}
      </div>

      {/* Author + time */}
      <div className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>
        {event.avatar} {event.author}
        {event.handle && (
          <span style={{ color: 'var(--text-secondary)' }}> {event.handle}</span>
        )}
        <span className="ml-2">{formattedTime}</span>
      </div>

      {/* Content */}
      <div className="text-[11px] mb-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {event.content.length > 120 ? event.content.slice(0, 120) + '...' : event.content}
      </div>

      {/* Price impact */}
      {event.priceImpact && (
        <div className="text-xs font-mono font-bold" style={{ color: impactColor }}>
          {impactArrow} {impactSign}{event.priceImpact.percent.toFixed(1)}% in {windowLabel}
        </div>
      )}

      {/* Social stats */}
      {(event.likes || event.reposts) && (
        <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
          {event.likes && `${(event.likes / 1000).toFixed(0)}K likes`}
          {event.likes && event.reposts && ' · '}
          {event.reposts && `${(event.reposts / 1000).toFixed(0)}K reposts`}
        </div>
      )}

      {/* Analyze button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          const q = encodeURIComponent(event.headline)
          window.open(`/graph?q=${q}`, '_blank')
        }}
        className="mt-2 w-full px-2 py-1 text-[10px] font-bold rounded cursor-pointer"
        style={{
          backgroundColor: 'rgba(240, 185, 11, 0.15)',
          color: '#f0b90b',
          border: '1px solid rgba(240, 185, 11, 0.3)',
        }}
      >
        ANALYZE PROPAGATION →
      </button>
    </div>
  )
}
