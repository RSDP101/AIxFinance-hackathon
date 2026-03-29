'use client'

import { useRef, useLayoutEffect, useState } from 'react'
import { CatalystEvent, EVENT_COLORS, EVENT_LABELS } from '@/lib/types'

interface EventTooltipProps {
  event: CatalystEvent
  x: number
  y: number
}

export default function EventTooltip({ event, x, y }: EventTooltipProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x + 12, top: y - 20 })

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

  // After render, measure tooltip and adjust if it would go off-screen
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const parent = el.offsetParent as HTMLElement | null
    if (!parent) return

    const parentRect = parent.getBoundingClientRect()
    const tipWidth = el.offsetWidth
    const tipHeight = el.offsetHeight

    let left = x + 12
    let top = y - 20

    // Flip left if tooltip would overflow the right edge of the chart panel
    if (left + tipWidth > parentRect.width - 8) {
      left = x - tipWidth - 12
    }

    // Clamp left to not go off the left edge
    if (left < 8) {
      left = 8
    }

    // Flip down if tooltip would go above the chart
    if (top < 8) {
      top = y + 20
    }

    // Flip up if tooltip would go below the chart
    if (top + tipHeight > parentRect.height - 8) {
      top = y - tipHeight - 10
    }

    setPos({ left, top })
  }, [x, y])

  return (
    <div
      ref={ref}
      className="absolute z-50 rounded-lg shadow-2xl p-3 pointer-events-none"
      style={{
        left: pos.left,
        top: pos.top,
        width: 280,
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

      {/* Click hint */}
      <div className="text-[9px] mt-2 pt-1" style={{ color: 'var(--accent)', borderTop: '1px solid var(--border)' }}>
        Click to analyze propagation →
      </div>
    </div>
  )
}
