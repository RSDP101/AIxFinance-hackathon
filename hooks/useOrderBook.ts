'use client'

import { useEffect, useState } from 'react'
import { OrderBook, CoinId, COIN_INST_ID, SERVER_URL } from '@/lib/types'

export function useOrderBook(coin: CoinId) {
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null)
  const instId = COIN_INST_ID[coin]

  useEffect(() => {
    let active = true

    async function fetchBook() {
      try {
        const res = await fetch(`${SERVER_URL}/api/orderbook?instId=${instId}&sz=15`)
        const data = await res.json()
        if (active && data.asks && data.bids) {
          setOrderBook(data)
        }
      } catch (err) {
        console.error('Failed to fetch orderbook:', err)
      }
    }

    fetchBook()
    const interval = setInterval(fetchBook, 2000) // poll every 2 seconds

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [instId])

  return orderBook
}
