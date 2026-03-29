'use client'

import { useState, useMemo } from 'react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { CoinId, EventSource, FilterState } from '@/lib/types'
import { priceData } from '@/data/prices'
import { orderBookData } from '@/data/orderbook'
import { eventData } from '@/data/events'
import TopBar from './TopBar'
import Chart from './Chart'
import OrderBook from './OrderBook'

function buildInitialFilterState(): FilterState {
  const coins: CoinId[] = ['BTC', 'ETH', 'SOL']
  const sources: EventSource[] = ['political', 'news', 'crypto_twitter']

  const state = {} as FilterState
  for (const coin of coins) {
    state[coin] = {} as Record<EventSource, Set<string>>
    for (const source of sources) {
      const authors = eventData
        .filter((e) => e.coin === coin && e.source === source)
        .map((e) => e.sourceAuthor)
      state[coin][source] = new Set(authors)
    }
  }
  return state
}

export default function Terminal() {
  const [selectedCoin, setSelectedCoin] = useState<CoinId>('BTC')
  const [filterState, setFilterState] = useState<FilterState>(buildInitialFilterState)

  const candles = priceData[selectedCoin]
  const orderBook = orderBookData[selectedCoin]

  const lastCandle = candles[candles.length - 1]
  const firstCandle = candles[0]
  const currentPrice = lastCandle?.close ?? 0
  const priceChange24h = firstCandle
    ? ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100
    : 0

  const allAuthors = useMemo(() => {
    const result: Record<EventSource, string[]> = {
      political: [],
      news: [],
      crypto_twitter: [],
    }
    const sources: EventSource[] = ['political', 'news', 'crypto_twitter']
    for (const source of sources) {
      const authors = eventData
        .filter((e) => e.coin === selectedCoin && e.source === source)
        .map((e) => e.sourceAuthor)
      result[source] = Array.from(new Set(authors))
    }
    return result
  }, [selectedCoin])

  const filteredEvents = useMemo(() => {
    const coinFilter = filterState[selectedCoin]
    return eventData.filter((e) => {
      if (e.coin !== selectedCoin) return false
      return coinFilter[e.source].has(e.sourceAuthor)
    })
  }, [selectedCoin, filterState])

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-main)' }}>
      <TopBar
        selectedCoin={selectedCoin}
        onCoinChange={setSelectedCoin}
        currentPrice={currentPrice}
        priceChange24h={priceChange24h}
        filterState={filterState}
        onFilterChange={setFilterState}
        allAuthors={allAuthors}
      />
      <PanelGroup orientation="horizontal" className="flex-1">
        <Panel defaultSize={70} minSize={40}>
          <Chart candles={candles} events={filteredEvents} />
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
