'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { CoinId, EventSource, FilterState, CatalystEvent, COIN_INST_ID } from '@/lib/types'
import { useCandles, useTicker } from '@/hooks/useMarketData'
import { useEvents } from '@/hooks/useEvents'
import { orderBookData } from '@/data/orderbook'
import { useOrderBook } from '@/hooks/useOrderBook'
import TopBar from './TopBar'
import Chart from './Chart'
import OrderBook from './OrderBook'

type RangePreset = '1H' | '6H' | '24H' | '7D'

const PRESET_SECONDS: Record<RangePreset, number> = {
  '1H': 3600,
  '6H': 6 * 3600,
  '24H': 24 * 3600,
  '7D': 7 * 24 * 3600,
}

function parseCoinParam(value: string | null): CoinId {
  if (value === 'BTC' || value === 'ETH' || value === 'SOL' || value === 'TAO') {
    return value
  }
  return 'BTC'
}

function parseTimeRangeParams(params: URLSearchParams): { from: number; to: number } {
  const now = Math.floor(Date.now() / 1000)
  const fallback = { from: now - 5 * 3600, to: now }

  const from = Number.parseInt(params.get('from') ?? '', 10)
  const to = Number.parseInt(params.get('to') ?? '', 10)

  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
    return fallback
  }

  return { from, to }
}

function buildFilterState(events: CatalystEvent[]): FilterState {
  const coins: CoinId[] = ['BTC', 'ETH', 'SOL', 'TAO']
  const sources: EventSource[] = ['truthsocial', 'news', 'twitter']

  const state = {} as FilterState
  for (const coin of coins) {
    state[coin] = {} as Record<EventSource, Set<string>>
    const instId = COIN_INST_ID[coin]
    for (const source of sources) {
      const authors = events
        .filter((e) => (e.coin === instId || e.coin === 'ALL') && e.source === source)
        .map((e) => e.author)
      state[coin][source] = new Set(authors)
    }
  }
  return state
}

