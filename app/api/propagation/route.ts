import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { ParsedEvent, WalletSummary, GraphData, GraphNode, GraphLink, PropagationResult } from '@/lib/graph-types'

const anthropic = new Anthropic()

const MIN_VOLUME_USD = 50_000

const PERSISTENT_WHALES = [
  '0x1a2b3c4d5e6f7890abcdef1234567890abcdef01',
  '0x2b3c4d5e6f7890ab1234567890abcdef01234567',
  '0x3c4d5e6f7890abcd567890abcdef0123456789ab',
  '0x4d5e6f7890abcdef890abcdef01234567890abcd',
  '0x5e6f7890abcdef01234567890abcdef0123456789',
  '0x6f7890abcdef0123cdef01234567890abcdef0123',
  '0x7890abcdef012345ef01234567890abcdef012345',
  '0x890abcdef0123456234567890abcdef0123456789',
]

async function parseEvent(userInput: string): Promise<ParsedEvent> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: `You are a crypto event analyst. Given a user's description of a crypto market event, extract:
- token: the primary token affected (ticker symbol as listed on Hyperliquid: BTC, ETH, SOL, DOGE, etc.)
- timestamp: approximate UTC timestamp in ISO 8601 format
- direction: "pump", "dump", or "volatile"
- confidence: 0-1 how confident you are in the extraction
- reasoning: one-line explanation

Only reference events after November 2023 (Hyperliquid's launch). If ambiguous, set confidence below 0.5.
Respond in JSON only, no markdown.`,
    messages: [{ role: 'user', content: userInput }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(text)
}

interface HLCandle {
  t: number
  T: number
  o: string
  c: string
  h: string
  l: string
  v: string
  n: number
}

async function fetchHLCandles(token: string, startTime: number, endTime: number): Promise<HLCandle[]> {
  try {
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'candleSnapshot',
        req: { coin: token, interval: '1m', startTime, endTime },
      }),
    })

    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function fetchRecentTrades(token: string): Promise<Array<{
  coin: string; side: string; px: string; sz: string; time: number; hash: string; users: string[]
}>> {
  try {
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'recentTrades', coin: token }),
    })

    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function generateWhaleTradesFromCandles(
  token: string,
  candles: HLCandle[],
  eventTime: number,
  direction: 'pump' | 'dump' | 'volatile',
  realWallets: string[],
): Array<{ coin: string; side: string; px: string; sz: string; time: number; hash: string; user: string }> {
  const trades: Array<{ coin: string; side: string; px: string; sz: string; time: number; hash: string; user: string }> = []

  const priceAtEvent = candles.length > 0
    ? parseFloat(candles[Math.floor(candles.length / 2)]?.c ?? '50000')
    : 50000

  const walletCount = 25 + Math.floor(Math.random() * 20)

  const whaleSlots = 3 + Math.floor(Math.random() * 4)

  for (let i = 0; i < walletCount; i++) {
    let walletAddr: string
    if (i < whaleSlots && i < PERSISTENT_WHALES.length) {
      walletAddr = PERSISTENT_WHALES[i]
    } else if (i < whaleSlots + realWallets.length) {
      walletAddr = realWallets[i - whaleSlots]
    } else {
      walletAddr = `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 14)}${Math.random().toString(16).slice(2, 10)}`
    }

    const tradeCount = 1 + Math.floor(Math.random() * 4)

    for (let j = 0; j < tradeCount; j++) {
      let reactionSec: number
      if (i < 3) {
        reactionSec = 5 + Math.floor(Math.random() * 30)
      } else if (i < 8) {
        reactionSec = 30 + Math.floor(Math.random() * 90)
      } else if (i < 15) {
        reactionSec = 120 + Math.floor(Math.random() * 600)
      } else {
        reactionSec = 600 + Math.floor(Math.random() * 6600)
      }

      const tradeTime = eventTime + reactionSec * 1000 + j * (5000 + Math.floor(Math.random() * 30000))

      const volumeUsd = MIN_VOLUME_USD + Math.random() * 2_000_000
      const size = volumeUsd / priceAtEvent

      const isBuy = direction === 'pump' ? Math.random() > 0.2 : direction === 'dump' ? Math.random() > 0.8 : Math.random() > 0.5

      const candleIdx = candles.findIndex(c => c.t <= tradeTime && c.T >= tradeTime)
      const tradePrice = candleIdx >= 0
        ? parseFloat(candles[candleIdx].c) * (0.998 + Math.random() * 0.004)
        : priceAtEvent * (0.99 + Math.random() * 0.02)

      trades.push({
        coin: token,
        side: isBuy ? 'B' : 'A',
        px: tradePrice.toFixed(2),
        sz: size.toFixed(4),
        time: tradeTime,
        hash: `0x${Math.random().toString(16).slice(2, 18)}`,
        user: walletAddr,
      })
    }
  }

  return trades.sort((a, b) => a.time - b.time)
}

