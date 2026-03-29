'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Candle, TickerData, CoinId, COIN_INST_ID, SERVER_URL, WS_URL } from '@/lib/types'

export function useCandles(coin: CoinId) {
  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const instId = COIN_INST_ID[coin]

  // Fetch historical candles
  useEffect(() => {
    setLoading(true)
    fetch(`${SERVER_URL}/api/candles?instId=${instId}&bar=1m&limit=300`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCandles(data)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch candles:', err)
        setLoading(false)
      })
  }, [instId])

  // Subscribe to real-time candle updates
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/market`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'candle' && msg.data.instId === instId) {
          const c: Candle = {
            time: msg.data.time,
            open: msg.data.open,
            high: msg.data.high,
            low: msg.data.low,
            close: msg.data.close,
            volume: msg.data.volume,
          }
          setCandles((prev) => {
            if (prev.length === 0) return [c]
            const last = prev[prev.length - 1]
            if (last.time === c.time) {
              // Update existing candle
              return [...prev.slice(0, -1), c]
            } else if (c.time > last.time) {
              // New candle
              return [...prev, c]
            }
            return prev
          })
        }
      } catch {}
    }

    ws.onerror = (err) => console.error('Market WS error:', err)

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [instId])

  return { candles, loading }
}

export function useTicker(coin: CoinId) {
  const [ticker, setTicker] = useState<TickerData | null>(null)
  const instId = COIN_INST_ID[coin]

  // Fetch initial ticker
  useEffect(() => {
    fetch(`${SERVER_URL}/api/ticker?instId=${instId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.instId) setTicker(data)
      })
      .catch((err) => console.error('Failed to fetch ticker:', err))
  }, [instId])

  // Subscribe to real-time ticker updates
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/market`)

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'ticker' && msg.data.instId === instId) {
          setTicker(msg.data)
        }
      } catch {}
    }

    return () => ws.close()
  }, [instId])

  return ticker
}
