'use client'

import { useState, useMemo } from 'react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { CoinId, EventSource, FilterState, CatalystEvent, COIN_INST_ID } from '@/lib/types'
import { useCandles, useTicker } from '@/hooks/useMarketData'
import { useNewsFeed } from '@/hooks/useNewsFeed'
import { orderBookData } from '@/data/orderbook'
import TopBar from './TopBar'
import Chart from './Chart'
import OrderBook from './OrderBook'

function buildFilterState(events: CatalystEvent[]): FilterState {
  const coins: CoinId[] = ['BTC', 'ETH', 'SOL', 'TAO']
  const sources: EventSource[] = ['political', 'news', 'social']

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
  const { candles, loading } = useCandles(selectedCoin)
  const ticker = useTicker(selectedCoin)
  const allEvents = useNewsFeed()
  const [filterState, setFilterState] = useState<FilterState | null>(null)

  const orderBook = orderBookData[selectedCoin] ?? orderBookData.BTC

  const currentPrice = ticker?.last ?? candles[candles.length - 1]?.close ?? 0
  const priceChange24h = ticker?.change24h ?? 0

  // Build initial filter state once events arrive
  const effectiveFilter = useMemo(() => {
    if (filterState) return filterState
    if (allEvents.length > 0) return buildFilterState(allEvents)
    // Default empty filter
    const coins: CoinId[] = ['BTC', 'ETH', 'SOL', 'TAO']
    const sources: EventSource[] = ['political', 'news', 'social']
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
      political: [],
      news: [],
      social: [],
    }
    const instId = COIN_INST_ID[selectedCoin]
    const sources: EventSource[] = ['political', 'news', 'social']
    for (const source of sources) {
      const authors = allEvents
        .filter((e) => (e.coin === instId || e.coin === 'ALL') && e.source === source)
        .map((e) => e.author)
      result[source] = Array.from(new Set(authors))
    }
    return result
  }, [selectedCoin, allEvents])

  // Filter events for selected coin
  const filteredEvents = useMemo(() => {
    const instId = COIN_INST_ID[selectedCoin]
    const coinFilter = effectiveFilter[selectedCoin]
    return allEvents.filter((e) => {
      if (e.coin !== instId && e.coin !== 'ALL') return false
      return coinFilter[e.source]?.has(e.author) ?? false
    })
  }, [selectedCoin, effectiveFilter, allEvents])

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
      />
      <PanelGroup orientation="horizontal" className="flex-1">
        <Panel defaultSize={70} minSize={40}>
          {loading && candles.length === 0 ? (
            <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
              Loading chart data...
            </div>
          ) : (
            <Chart candles={candles} events={filteredEvents} />
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
