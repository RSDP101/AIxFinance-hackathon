import { Router, Request, Response } from 'express';
import { catalystEvents } from '../data/events';
import { getAllLiveEvents } from '../lib/liveFeedManager';

const router = Router();

router.get('/events', (req: Request, res: Response) => {
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

  const events = [...catalystEvents, ...liveEvents];
  events.sort((a, b) => a.timestamp - b.timestamp);

  res.json({ events });
});

export default router;
