import { CatalystEvent } from '../data/events';
import { fetchTruthSocialEvents } from './truthSocial';
import { fetchRssEvents } from './newsRss';

type EventCallback = (event: CatalystEvent) => void;

const allLiveEvents: CatalystEvent[] = [];
const seenIds = new Set<string>();

let onNewEvent: EventCallback | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

export function getAllLiveEvents(): CatalystEvent[] {
  return [...allLiveEvents];
}

export function setOnNewEvent(cb: EventCallback) {
  onNewEvent = cb;
}

function addEvent(event: CatalystEvent) {
  const key = `${event.headline}:${event.timestamp}`;
  if (seenIds.has(key)) return;
  seenIds.add(key);

  allLiveEvents.push(event);
  if (onNewEvent) onNewEvent(event);
}

async function poll() {
  console.log('[LiveFeed] Polling Truth Social + RSS...');

  try {
    const [truthEvents, rssEvents] = await Promise.allSettled([
      fetchTruthSocialEvents(),
      fetchRssEvents(),
    ]);

    if (truthEvents.status === 'fulfilled') {
      for (const e of truthEvents.value) addEvent(e);
      console.log(`[LiveFeed] Truth Social: ${truthEvents.value.length} new`);
    } else {
      console.error('[LiveFeed] Truth Social poll failed:', truthEvents.reason);
    }

    if (rssEvents.status === 'fulfilled') {
      for (const e of rssEvents.value) addEvent(e);
      console.log(`[LiveFeed] RSS: ${rssEvents.value.length} new`);
    } else {
      console.error('[LiveFeed] RSS poll failed:', rssEvents.reason);
    }
  } catch (err) {
    console.error('[LiveFeed] Poll error:', err);
  }
}

export function startLiveFeed(intervalMs: number = 120000) {
  poll();
  pollInterval = setInterval(poll, intervalMs);
  console.log(`[LiveFeed] Started, polling every ${intervalMs / 1000}s`);
}

export function stopLiveFeed() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
