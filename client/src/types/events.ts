export type EventSource = 'political' | 'news' | 'social';

export interface CatalystEvent {
  id: string;
  source: EventSource;
  author: string;
  handle?: string;
  avatar: string;
  coin: string;
  timestamp: number;
  headline: string;
  content: string;
  platform: string;
  priceImpact?: {
    percent: number;
    direction: 'up' | 'down';
    windowMinutes: number;
  };
  sentiment: 'bullish' | 'bearish' | 'neutral';
  likes?: number;
  reposts?: number;
}

export const EVENT_COLORS: Record<EventSource, string> = {
  political: '#FF9800',
  news: '#2196F3',
  social: '#9C27B0',
};

export const EVENT_LABELS: Record<EventSource, string> = {
  political: 'Political',
  news: 'News',
  social: 'Social',
};
