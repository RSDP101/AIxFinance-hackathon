import WebSocket, { WebSocketServer } from 'ws';
import { catalystEvents, upcomingEvents, CatalystEvent } from '../data/events';

let liveIndex = 0;

export function setupNewsServer(wss: WebSocketServer) {
  // Push a new event every 10-18 seconds
  function scheduleNext() {
    const delay = 10000 + Math.random() * 8000;
    setTimeout(() => {
      if (wss.clients.size === 0 || liveIndex >= upcomingEvents.length) {
        if (liveIndex >= upcomingEvents.length) liveIndex = 0; // loop
        scheduleNext();
        return;
      }

      const event: CatalystEvent = {
        ...upcomingEvents[liveIndex],
        id: `live-${Date.now()}`,
        timestamp: Math.floor(Date.now() / 1000),
      };
      liveIndex++;

      const payload = JSON.stringify({ type: 'new_event', data: event });
      wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) c.send(payload);
      });

      scheduleNext();
    }, delay);
  }

  wss.on('connection', (ws) => {
    console.log('Client connected to news WS');

    // Send all historical events on connect
    ws.send(JSON.stringify({
      type: 'initial_events',
      data: catalystEvents,
    }));

    ws.on('close', () => console.log('Client disconnected from news WS'));
  });

  scheduleNext();
  console.log('News server started — pushing events every 10-18s');
}
