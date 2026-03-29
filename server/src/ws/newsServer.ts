import WebSocket, { WebSocketServer } from 'ws';
import { catalystEvents } from '../data/events';
import { startLiveFeed, getAllLiveEvents, setOnNewEvent } from '../lib/liveFeedManager';

export function setupNewsServer(wss: WebSocketServer) {
  // Start live feed polling (Truth Social + RSS)
  startLiveFeed(120000); // poll every 2 minutes

  // When a new live event arrives, broadcast to all connected clients
  setOnNewEvent((event) => {
    const payload = JSON.stringify({ type: 'new_event', data: event });
    wss.clients.forEach(c => {
      if (c.readyState === WebSocket.OPEN) c.send(payload);
    });
  });

  wss.on('connection', (ws) => {
    console.log('Client connected to news WS');

    // Send live events only (set to [...catalystEvents, ...getAllLiveEvents()] to include hardcoded)
    const allEvents = [...getAllLiveEvents()];
    ws.send(JSON.stringify({
      type: 'initial_events',
      data: allEvents,
    }));

    ws.on('close', () => console.log('Client disconnected from news WS'));
  });

  console.log('News server started — live feed active');
}
