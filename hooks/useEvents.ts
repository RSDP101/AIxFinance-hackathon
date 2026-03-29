'use client'

import { useEffect, useState } from 'react'
import { CatalystEvent, SERVER_URL } from '@/lib/types'
import { useNewsFeed } from './useNewsFeed'

export function useEvents(timeRange: { from: number; to: number }) {
  const [restEvents, setRestEvents] = useState<CatalystEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const wsEvents = useNewsFeed()

  useEffect(() => {
    setLoadingEvents(true)
    fetch(`${SERVER_URL}/api/events?from=${timeRange.from}&to=${timeRange.to}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.events && Array.isArray(data.events)) {
          setRestEvents(data.events)
        }
      })
      .catch((err) => console.error('Failed to fetch events:', err))
      .finally(() => setLoadingEvents(false))
  }, [timeRange.from, timeRange.to])

  const merged = [...restEvents]
  const restIds = new Set(restEvents.map((e) => e.id))

  for (const wsEvent of wsEvents) {
    if (
      !restIds.has(wsEvent.id) &&
      wsEvent.timestamp >= timeRange.from &&
      wsEvent.timestamp <= timeRange.to
    ) {
      merged.push(wsEvent)
    }
  }

  merged.sort((a, b) => a.timestamp - b.timestamp)
  return { events: merged, loadingEvents }
}
