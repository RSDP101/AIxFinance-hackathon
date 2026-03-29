'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { CatalystEvent, WS_URL } from '@/lib/types'

export function useNewsFeed() {
  const [events, setEvents] = useState<CatalystEvent[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/news`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'initial_events' && Array.isArray(msg.data)) {
          setEvents(msg.data)
        } else if (msg.type === 'new_event' && msg.data) {
          setEvents((prev) => [msg.data, ...prev])
        }
      } catch {}
    }

    ws.onerror = (err) => console.error('News WS error:', err)

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [])

  return events
}
