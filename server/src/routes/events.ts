import { Router, Request, Response } from 'express';
import { catalystEvents } from '../data/events';
import { getAllLiveEvents } from '../lib/liveFeedManager';
import { fetchHistoricalEvents } from '../lib/historicalNews';

const router = Router();

router.get('/events', async (req: Request, res: Response) => {
  const from = req.query.from ? Number(req.query.from) : undefined;
  const to = req.query.to ? Number(req.query.to) : undefined;

  // Always include hardcoded demo events (they use relative timestamps)
  // Only time-filter live events
  let liveEvents = getAllLiveEvents();

  if (from !== undefined) {
    liveEvents = liveEvents.filter(e => e.timestamp >= from);
  }
  if (to !== undefined) {
    liveEvents = liveEvents.filter(e => e.timestamp <= to);
  }

  let events = [...catalystEvents, ...liveEvents];

  // Fetch historical macro news if date range is provided
  if (from !== undefined && to !== undefined) {
    try {
      const historicalEvents = await fetchHistoricalEvents(from, to);
      events.push(...historicalEvents);
    } catch (err) {
      console.error('[Events Route] Historical news fetch error:', err);
    }
  }

  // Deduplicate by ID
  const seen = new Set<string>();
  events = events.filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  events.sort((a, b) => a.timestamp - b.timestamp);

  res.json({ events });
});

export default router;
