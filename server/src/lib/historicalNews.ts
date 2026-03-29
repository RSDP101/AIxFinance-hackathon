import { CatalystEvent } from '../data/events';
import { fetchGuardianEvents } from './guardianNews';
import { fetchNytEvents } from './nytNews';

// LRU cache: key = "from-to", value = events
const cache = new Map<string, CatalystEvent[]>();
const MAX_CACHE_ENTRIES = 50;

function cacheKey(from: number, to: number): string {
  return `${from}-${to}`;
}

function cacheSet(key: string, value: CatalystEvent[]) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, value);
}

function normalizeHeadline(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }

  const smaller = Math.min(wordsA.size, wordsB.size);
  return overlap / smaller;
}

function deduplicateEvents(events: CatalystEvent[]): CatalystEvent[] {
  const result: CatalystEvent[] = [];
  const normalized = events.map((e) => ({
    event: e,
    norm: normalizeHeadline(e.headline),
  }));

  const removed = new Set<number>();

  for (let i = 0; i < normalized.length; i++) {
    if (removed.has(i)) continue;
    for (let j = i + 1; j < normalized.length; j++) {
      if (removed.has(j)) continue;
      if (wordOverlap(normalized[i].norm, normalized[j].norm) > 0.7) {
        if (normalized[i].event.content.length >= normalized[j].event.content.length) {
          removed.add(j);
        } else {
          removed.add(i);
          break;
        }
      }
    }
  }

  for (let i = 0; i < normalized.length; i++) {
    if (!removed.has(i)) result.push(normalized[i].event);
  }

  return result;
}

export async function fetchHistoricalEvents(
  fromUnix: number,
  toUnix: number
): Promise<CatalystEvent[]> {
  const key = cacheKey(fromUnix, toUnix);

  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  console.log(`[HistoricalNews] Fetching for range ${new Date(fromUnix * 1000).toISOString()} to ${new Date(toUnix * 1000).toISOString()}`);

  const [guardianResult, nytResult] = await Promise.allSettled([
    fetchGuardianEvents(fromUnix, toUnix),
    fetchNytEvents(fromUnix, toUnix),
  ]);

  const allEvents: CatalystEvent[] = [];

  if (guardianResult.status === 'fulfilled') {
    allEvents.push(...guardianResult.value);
    console.log(`[HistoricalNews] Guardian: ${guardianResult.value.length} articles`);
  } else {
    console.error('[HistoricalNews] Guardian fetch failed:', guardianResult.reason);
  }

  if (nytResult.status === 'fulfilled') {
    allEvents.push(...nytResult.value);
    console.log(`[HistoricalNews] NYT: ${nytResult.value.length} articles`);
  } else {
    console.error('[HistoricalNews] NYT fetch failed:', nytResult.reason);
  }

  const deduplicated = deduplicateEvents(allEvents);
  console.log(`[HistoricalNews] After dedup: ${deduplicated.length} articles (removed ${allEvents.length - deduplicated.length} duplicates)`);

  cacheSet(key, deduplicated);

  return deduplicated;
}