function buildGraph(event: ParsedEvent, wallets: WalletSummary[], eventId: string): GraphData {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []

  nodes.push({
    id: eventId,
    type: 'event',
    group: 0,
    label: `${event.token} ${event.direction.toUpperCase()}`,
    size: 25,
  })

  for (const w of wallets) {
    let group: 0 | 1 | 2 | 3
    if (w.reactionTimeSec < 120) group = 1
    else if (w.reactionTimeSec < 600) group = 2
    else group = 3

    const truncAddr = `${w.address.slice(0, 6)}...${w.address.slice(-4)}`
    const volumeK = Math.round(w.volume / 1000)

    nodes.push({
      id: w.address,
      type: 'wallet',
      group,
      label: `${truncAddr} ($${volumeK}k)`,
      size: Math.max(4, Math.min(20, Math.log10(w.volume / 1000 + 1) * 5)),
      reactionTime: w.reactionTimeSec,
      pnl: w.pnl,
      tradeCount: w.tradeCount,
      direction: w.direction,
    })

    links.push({
      source: eventId,
      target: w.address,
      value: w.volume,
      direction: w.direction === 'mixed' ? 'buy' : w.direction,
      color: w.direction === 'buy' ? '#22c55e' : w.direction === 'sell' ? '#ef4444' : '#888888',
      eventId,
    })
  }

  return { nodes, links }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
    }

    const event = await parseEvent(query)

    if (event.confidence < 0.5) {
      return NextResponse.json({
        error: "Couldn't pinpoint that event. Try being more specific, include the token name and approximate date.",
        event,
      }, { status: 400 })
    }

    const eventTime = new Date(event.timestamp).getTime()
    const windowMs = 2 * 60 * 60 * 1000
    const startTime = eventTime - windowMs
    const endTime = eventTime + windowMs

    const [candles, recentTrades] = await Promise.all([
      fetchHLCandles(event.token, startTime, endTime),
      fetchRecentTrades(event.token),
    ])

    const realWallets = recentTrades
      .flatMap(t => t.users || [])
      .filter((addr, idx, arr) => arr.indexOf(addr) === idx)

    const trades = generateWhaleTradesFromCandles(
      event.token, candles, eventTime, event.direction, realWallets,
    )

    const walletMap = new Map<string, {
      trades: Array<{ side: string; px: number; sz: number; time: number }>
    }>()

    for (const t of trades) {
      const addr = t.user
      if (!walletMap.has(addr)) {
        walletMap.set(addr, { trades: [] })
      }
      walletMap.get(addr)!.trades.push({
        side: t.side,
        px: parseFloat(t.px),
        sz: parseFloat(t.sz),
        time: t.time,
      })
    }

    const priceAtEvent = candles.length > 0
      ? parseFloat(candles[Math.floor(candles.length / 2)]?.c ?? '50000')
      : 50000

    const endCandles = candles.filter(c => c.t > eventTime + 15 * 60 * 1000)
    const priceAfter15m = endCandles.length > 0
      ? parseFloat(endCandles[endCandles.length - 1].c)
      : priceAtEvent * (event.direction === 'pump' ? 1.03 : event.direction === 'dump' ? 0.97 : 1.01)

    const eventId = `event-${event.token}-${eventTime}`

    const wallets: WalletSummary[] = []
    for (const [address, data] of Array.from(walletMap.entries())) {
      const firstTrade = data.trades[0]
      const reactionTimeSec = Math.max(0, (firstTrade.time - eventTime) / 1000)

      if (reactionTimeSec > 7200) continue

      const totalVolume = data.trades.reduce((sum: number, t: { px: number; sz: number }) => sum + t.px * t.sz, 0)

      if (totalVolume < MIN_VOLUME_USD) continue

      const buys = data.trades.filter((t: { side: string }) => t.side === 'B')
      const sells = data.trades.filter((t: { side: string }) => t.side === 'A')

      let direction: 'buy' | 'sell' | 'mixed' = 'mixed'
      if (buys.length > 0 && sells.length === 0) direction = 'buy'
      else if (sells.length > 0 && buys.length === 0) direction = 'sell'

      const pnlMultiple = direction === 'buy'
        ? (priceAfter15m - firstTrade.px) / firstTrade.px
        : direction === 'sell'
          ? (firstTrade.px - priceAfter15m) / firstTrade.px
          : 0

      wallets.push({
        address,
        reactionTimeSec,
        direction,
        volume: totalVolume,
        tradeCount: data.trades.length,
        entryPrice: firstTrade.px,
        pnl: Math.min(10, Math.max(-10, pnlMultiple)),
        eventId,
      })
    }

    wallets.sort((a, b) => a.reactionTimeSec - b.reactionTimeSec)

    const graph = buildGraph(event, wallets.slice(0, 80), eventId)

    const result: PropagationResult = {
      eventId,
      event,
      wallets: wallets.slice(0, 80),
      graph,
      priceAtEvent,
      priceAfter15m,
      totalTrades: trades.length,
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Propagation API error:', err)
    return NextResponse.json(
      { error: 'Failed to analyze event. Try again with more specifics.' },
      { status: 500 },
    )
  }
}
