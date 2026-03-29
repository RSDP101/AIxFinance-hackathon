import { useEffect, useRef } from 'react';
import { useTradingStore } from '../store/tradingStore';
import type { Candle } from '../types/market';

export function useMarketWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const updateTicker = useTradingStore((s) => s.updateTicker);

  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/market`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'ticker') updateTicker(msg.data);
        } catch {}
      };
      ws.onclose = () => setTimeout(connect, 3000);
      ws.onerror = () => ws.close();
    };
    connect();
    return () => { wsRef.current?.close(); };
  }, [updateTicker]);

  return wsRef;
}

export function useCandles(instId: string) {
  const candlesRef = useRef<Candle[]>([]);
  const callbacksRef = useRef<{
    onInitial?: (candles: Candle[]) => void;
    onUpdate?: (candle: Candle & { instId: string }) => void;
  }>({});

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/candles?instId=${instId}&bar=1m&limit=300`)
      .then((r) => r.json())
      .then((candles: Candle[]) => {
        if (cancelled) return;
        candlesRef.current = candles;
        callbacksRef.current.onInitial?.(candles);
      })
      .catch(console.error);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/market`);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'candle' && msg.data.instId === instId) {
          callbacksRef.current.onUpdate?.(msg.data);
        }
      } catch {}
    };

    return () => { cancelled = true; ws.close(); };
  }, [instId]);

  return callbacksRef;
}
