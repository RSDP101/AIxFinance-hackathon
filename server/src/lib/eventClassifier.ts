import { CatalystEvent, EventSource } from '../data/events';

type CoinTag = 'BTC-USDT' | 'ETH-USDT' | 'SOL-USDT' | 'TAO-USDT' | 'ALL';

interface ClassifiedResult {
  coin: CoinTag;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

const COIN_KEYWORDS: Record<CoinTag, string[]> = {
  'BTC-USDT': ['bitcoin', 'btc', '$btc', 'satoshi'],
  'ETH-USDT': ['ethereum', 'eth', '$eth', 'vitalik', 'pectra', 'eip'],
  'SOL-USDT': ['solana', 'sol', '$sol', 'jupiter', 'raydium'],
  'TAO-USDT': ['bittensor', 'tao', '$tao', 'subnet'],
  'ALL': [],
};

const BULLISH_KEYWORDS = [
  'bullish', 'moon', 'pump', 'rally', 'surge', 'buy', 'soar',
  'record', 'all-time high', 'ath', 'adoption', 'approval',
  'launch', 'partnership', 'upgrade', 'growth', 'inflow',
  // Macro
  'rate cut', 'stimulus', 'easing', 'ceasefire', 'peace',
  'trade deal', 'deregulation', 'tax cut', 'jobs growth',
  'gdp growth', 'consumer confidence', 'dovish',
];

const BEARISH_KEYWORDS = [
  'bearish', 'crash', 'dump', 'sell', 'fear', 'ban', 'hack',
  'exploit', 'regulation', 'crackdown', 'outflow', 'lawsuit',
  'sec charges', 'investigation', 'decline', 'plunge',
  // Macro
  'rate hike', 'tariff', 'sanctions', 'war', 'invasion',
  'recession', 'default', 'shutdown', 'hawkish', 'inflation spike',
  'trade war', 'embargo', 'indictment', 'subpoena',
];

export function classifyText(text: string): ClassifiedResult {
  const lower = text.toLowerCase();

  let coin: CoinTag = 'ALL';
  for (const [coinTag, keywords] of Object.entries(COIN_KEYWORDS)) {
    if (coinTag === 'ALL') continue;
    if (keywords.some(kw => lower.includes(kw))) {
      coin = coinTag as CoinTag;
      break;
    }
  }

  const bullScore = BULLISH_KEYWORDS.filter(kw => lower.includes(kw)).length;
  const bearScore = BEARISH_KEYWORDS.filter(kw => lower.includes(kw)).length;

  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (bullScore > bearScore) sentiment = 'bullish';
  else if (bearScore > bullScore) sentiment = 'bearish';

  return { coin, sentiment };
}

let idCounter = 0;

export function buildCatalystEvent(opts: {
  source: EventSource;
  author: string;
  handle?: string;
  avatar: string;
  platform: string;
  headline: string;
  content: string;
  timestamp: number;
  url?: string;
}): CatalystEvent {
  const combined = `${opts.headline} ${opts.content}`;
  const { coin, sentiment } = classifyText(combined);

  return {
    id: `live-${opts.source}-${Date.now()}-${idCounter++}`,
    source: opts.source,
    author: opts.author,
    handle: opts.handle,
    avatar: opts.avatar,
    coin,
    timestamp: opts.timestamp,
    headline: opts.headline,
    content: opts.content,
    platform: opts.platform,
    sentiment,
    url: opts.url,
  };
}
