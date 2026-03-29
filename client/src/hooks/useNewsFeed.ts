import { useEffect, useRef } from 'react';
import { useTradingStore } from '../store/tradingStore';

export function useNewsFeed() {
  const wsRef = useRef<WebSocket | null>(null);
  const setEvents = useTradingStore((s) => s.setEvents);
  const addEvent = useTradingStore((s) => s.addEvent);
  const addNotification = useTradingStore((s) => s.addNotification);

  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/news`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'initial_events') {
            setEvents(msg.data);
          } else if (msg.type === 'new_event') {
            addEvent(msg.data);
            addNotification(msg.data);
          }
        } catch {}
      };

      ws.onclose = () => setTimeout(connect, 3000);
      ws.onerror = () => ws.close();
    };

    connect();
    return () => { wsRef.current?.close(); };
  }, [setEvents, addEvent, addNotification]);
}
