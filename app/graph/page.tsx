'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { PropagationResult, GraphNode, GraphLink } from '@/lib/graph-types'
import { GROUP_COLORS, GROUP_LABELS, EVENT_COLORS } from '@/lib/graph-types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false }) as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false }) as any

type NodeObject = GraphNode & { x?: number; y?: number; z?: number }

function InsiderPanel({ wallets }: { wallets: Array<{ address: string; eventCount: number; events: string[]; totalVolume: number; avgReaction: number }> }) {
  if (wallets.length === 0) return null

  return (
    <div className="absolute right-4 top-20 w-96 bg-black/90 border border-purple-500/50 rounded-lg p-4 backdrop-blur-sm z-10">
      <h3 className="text-xs font-bold text-purple-400 mb-1 tracking-wider">REPEAT FAST-MOVERS</h3>
      <p className="text-[10px] text-gray-500 mb-3">Wallets appearing across multiple events</p>
      <div className="space-y-3">
        {wallets.map((w, i) => (
          <div key={w.address} className="border border-purple-500/20 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-purple-400 font-bold text-xs">#{i + 1}</span>
                <span className="font-mono text-purple-200 text-xs">{w.address.slice(0, 8)}...{w.address.slice(-6)}</span>
              </div>
              <span className="text-purple-400 font-bold text-sm">{w.eventCount} events</span>
            </div>
            <div className="flex gap-3 text-[10px] text-gray-400">
              <span>Avg reaction: <span className="text-white">{w.avgReaction.toFixed(0)}s</span></span>
              <span>Total vol: <span className="text-white">${(w.totalVolume / 1000).toFixed(0)}k</span></span>
            </div>
            <div className="flex gap-1 mt-1">
              {w.events.map((e, j) => (
                <span key={j} className="text-[9px] px-1 py-0.5 rounded bg-gray-800 text-gray-400">{e}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EventsTimeline({ results, eventColors }: { results: PropagationResult[]; eventColors: Map<string, string> }) {
  if (results.length === 0) return null

  return (
    <div className="absolute left-4 top-20 w-72 bg-black/90 border border-gray-700 rounded-lg p-4 backdrop-blur-sm z-10 max-h-[calc(100vh-120px)] overflow-y-auto">
      <h3 className="text-xs font-bold text-yellow-400 mb-3 tracking-wider">EVENTS ({results.length})</h3>
      <div className="space-y-3">
        {results.map((r) => {
          const priceChange = ((r.priceAfter15m - r.priceAtEvent) / r.priceAtEvent * 100)
          const color = eventColors.get(r.eventId) || '#FFD700'
          return (
            <div key={r.eventId} className="border-l-2 pl-3 py-1" style={{ borderColor: color }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs font-bold text-gray-200">{r.event.token} {r.event.direction.toUpperCase()}</span>
              </div>
              <div className="text-[10px] text-gray-500">{r.event.reasoning}</div>
              <div className="flex gap-3 mt-1 text-[10px]">
                <span className="text-gray-400">Wallets: <span className="text-white">{r.wallets.length}</span></span>
                <span className="text-gray-400">Impact: <span className={priceChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(1)}%
                </span></span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-800">
        <div className="text-xs space-y-1">
          {[0, 1, 2, 3, 4].map(g => (
            <div key={g} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: GROUP_COLORS[g] }} />
              <span className="text-gray-500">{GROUP_LABELS[g]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GraphPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<PropagationResult[]>([])
  const [hoveredNode, setHoveredNode] = useState<NodeObject | null>(null)
  const [use3D, setUse3D] = useState(true)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) setUse3D(false)
    } catch {
      setUse3D(false)
    }

    const update = () => setDimensions({ width: window.innerWidth, height: window.innerHeight - 56 })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const eventColors = useMemo(() => {
    const map = new Map<string, string>()
    results.forEach((r, i) => {
      map.set(r.eventId, EVENT_COLORS[i % EVENT_COLORS.length])
    })
    return map
  }, [results])

  const walletEventMap = useMemo(() => {
    const map = new Map<string, { events: Set<string>; eventLabels: string[]; totalVolume: number; reactionTimes: number[] }>()
    for (const r of results) {
      for (const w of r.wallets) {
        if (!map.has(w.address)) {
          map.set(w.address, { events: new Set(), eventLabels: [], totalVolume: 0, reactionTimes: [] })
        }
        const entry = map.get(w.address)!
        if (!entry.events.has(r.eventId)) {
          entry.events.add(r.eventId)
          entry.eventLabels.push(`${r.event.token} ${r.event.direction}`)
        }
        entry.totalVolume += w.volume
        entry.reactionTimes.push(w.reactionTimeSec)
      }
    }
    return map
  }, [results])

  const insiders = useMemo(() => {
    const arr = Array.from(walletEventMap.entries())
      .filter(([, data]) => data.events.size >= 2)
      .map(([address, data]) => ({
        address,
        eventCount: data.events.size,
        events: data.eventLabels,
        totalVolume: data.totalVolume,
        avgReaction: data.reactionTimes.reduce((a, b) => a + b, 0) / data.reactionTimes.length,
      }))
      .sort((a, b) => b.eventCount - a.eventCount || a.avgReaction - b.avgReaction)
    return arr.slice(0, 10)
  }, [walletEventMap])

  const graphData = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>()
    const links: GraphLink[] = []

    for (const r of results) {
      const color = eventColors.get(r.eventId) || '#FFD700'
      nodeMap.set(r.eventId, {
        id: r.eventId,
        type: 'event',
        group: 0,
        label: `${r.event.token} ${r.event.direction.toUpperCase()}`,
        size: 25,
      })

      for (const w of r.wallets) {
        const walletData = walletEventMap.get(w.address)
        const isRepeat = walletData && walletData.events.size >= 2

        const existing = nodeMap.get(w.address)
        if (existing) {
          if (isRepeat) {
            existing.group = 4
            existing.size = Math.max(existing.size, 12 + walletData!.events.size * 4)
            existing.eventCount = walletData!.events.size
            existing.eventIds = Array.from(walletData!.events)
          }
        } else {
          let group: 0 | 1 | 2 | 3 | 4
          if (isRepeat) group = 4
          else if (w.reactionTimeSec < 120) group = 1
          else if (w.reactionTimeSec < 600) group = 2
          else group = 3

          const volumeK = Math.round(w.volume / 1000)
          nodeMap.set(w.address, {
            id: w.address,
            type: 'wallet',
            group,
            label: `${w.address.slice(0, 6)}...${w.address.slice(-4)} ($${volumeK}k)`,
            size: isRepeat
              ? 12 + walletData!.events.size * 4
              : Math.max(4, Math.min(16, Math.log10(w.volume / 1000 + 1) * 5)),
            reactionTime: w.reactionTimeSec,
            pnl: w.pnl,
            tradeCount: w.tradeCount,
            direction: w.direction,
            eventCount: isRepeat ? walletData!.events.size : 1,
            eventIds: isRepeat ? Array.from(walletData!.events) : [r.eventId],
          })
        }

        links.push({
          source: r.eventId,
          target: w.address,
          value: w.volume,
          direction: w.direction === 'mixed' ? 'buy' : w.direction,
          color: isRepeat ? '#FF00FF' : color,
          eventId: r.eventId,
        })
      }
    }

    return { nodes: Array.from(nodeMap.values()), links }
  }, [results, eventColors, walletEventMap])

  const handleSubmit = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/propagation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to analyze event')
        return
      }

      setResults(prev => [...prev, data])
      setQuery('')
    } catch {
      setError('Network error. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [query])

  const repeatCount = insiders.length

  return (
    <div className="h-screen w-screen bg-[#0a0a0f] flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 p-4 bg-black/50 border-b border-gray-800 z-20 relative">
        <div className="text-yellow-400 font-bold text-base tracking-widest shrink-0">PROPAGATION FORENSICS</div>
        {results.length > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-gray-500 text-xs">{results.length} events</span>
            {repeatCount > 0 && (
              <span className="bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold px-2 py-0.5 rounded animate-pulse">{repeatCount} repeat movers</span>
            )}
          </div>
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder={results.length === 0
            ? 'Describe a crypto event... e.g. "Bitcoin all time high March 2024"'
            : 'Add another event to find repeat movers...'}
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-yellow-400 focus:outline-none min-h-[44px]"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-5 py-2.5 bg-yellow-400 text-black text-sm font-bold rounded hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 min-h-[44px]"
        >
          {loading ? 'TRACING...' : results.length === 0 ? 'TRACE' : 'ADD EVENT'}
        </button>
        {results.length > 0 && (
          <button
            onClick={() => { setResults([]); setQuery('') }}
            className="px-4 py-2.5 text-gray-500 text-xs hover:text-gray-300 shrink-0 min-h-[44px]"
          >
            RESET
          </button>
        )}
      </div>

      {error && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-900/80 border border-red-700 rounded px-4 py-2 text-sm text-red-200 z-30">
          {error}
        </div>
      )}

      {loading && results.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-yellow-400 text-lg mb-2 animate-pulse">ANALYZING EVENT</div>
            <div className="text-gray-600 text-xs tracking-wider">Parsing event / Fetching market data / Building graph</div>
            <div className="mt-4 w-48 h-0.5 bg-gray-800 mx-auto rounded overflow-hidden">
              <div className="h-full bg-yellow-400 rounded animate-[loading_2s_ease-in-out_infinite]" style={{ width: '30%' }} />
            </div>
          </div>
        </div>
      )}

      {results.length === 0 && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-lg">
            <div className="text-yellow-400 text-3xl font-bold tracking-tight mb-2">WHO KNEW FIRST?</div>
            <div className="text-gray-500 text-sm mb-6">
              Enter multiple crypto events. We&apos;ll trace which wallets moved first on each,
              and identify wallets that <span className="text-purple-400">repeatedly appear across events</span>.
            </div>
            <div className="text-gray-600 text-xs mb-4">Suggested sequence:</div>
            <div className="space-y-2 text-xs text-gray-500">
              <div>1. &quot;Bitcoin all time high March 2024&quot;</div>
              <div>2. &quot;Ethereum ETF approval May 2024&quot;</div>
              <div>3. &quot;Trump crypto executive order January 2025&quot;</div>
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex-1 relative">
          <EventsTimeline results={results} eventColors={eventColors} />
          {insiders.length > 0 && <InsiderPanel wallets={insiders} />}

          {hoveredNode && hoveredNode.type === 'wallet' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/95 border border-gray-600 rounded-lg px-5 py-3 z-20 text-xs max-w-md">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-yellow-400">{hoveredNode.id.slice(0, 10)}...{hoveredNode.id.slice(-6)}</span>
                {(hoveredNode.eventCount ?? 0) >= 2 && (
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold text-[10px]">
                    REPEAT MOVER ({hoveredNode.eventCount} events)
                  </span>
                )}
              </div>
              <div className="flex gap-4">
                <span className="text-gray-400">Reaction: <span className="text-white">{hoveredNode.reactionTime?.toFixed(0)}s</span></span>
                <span className="text-gray-400">Trades: <span className="text-white">{hoveredNode.tradeCount}</span></span>
                <span className="text-gray-400">P&L: <span className={
                  (hoveredNode.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                }>{((hoveredNode.pnl ?? 0) * 100).toFixed(1)}%</span></span>
                <span className="text-gray-400">Dir: <span className={
                  hoveredNode.direction === 'buy' ? 'text-green-400' :
                  hoveredNode.direction === 'sell' ? 'text-red-400' : 'text-gray-300'
                }>{hoveredNode.direction?.toUpperCase()}</span></span>
              </div>
            </div>
          )}

          {loading && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-yellow-400/10 border border-yellow-400/30 rounded px-4 py-2 z-30">
              <span className="text-yellow-400 text-sm">Adding event to graph...</span>
            </div>
          )}

          {use3D ? (
            <ForceGraph3D
              graphData={graphData}
              nodeLabel=""
              nodeColor={(node: NodeObject) => {
                if (node.group === 4) return GROUP_COLORS[4]
                if (node.type === 'event') return eventColors.get(node.id) || GROUP_COLORS[0]
                return GROUP_COLORS[node.group] || '#888'
              }}
              nodeVal={(node: NodeObject) => node.size}
              nodeOpacity={0.9}
              linkColor={(link: GraphLink) => link.color || '#333'}
              linkWidth={(link: GraphLink) => link.color === '#FF00FF' ? 1.5 : 0.5}
              linkDirectionalParticles={(link: GraphLink) => link.color === '#FF00FF' ? 5 : 2}
              linkDirectionalParticleWidth={(link: GraphLink) => link.color === '#FF00FF' ? 2.5 : 1.2}
              linkDirectionalParticleSpeed={0.004}
              linkDirectionalParticleColor={(link: GraphLink) => link.color || '#555'}
              backgroundColor="#0a0a0f"
              onNodeHover={(node: NodeObject | null) => setHoveredNode(node)}
              enableNodeDrag={false}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              warmupTicks={50}
              width={dimensions.width}
              height={dimensions.height}
            />
          ) : (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              nodeLabel=""
              nodeColor={(node: NodeObject) => {
                if (node.group === 4) return GROUP_COLORS[4]
                if (node.type === 'event') return eventColors.get(node.id) || GROUP_COLORS[0]
                return GROUP_COLORS[node.group] || '#888'
              }}
              nodeVal={(node: NodeObject) => node.size * 2}
              linkColor={(link: GraphLink) => link.color || '#333'}
              linkWidth={(link: GraphLink) => link.color === '#FF00FF' ? 2 : 0.5}
              linkDirectionalParticles={(link: GraphLink) => link.color === '#FF00FF' ? 4 : 1}
              linkDirectionalParticleWidth={(link: GraphLink) => link.color === '#FF00FF' ? 3 : 1.5}
              linkDirectionalParticleSpeed={0.005}
              linkDirectionalParticleColor={(link: GraphLink) => link.color || '#555'}
              backgroundColor="#0a0a0f"
              onNodeHover={(node: NodeObject | null) => setHoveredNode(node)}
              enableNodeDrag={false}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              warmupTicks={50}
              d3Force="charge"
              d3ForceStrength={-200}
              width={dimensions.width}
              height={dimensions.height}
            />
          )}
        </div>
      )}
    </div>
  )
}
