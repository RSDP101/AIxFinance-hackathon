'use client'

import { OrderBook as OrderBookType, EventSource, EVENT_COLORS, EVENT_LABELS } from '@/lib/types'

interface OrderBookProps {
  data: OrderBookType
  currentPrice: number
}

export default function OrderBook({ data, currentPrice }: OrderBookProps) {
  const maxTotal = Math.max(
    data.asks[data.asks.length - 1]?.total ?? 0,
    data.bids[data.bids.length - 1]?.total ?? 0
  )

  const spread = data.asks[0] && data.bids[0]
    ? data.asks[0].price - data.bids[0].price
    : 0
  const spreadPercent = currentPrice > 0 ? (spread / currentPrice) * 100 : 0

  return (
    <div
      className="flex flex-col h-full text-xs"
      style={{ backgroundColor: 'var(--bg-panel)' }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 font-bold text-xs tracking-wider border-b"
        style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
      >
        ORDER BOOK
      </div>

      {/* Column headers */}
      <div
        className="grid grid-cols-3 px-3 py-1 text-right border-b"
        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
      >
        <span>Price (USDT)</span>
        <span>Size</span>
        <span>Total</span>
      </div>

      {/* Asks (reversed so lowest ask is at bottom, nearest to spread) */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end px-1">
        {[...data.asks].reverse().map((level, i) => (
          <div key={`ask-${i}`} className="relative grid grid-cols-3 px-2 py-[2px] text-right font-mono">
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundColor: 'var(--red)',
                width: `${(level.total / maxTotal) * 100}%`,
                right: 0,
                left: 'auto',
              }}
            />
            <span style={{ color: 'var(--red)' }}>{level.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span style={{ color: 'var(--text-primary)' }}>{level.size.toFixed(3)}</span>
            <span style={{ color: 'var(--text-secondary)' }}>{level.total.toFixed(3)}</span>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div
        className="px-3 py-2 text-center font-mono border-y"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
          ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
        <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
          Spread: {spread.toFixed(2)} ({spreadPercent.toFixed(3)}%)
        </span>
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-hidden px-1">
        {data.bids.map((level, i) => (
          <div key={`bid-${i}`} className="relative grid grid-cols-3 px-2 py-[2px] text-right font-mono">
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundColor: 'var(--green)',
                width: `${(level.total / maxTotal) * 100}%`,
                right: 0,
                left: 'auto',
              }}
            />
            <span style={{ color: 'var(--green)' }}>{level.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span style={{ color: 'var(--text-primary)' }}>{level.size.toFixed(3)}</span>
            <span style={{ color: 'var(--text-secondary)' }}>{level.total.toFixed(3)}</span>
          </div>
        ))}
      </div>

      {/* Event Legend */}
      <div
        className="px-3 py-2 border-t flex flex-wrap gap-3"
        style={{ borderColor: 'var(--border)' }}
      >
        {(['truthsocial', 'news', 'twitter'] as EventSource[]).map((source) => (
          <div key={source} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: EVENT_COLORS[source] }}
            />
            <span style={{ color: 'var(--text-muted)' }} className="text-[10px]">
              {EVENT_LABELS[source]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
