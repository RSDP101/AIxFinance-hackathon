'use client'

import { CoinId, EventSource, FilterState, COINS, EVENT_COLORS, EVENT_LABELS } from '@/lib/types'
import { useState, useRef, useEffect } from 'react'

interface TopBarProps {
  selectedCoin: CoinId
  onCoinChange: (coin: CoinId) => void
  currentPrice: number
  priceChange24h: number
  filterState: FilterState
  onFilterChange: (filterState: FilterState) => void
  allAuthors: Record<EventSource, string[]>
}

export default function TopBar({
  selectedCoin,
  onCoinChange,
  currentPrice,
  priceChange24h,
  filterState,
  onFilterChange,
  allAuthors,
}: TopBarProps) {
  const [openPopover, setOpenPopover] = useState<EventSource | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopover(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const coinFilter = filterState[selectedCoin]

  function isCategoryActive(source: EventSource): boolean {
    return coinFilter[source].size > 0
  }

  function toggleCategory(source: EventSource) {
    const newFilter = { ...filterState }
    const current = coinFilter[source]
    const all = allAuthors[source]

    if (current.size === all.length) {
      newFilter[selectedCoin] = {
        ...coinFilter,
        [source]: new Set<string>(),
      }
    } else {
      newFilter[selectedCoin] = {
        ...coinFilter,
        [source]: new Set(all),
      }
    }
    onFilterChange(newFilter)
  }

  function toggleAuthor(source: EventSource, author: string) {
    const newFilter = { ...filterState }
    const newSet = new Set(coinFilter[source])
    if (newSet.has(author)) {
      newSet.delete(author)
    } else {
      newSet.add(author)
    }
    newFilter[selectedCoin] = {
      ...coinFilter,
      [source]: newSet,
    }
    onFilterChange(newFilter)
  }

  function handleCategoryClick(source: EventSource) {
    if (openPopover === source) {
      setOpenPopover(null)
    } else {
      setOpenPopover(source)
    }
  }

  const changeColor = priceChange24h >= 0 ? 'var(--green)' : 'var(--red)'
  const changeSign = priceChange24h >= 0 ? '+' : ''

  return (
    <div
      className="flex items-center justify-between px-4 h-12 border-b"
      style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}
    >
      {/* Left: Logo + Coin tabs */}
      <div className="flex items-center gap-4">
        <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>
          CryptoSignal
        </span>
        <div className="flex gap-1">
          {COINS.map((coin) => (
            <button
              key={coin}
              onClick={() => onCoinChange(coin)}
              className="px-3 py-1 text-xs font-bold rounded transition-colors"
              style={{
                backgroundColor:
                  selectedCoin === coin ? 'var(--accent)' : 'transparent',
                color:
                  selectedCoin === coin ? '#0b0e11' : 'var(--text-secondary)',
              }}
            >
              {coin}
            </button>
          ))}
        </div>
      </div>

      {/* Center-right: Price */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-bold">
          ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="font-mono text-xs" style={{ color: changeColor }}>
          {changeSign}{priceChange24h.toFixed(2)}%
        </span>
      </div>

      {/* Right: Filter toggles */}
      <div className="flex items-center gap-2 relative" ref={popoverRef}>
        {(['political', 'news', 'crypto_twitter'] as EventSource[]).map((source) => {
          const active = isCategoryActive(source)
          return (
            <div key={source} className="relative">
              <button
                onClick={() => handleCategoryClick(source)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  toggleCategory(source)
                }}
                className="px-3 py-1 text-xs font-medium rounded-full border transition-colors"
                style={{
                  backgroundColor: active ? EVENT_COLORS[source] + '20' : 'transparent',
                  borderColor: active ? EVENT_COLORS[source] : 'var(--border)',
                  color: active ? EVENT_COLORS[source] : 'var(--text-muted)',
                }}
              >
                {EVENT_LABELS[source]}
              </button>

              {openPopover === source && (
                <div
                  className="absolute top-full right-0 mt-1 py-2 px-3 rounded-lg shadow-xl z-50 min-w-[200px]"
                  style={{
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="text-xs font-medium" style={{ color: EVENT_COLORS[source] }}>
                      {EVENT_LABELS[source]}
                    </span>
                    <button
                      onClick={() => toggleCategory(source)}
                      className="text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {coinFilter[source].size === allAuthors[source].length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  {allAuthors[source].map((author) => (
                    <label
                      key={author}
                      className="flex items-center gap-2 py-1 cursor-pointer text-xs"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <input
                        type="checkbox"
                        checked={coinFilter[source].has(author)}
                        onChange={() => toggleAuthor(source, author)}
                        className="rounded"
                        style={{ accentColor: EVENT_COLORS[source] }}
                      />
                      {author}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
