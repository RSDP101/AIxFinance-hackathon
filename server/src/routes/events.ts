import { Router, Request, Response } from 'express';
import { catalystEvents } from '../data/events';
import { getAllLiveEvents } from '../lib/liveFeedManager';

const router = Router();

router.get('/events', (req: Request, res: Response) => {
  const from = req.query.from ? Number(req.query.from) : undefined;
  const to = req.query.to ? Number(req.query.to) : undefined;

  let events = [...catalystEvents, ...getAllLiveEvents()];

  if (from !== undefined) {
    events = events.filter(e => e.timestamp >= from);
  }
  if (to !== undefined) {
    events = events.filter(e => e.timestamp <= to);
  }

  events.sort((a, b) => a.timestamp - b.timestamp);

  res.json({ events });
});

export default router;
