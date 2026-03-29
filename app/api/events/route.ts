import { NextRequest, NextResponse } from 'next/server'
import { eventData } from '@/data/events'
import { CoinId, EventSource } from '@/lib/types'

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const coin = params.get('coin') as CoinId | null
  const source = params.get('source') as EventSource | null
  const author = params.get('author')
  const from = params.get('from')
  const to = params.get('to')

  if (!coin) {
    return NextResponse.json(
      { error: 'coin parameter is required' },
      { status: 400 }
    )
  }

  let events = eventData.filter((e) => e.coin === coin)

  if (source) {
    events = events.filter((e) => e.source === source)
  }
  if (author) {
    events = events.filter((e) => e.sourceAuthor === author)
  }
  if (from) {
    events = events.filter((e) => e.timestamp >= Number(from))
  }
  if (to) {
    events = events.filter((e) => e.timestamp <= Number(to))
  }

  const sources = Array.from(new Set(events.map((e) => e.source)))

  return NextResponse.json({
    events,
    meta: {
      coin,
      count: events.length,
      sources,
    },
  })
}