export default function Terminal() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialCoin = useMemo(() => parseCoinParam(searchParams.get('coin')), [searchParams])
  const initialTimeRange = useMemo(
    () => parseTimeRangeParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
  )
  const [selectedCoin, setSelectedCoin] = useState<CoinId>(initialCoin)
  const [timeRange, setTimeRange] = useState<{ from: number; to: number }>(initialTimeRange)
  const { candles, loading } = useCandles(selectedCoin, timeRange)
  const ticker = useTicker(selectedCoin)
  const { events: allEvents, loadingEvents } = useEvents(timeRange)
  const [filterState, setFilterState] = useState<FilterState | null>(null)

  const liveOrderBook = useOrderBook(selectedCoin)
  const orderBook = liveOrderBook ?? orderBookData[selectedCoin] ?? orderBookData.BTC

  const currentPrice = ticker?.last ?? candles[candles.length - 1]?.close ?? 0
  const priceChange24h = ticker?.change24h ?? 0

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('coin', selectedCoin)
    params.set('from', String(timeRange.from))
    params.set('to', String(timeRange.to))

    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return

    const nextUrl = `${pathname}?${nextQuery}`
    router.replace(nextUrl, { scroll: false })
  }, [pathname, router, searchParams, selectedCoin, timeRange.from, timeRange.to])

  // Build initial filter state once events arrive
  const effectiveFilter = useMemo(() => {
    if (filterState) return filterState
    if (allEvents.length > 0) return buildFilterState(allEvents)
    // Default empty filter
    const coins: CoinId[] = ['BTC', 'ETH', 'SOL', 'TAO']
    const sources: EventSource[] = ['truthsocial', 'news', 'twitter']
    const state = {} as FilterState
    for (const coin of coins) {
      state[coin] = {} as Record<EventSource, Set<string>>
      for (const source of sources) {
        state[coin][source] = new Set<string>()
      }
    }
    return state
  }, [filterState, allEvents])

  // Get all authors per source for the selected coin
  const allAuthors = useMemo(() => {
    const result: Record<EventSource, string[]> = {
      truthsocial: [],
      news: [],
      twitter: [],
    }
    const instId = COIN_INST_ID[selectedCoin]
    const sources: EventSource[] = ['truthsocial', 'news', 'twitter']
    for (const source of sources) {
      const authors = allEvents
        .filter((e) => (e.coin === instId || e.coin === 'ALL') && e.source === source)
        .map((e) => e.author)
      result[source] = Array.from(new Set(authors))
    }
    return result
  }, [selectedCoin, allEvents])

  // Filter events for selected coin and calculate price impact from candles
  const filteredEvents = useMemo(() => {
    const instId = COIN_INST_ID[selectedCoin]
    const coinFilter = effectiveFilter[selectedCoin]
    const filtered = allEvents.filter((e) => {
      if (e.coin !== instId && e.coin !== 'ALL') return false
      return coinFilter[e.source]?.has(e.author) ?? false
    })

    // Enrich events that lack priceImpact with calculated values from candles
    if (candles.length < 2) return filtered

    const candleInterval = candles[1].time - candles[0].time

    return filtered.map((e) => {
      if (e.priceImpact) return e // already has impact data

      const idx = candles.findIndex((c) => c.time >= e.timestamp)
      if (idx < 0 || idx >= candles.length - 1) return e

      const basePrice = candles[idx].close

      // Scale look-ahead based on candle interval:
      // 1m candles → look ahead ~60 candles (1 hour)
      // 1H candles → look ahead ~24 candles (1 day)
      // 4H candles → look ahead ~6 candles (1 day)
      // 1D candles → look ahead ~3 candles (3 days)
      let lookAheadCandles: number
      if (candleInterval <= 60) lookAheadCandles = 60        // 1m → 1 hour
      else if (candleInterval <= 300) lookAheadCandles = 24  // 5m → 2 hours
      else if (candleInterval <= 900) lookAheadCandles = 16  // 15m → 4 hours
      else if (candleInterval <= 3600) lookAheadCandles = 24 // 1H → 1 day
      else if (candleInterval <= 14400) lookAheadCandles = 6 // 4H → 1 day
      else lookAheadCandles = 3                               // 1D → 3 days

      const lookAhead = Math.min(lookAheadCandles, candles.length - idx - 1)
      if (lookAhead < 1) return e

      let maxChange = 0
      let direction: 'up' | 'down' = 'up'

      for (let i = 1; i <= lookAhead; i++) {
        const change = (candles[idx + i].close - basePrice) / basePrice
        if (Math.abs(change) > Math.abs(maxChange)) {
          maxChange = change
          direction = change >= 0 ? 'up' : 'down'
        }
      }

      if (Math.abs(maxChange) < 0.001) return e // less than 0.1%, skip

      const windowMinutes = Math.round((lookAhead * candleInterval) / 60)

      return {
        ...e,
        priceImpact: {
          percent: Math.abs(maxChange * 100),
          direction,
          windowMinutes,
        },
      }
    })
  }, [selectedCoin, effectiveFilter, allEvents, candles])

  const activePreset = useMemo(() => {
    const now = Math.floor(Date.now() / 1000)
    const rangeSeconds = timeRange.to - timeRange.from
    const isAnchoredNearNow = Math.abs(now - timeRange.to) < 120

    if (!isAnchoredNearNow) return null

    return (Object.entries(PRESET_SECONDS) as Array<[RangePreset, number]>).find(
      ([, seconds]) => Math.abs(rangeSeconds - seconds) < 120
    )?.[0] ?? null
  }, [timeRange.from, timeRange.to])

  function handleFilterChange(newFilter: FilterState) {
    setFilterState(newFilter)
  }

  const handlePresetSelect = useCallback((preset: RangePreset) => {
    const to = Math.floor(Date.now() / 1000)
    setTimeRange({ from: to - PRESET_SECONDS[preset], to })
  }, [])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      return true
    } catch {
      return false
    }
  }, [])

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-main)' }}>
      <TopBar
        selectedCoin={selectedCoin}
        onCoinChange={setSelectedCoin}
        currentPrice={currentPrice}
        priceChange24h={priceChange24h}
        filterState={effectiveFilter}
        onFilterChange={handleFilterChange}
        allAuthors={allAuthors}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        activePreset={activePreset}
        onPresetSelect={handlePresetSelect}
        onCopyLink={handleCopyLink}
      />
      <PanelGroup orientation="horizontal" className="flex-1">
        <Panel defaultSize={70} minSize={40}>
          {loading && candles.length === 0 ? (
            <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
              Loading chart data...
            </div>
          ) : (
            <div className="relative w-full h-full">
              <Chart candles={candles} events={filteredEvents} />
              {loadingEvents && (
                <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded z-20"
                  style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)' }}>
                  <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Loading events...</span>
                </div>
              )}
            </div>
          )}
        </Panel>
        <PanelResizeHandle
          className="w-1 transition-colors hover:bg-[var(--accent)]"
          style={{ backgroundColor: 'var(--border)' }}
        />
        <Panel defaultSize={30} minSize={20}>
          <OrderBook data={orderBook} currentPrice={currentPrice} />
        </Panel>
      </PanelGroup>
    </div>
  )
}
