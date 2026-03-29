'use client'

import { useState, useMemo } from 'react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { CoinId, EventSource, FilterState, CatalystEvent, COIN_INST_ID } from '@/lib/types'
import { useCandles, useTicker } from '@/hooks/useMarketData'
import { useEvents } from '@/hooks/useEvents'
import { orderBookData } from '@/data/orderbook'
import { useOrderBook } from '@/hooks/useOrderBook'
import TopBar from './TopBar'
import Chart from './Chart'
import OrderBook from './OrderBook'

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
  const [selectedCoin, setSelectedCoin] = useState<CoinId>('BTC')
  const [timeRange, setTimeRange] = useState<{ from: number; to: number }>({
    from: Math.floor(Date.now() / 1000) - 5 * 3600,
    to: Math.floor(Date.now() / 1000),
  })
  const { candles, loading } = useCandles(selectedCoin, timeRange)
  const ticker = useTicker(selectedCoin)
  const { events: allEvents, loadingEvents } = useEvents(timeRange)
  const [filterState, setFilterState] = useState<FilterState | null>(null)

  const liveOrderBook = useOrderBook(selectedCoin)
  const orderBook = liveOrderBook ?? orderBookData[selectedCoin] ?? orderBookData.BTC

  const currentPrice = ticker?.last ?? candles[candles.length - 1]?.close ?? 0
  const priceChange24h = ticker?.change24h ?? 0

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

    return filtered.map((e) => {
      if (e.priceImpact) return e // already has impact data

      const idx = candles.findIndex((c) => c.time >= e.timestamp)
      if (idx < 0) return e

      const basePrice = candles[idx].close
      // Look ahead 5 candles for max price change
      let maxChange = 0
      let direction: 'up' | 'down' = 'up'
      const lookAhead = Math.min(5, candles.length - idx - 1)

      for (let i = 1; i <= lookAhead; i++) {
        const change = (candles[idx + i].close - basePrice) / basePrice
        if (Math.abs(change) > Math.abs(maxChange)) {
          maxChange = change
          direction = change >= 0 ? 'up' : 'down'
        }
      }

      if (Math.abs(maxChange) < 0.001) return e // less than 0.1%, skip

      const candleInterval = candles[1].time - candles[0].time
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

  function handleFilterChange(newFilter: FilterState) {
    setFilterState(newFilter)
  }

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
