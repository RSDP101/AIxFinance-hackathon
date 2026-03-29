import { Router, Request, Response } from 'express';
import { catalystEvents } from '../data/events';
import { getAllLiveEvents } from '../lib/liveFeedManager';
import { fetchHistoricalEvents } from '../lib/historicalNews';

const router = Router();

// Background fetch: prefetch Guardian for a range so the next request is cached
let prefetchPromise: Promise<void> | null = null;

router.get('/events', async (req: Request, res: Response) => {
  const from = req.query.from ? Number(req.query.from) : undefined;
  const to = req.query.to ? Number(req.query.to) : undefined;

  let liveEvents = getAllLiveEvents();

  if (from !== undefined) {
    liveEvents = liveEvents.filter(e => e.timestamp >= from);
  }
  if (to !== undefined) {
    liveEvents = liveEvents.filter(e => e.timestamp <= to);
  }

  let events = [...catalystEvents, ...liveEvents];

  // Try to get historical events — if cached, this is instant
  // If not cached, fetch but with a short timeout so we don't block the response
  if (from !== undefined && to !== undefined) {
    try {
      const historicalEvents = await Promise.race([
        fetchHistoricalEvents(from, to),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]);
      events.push(...historicalEvents);
    } catch (err) {
      // Timed out — kick off background fetch so it's cached for next request
      if (!prefetchPromise) {
        prefetchPromise = fetchHistoricalEvents(from, to)
          .then(() => { prefetchPromise = null; })
          .catch(() => { prefetchPromise = null; });
      }
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
