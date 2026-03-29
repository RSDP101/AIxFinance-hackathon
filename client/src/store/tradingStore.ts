import { create } from 'zustand';
import type { TickerData, Pair } from '../types/market';
import type { Position, OrderSide, OrderType } from '../types/order';
import type { CatalystEvent, EventSource } from '../types/events';

interface OrderInput {
  type: OrderType;
  side: OrderSide;
  price: number;
  size: number;
}

interface Notification {
  id: string;
  event: CatalystEvent;
  timestamp: number;
}

interface TradingStore {
  // Market
  selectedPair: Pair;
  tickers: Record<string, TickerData>;
  setSelectedPair: (pair: Pair) => void;
  updateTicker: (data: TickerData) => void;

  // Trading
  balance: number;
  leverage: number;
  positions: Position[];
  setLeverage: (lev: number) => void;
  placeOrder: (input: OrderInput) => void;
  closePosition: (id: string) => void;

  // Events
  events: CatalystEvent[];
  filters: Record<EventSource, boolean>;
  setEvents: (events: CatalystEvent[]) => void;
  addEvent: (event: CatalystEvent) => void;
  toggleFilter: (source: EventSource) => void;

  // News tab
  activeNewsTab: 'social' | 'political' | 'news';
  setActiveNewsTab: (tab: 'social' | 'political' | 'news') => void;

  // Notifications
  notifications: Notification[];
  addNotification: (event: CatalystEvent) => void;
  removeNotification: (id: string) => void;

  // Chart scroll
  scrollToTimestamp: number | null;
  setScrollToTimestamp: (ts: number | null) => void;
}

let orderCounter = 0;

export const useTradingStore = create<TradingStore>((set, get) => ({
  selectedPair: 'BTC-USDT',
  tickers: {},
  setSelectedPair: (pair) => set({ selectedPair: pair }),
  updateTicker: (data) =>
    set((s) => ({ tickers: { ...s.tickers, [data.instId]: data } })),

  balance: 100000,
  leverage: 1,
  positions: [],
  setLeverage: (leverage) => set({ leverage }),

  placeOrder: (input) => {
    const state = get();
    const margin = input.size;
    if (margin > state.balance) return;

    if (input.type === 'market') {
      const position: Position = {
        id: `pos-${++orderCounter}`,
        pair: state.selectedPair,
        side: input.side,
        entryPrice: input.price,
        size: input.size,
        leverage: state.leverage,
        timestamp: Date.now(),
      };
      set((s) => ({
        balance: s.balance - margin,
        positions: [...s.positions, position],
      }));
    }
  },

  closePosition: (id) => {
    const state = get();
    const pos = state.positions.find((p) => p.id === id);
    if (!pos) return;
    const ticker = state.tickers[pos.pair];
    if (!ticker) return;
    const dir = pos.side === 'long' ? 1 : -1;
    const pnl = dir * ((ticker.last - pos.entryPrice) / pos.entryPrice) * pos.size * pos.leverage;
    set((s) => ({
      balance: s.balance + pos.size + pnl,
      positions: s.positions.filter((p) => p.id !== id),
    }));
  },

  events: [],
  filters: { political: true, news: true, social: true },
  setEvents: (events) => set({ events }),
  addEvent: (event) =>
    set((s) => ({ events: [...s.events, event] })),
  toggleFilter: (source) =>
    set((s) => ({
      filters: { ...s.filters, [source]: !s.filters[source] },
    })),

  activeNewsTab: 'social',
  setActiveNewsTab: (tab) => set({ activeNewsTab: tab }),

  notifications: [],
  addNotification: (event) => {
    const id = `notif-${Date.now()}`;
    set((s) => ({
      notifications: [...s.notifications, { id, event, timestamp: Date.now() }],
    }));
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
    }, 5000);
  },
  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  scrollToTimestamp: null,
  setScrollToTimestamp: (ts) => set({ scrollToTimestamp: ts }),
}));
