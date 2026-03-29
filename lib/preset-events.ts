export interface PresetEvent {
  query: string
  token: string
  date: string
  category: 'etf' | 'regulation' | 'hack' | 'launch' | 'price' | 'macro' | 'defi' | 'social'
}

export const PRESET_EVENTS: PresetEvent[] = [
  // ETF milestones
  { query: 'Bitcoin spot ETF approval January 2024', token: 'BTC', date: '2024-01', category: 'etf' },
  { query: 'BlackRock IBIT becomes largest Bitcoin ETF February 2024', token: 'BTC', date: '2024-02', category: 'etf' },
  { query: 'Bitcoin ETF daily inflows hit $1B March 2024', token: 'BTC', date: '2024-03', category: 'etf' },
  { query: 'Grayscale GBTC outflows slow down April 2024', token: 'BTC', date: '2024-04', category: 'etf' },
  { query: 'SEC approves spot Ethereum ETFs May 2024', token: 'ETH', date: '2024-05', category: 'etf' },
  { query: 'Ethereum ETFs begin trading July 2024', token: 'ETH', date: '2024-07', category: 'etf' },
  { query: 'Solana ETF filing by VanEck June 2024', token: 'SOL', date: '2024-06', category: 'etf' },
  { query: 'Bitcoin ETF AUM surpasses gold ETF November 2024', token: 'BTC', date: '2024-11', category: 'etf' },
  { query: 'Fidelity Ethereum ETF hits $1B AUM December 2024', token: 'ETH', date: '2024-12', category: 'etf' },
  { query: 'SEC approves Solana ETF March 2025', token: 'SOL', date: '2025-03', category: 'etf' },

  // Regulation
  { query: 'SEC sues Coinbase June 2024', token: 'BTC', date: '2024-06', category: 'regulation' },
  { query: 'Binance CZ sentenced to prison April 2024', token: 'BTC', date: '2024-04', category: 'regulation' },
  { query: 'MiCA regulation goes live in EU June 2024', token: 'BTC', date: '2024-06', category: 'regulation' },
  { query: 'Trump crypto executive order January 2025', token: 'BTC', date: '2025-01', category: 'regulation' },
  { query: 'Trump appoints pro-crypto SEC chair January 2025', token: 'BTC', date: '2025-01', category: 'regulation' },
  { query: 'SEC drops Ripple lawsuit October 2024', token: 'BTC', date: '2024-10', category: 'regulation' },
  { query: 'US stablecoin legislation passes Senate February 2025', token: 'BTC', date: '2025-02', category: 'regulation' },
  { query: 'Tornado Cash developer freed February 2025', token: 'ETH', date: '2025-02', category: 'regulation' },
  { query: 'Hong Kong approves crypto trading for retail November 2023', token: 'BTC', date: '2023-11', category: 'regulation' },
  { query: 'El Salvador Bitcoin bonds launch March 2024', token: 'BTC', date: '2024-03', category: 'regulation' },

  // Hacks and exploits
  { query: 'Bybit hacked for $1.5 billion February 2025', token: 'ETH', date: '2025-02', category: 'hack' },
  { query: 'Orbit Chain bridge hack January 2024', token: 'ETH', date: '2024-01', category: 'hack' },
  { query: 'Mixin Network hack $200M September 2023', token: 'BTC', date: '2023-09', category: 'hack' },
  { query: 'Poloniex hot wallet drained November 2023', token: 'BTC', date: '2023-11', category: 'hack' },
  { query: 'Radiant Capital exploit October 2024', token: 'ETH', date: '2024-10', category: 'hack' },
  { query: 'WazirX hack $230M July 2024', token: 'ETH', date: '2024-07', category: 'hack' },
  { query: 'Hedgey Finance exploit April 2024', token: 'ETH', date: '2024-04', category: 'hack' },
  { query: 'Socket protocol exploit January 2024', token: 'ETH', date: '2024-01', category: 'hack' },
  { query: 'PlayDapp exploit $290M February 2024', token: 'ETH', date: '2024-02', category: 'hack' },
  { query: 'Hyperliquid vault exploit March 2025', token: 'ETH', date: '2025-03', category: 'hack' },

  // Token launches and airdrops
  { query: 'Hyperliquid HYPE token launch November 2024', token: 'BTC', date: '2024-11', category: 'launch' },
  { query: 'Jupiter JUP airdrop January 2024', token: 'SOL', date: '2024-01', category: 'launch' },
  { query: 'Wormhole W token airdrop April 2024', token: 'SOL', date: '2024-04', category: 'launch' },
  { query: 'Starknet STRK token launch February 2024', token: 'ETH', date: '2024-02', category: 'launch' },
  { query: 'Ethena ENA launch April 2024', token: 'ETH', date: '2024-04', category: 'launch' },
  { query: 'LayerZero ZRO airdrop June 2024', token: 'ETH', date: '2024-06', category: 'launch' },
  { query: 'Eigenlayer EIGEN token launch October 2024', token: 'ETH', date: '2024-10', category: 'launch' },
  { query: 'ZKsync ZK token airdrop June 2024', token: 'ETH', date: '2024-06', category: 'launch' },
  { query: 'Scroll SCR token launch October 2024', token: 'ETH', date: '2024-10', category: 'launch' },
  { query: 'Monad testnet launch February 2025', token: 'ETH', date: '2025-02', category: 'launch' },
  { query: 'Berachain mainnet launch February 2025', token: 'ETH', date: '2025-02', category: 'launch' },
  { query: 'Trump TRUMP memecoin launch January 2025', token: 'SOL', date: '2025-01', category: 'launch' },
  { query: 'Melania MELANIA memecoin launch January 2025', token: 'SOL', date: '2025-01', category: 'launch' },

  // Price milestones
  { query: 'Bitcoin breaks $50,000 February 2024', token: 'BTC', date: '2024-02', category: 'price' },
  { query: 'Bitcoin all time high $73,750 March 2024', token: 'BTC', date: '2024-03', category: 'price' },
  { query: 'Bitcoin crashes to $49,000 August 2024', token: 'BTC', date: '2024-08', category: 'price' },
  { query: 'Bitcoin hits $100,000 December 2024', token: 'BTC', date: '2024-12', category: 'price' },
  { query: 'Ethereum breaks $4,000 March 2024', token: 'ETH', date: '2024-03', category: 'price' },
  { query: 'Ethereum drops below $2,000 September 2024', token: 'ETH', date: '2024-09', category: 'price' },
  { query: 'Solana breaks $200 November 2024', token: 'SOL', date: '2024-11', category: 'price' },
  { query: 'Solana hits all time high $260 January 2025', token: 'SOL', date: '2025-01', category: 'price' },
  { query: 'Total crypto market cap hits $4 trillion December 2024', token: 'BTC', date: '2024-12', category: 'price' },
  { query: 'Bitcoin dominance hits 60% September 2024', token: 'BTC', date: '2024-09', category: 'price' },
  { query: 'Altcoin season begins November 2024', token: 'ETH', date: '2024-11', category: 'price' },
  { query: 'DOGE pumps 200% after Trump win November 2024', token: 'BTC', date: '2024-11', category: 'price' },
  { query: 'Bitcoin flash crash to $92K January 2025', token: 'BTC', date: '2025-01', category: 'price' },
  { query: 'Crypto market crash February 2025 tariff fears', token: 'BTC', date: '2025-02', category: 'price' },

  // Macro events
  { query: 'Fed holds rates steady January 2024', token: 'BTC', date: '2024-01', category: 'macro' },
  { query: 'Japan yen carry trade unwind August 2024', token: 'BTC', date: '2024-08', category: 'macro' },
  { query: 'Fed cuts rates 50bps September 2024', token: 'BTC', date: '2024-09', category: 'macro' },
  { query: 'Trump wins presidential election November 2024', token: 'BTC', date: '2024-11', category: 'macro' },
  { query: 'Fed pauses rate cuts January 2025', token: 'BTC', date: '2025-01', category: 'macro' },
  { query: 'US China tariff escalation February 2025', token: 'BTC', date: '2025-02', category: 'macro' },
  { query: 'US debt ceiling crisis October 2024', token: 'BTC', date: '2024-10', category: 'macro' },
  { query: 'Silicon Valley Bank anniversary impact March 2024', token: 'BTC', date: '2024-03', category: 'macro' },
  { query: 'Bitcoin halving April 2024', token: 'BTC', date: '2024-04', category: 'macro' },
  { query: 'Mt Gox begins BTC distributions July 2024', token: 'BTC', date: '2024-07', category: 'macro' },
  { query: 'German government sells Bitcoin July 2024', token: 'BTC', date: '2024-07', category: 'macro' },
  { query: 'MicroStrategy buys $4B Bitcoin November 2024', token: 'BTC', date: '2024-11', category: 'macro' },

  // DeFi events
  { query: 'Uniswap fee switch proposal February 2024', token: 'ETH', date: '2024-02', category: 'defi' },
  { query: 'Ethereum Dencun upgrade March 2024', token: 'ETH', date: '2024-03', category: 'defi' },
  { query: 'Ethena USDe surpasses $2B TVL April 2024', token: 'ETH', date: '2024-04', category: 'defi' },
  { query: 'Lido exits from Solana October 2024', token: 'SOL', date: '2024-10', category: 'defi' },
  { query: 'Aave launches on Base August 2024', token: 'ETH', date: '2024-08', category: 'defi' },
  { query: 'Maker rebrands to Sky August 2024', token: 'ETH', date: '2024-08', category: 'defi' },
  { query: 'Hyperliquid surpasses dYdX in volume December 2024', token: 'ETH', date: '2024-12', category: 'defi' },
  { query: 'Solana DeFi TVL hits $10B November 2024', token: 'SOL', date: '2024-11', category: 'defi' },
  { query: 'Pendle surpasses $5B TVL June 2024', token: 'ETH', date: '2024-06', category: 'defi' },
  { query: 'Blast L2 mainnet launch March 2024', token: 'ETH', date: '2024-03', category: 'defi' },

  // Social and viral
  { query: 'Elon Musk tweets about DOGE March 2024', token: 'BTC', date: '2024-03', category: 'social' },
  { query: 'Pump.fun launches on Solana January 2024', token: 'SOL', date: '2024-01', category: 'social' },
  { query: 'BONK memecoin rally December 2023', token: 'SOL', date: '2023-12', category: 'social' },
  { query: 'WIF memecoin goes viral March 2024', token: 'SOL', date: '2024-03', category: 'social' },
  { query: 'Ansem promotes Solana memecoins March 2024', token: 'SOL', date: '2024-03', category: 'social' },
  { query: 'Worldcoin WLD controversy and pump February 2024', token: 'ETH', date: '2024-02', category: 'social' },
  { query: 'PEPE memecoin second wave March 2024', token: 'ETH', date: '2024-03', category: 'social' },
  { query: 'Friend.tech shuts down September 2024', token: 'ETH', date: '2024-09', category: 'social' },
  { query: 'Farcaster Frames go viral February 2024', token: 'ETH', date: '2024-02', category: 'social' },
  { query: 'AI agent token AIXBT pumps January 2025', token: 'ETH', date: '2025-01', category: 'social' },
  { query: 'Virtuals Protocol AI agents go viral December 2024', token: 'ETH', date: '2024-12', category: 'social' },
  { query: 'Crypto Twitter reacts to Celsius payouts January 2024', token: 'BTC', date: '2024-01', category: 'social' },
]

export const CATEGORY_LABELS: Record<PresetEvent['category'], string> = {
  etf: 'ETF',
  regulation: 'Regulation',
  hack: 'Hacks',
  launch: 'Launches',
  price: 'Price',
  macro: 'Macro',
  defi: 'DeFi',
  social: 'Social',
}

export const CATEGORY_COLORS: Record<PresetEvent['category'], string> = {
  etf: '#22c55e',
  regulation: '#f59e0b',
  hack: '#ef4444',
  launch: '#8b5cf6',
  price: '#3b82f6',
  macro: '#6b7280',
  defi: '#06b6d4',
  social: '#ec4899',
}
