export interface GraphNode {
  id: string
  type: 'event' | 'wallet'
  group: 0 | 1 | 2 | 3 | 4
  label: string
  size: number
  reactionTime?: number
  pnl?: number
  tradeCount?: number
  direction?: 'buy' | 'sell' | 'mixed'
  eventCount?: number
  eventIds?: string[]
}

export interface GraphLink {
  source: string
  target: string
  value: number
  direction: 'buy' | 'sell'
  color: string
  eventId?: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export interface ParsedEvent {
  token: string
  timestamp: string
  direction: 'pump' | 'dump' | 'volatile'
  confidence: number
  reasoning: string
}

export interface WalletSummary {
  address: string
  reactionTimeSec: number
  direction: 'buy' | 'sell' | 'mixed'
  volume: number
  tradeCount: number
  entryPrice: number
  pnl: number
  eventId: string
}

export interface PropagationResult {
  eventId: string
  event: ParsedEvent
  wallets: WalletSummary[]
  graph: GraphData
  priceAtEvent: number
  priceAfter15m: number
  totalTrades: number
}

export const GROUP_COLORS: Record<number, string> = {
  0: '#FFD700',
  1: '#FF4444',
  2: '#FF8C00',
  3: '#4488FF',
  4: '#FF00FF',
}

export const GROUP_LABELS: Record<number, string> = {
  0: 'Event',
  1: '< 2 minutes',
  2: '2-10 minutes',
  3: '10+ minutes',
  4: 'Repeat mover',
}

export const EVENT_COLORS = [
  '#FFD700',
  '#00FFAA',
  '#FF6B6B',
  '#7B68EE',
  '#FF8C00',
  '#00CED1',
  '#FF69B4',
  '#98FB98',
]
