import { CatalystEvent } from '../data/events';
import { buildCatalystEvent } from './eventClassifier';

interface MastodonStatus {
  id: string;
  created_at: string;
  content: string;
  url: string;
  account: {
    display_name: string;
    acct: string;
  };
}

const BASE_URL = 'https://truthsocial.com/api/v1';

const MONITORED_ACCOUNTS = [
  ['realDonaldTrump', '🇺🇸'],
] as const;

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function makeHeadline(author: string, text: string): string {
  const short = text.length > 80 ? text.slice(0, 77) + '...' : text;
  return `${author}: ${short}`;
}

async function lookupAccountId(acct: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/accounts/lookup?acct=${acct}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.id;
  } catch (err) {
    console.error(`[TruthSocial] Failed to lookup ${acct}:`, err);
    return null;
  }
}

async function fetchStatuses(accountId: string, sinceId?: string): Promise<MastodonStatus[]> {
  try {
    const params = new URLSearchParams({ limit: '20' });
    if (sinceId) params.set('since_id', sinceId);
    const res = await fetch(`${BASE_URL}/accounts/${accountId}/statuses?${params}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error(`[TruthSocial] Failed to fetch statuses:`, err);
    return [];
  }
}

const accountIdCache = new Map<string, string>();
const lastSeenId = new Map<string, string>();

export async function fetchTruthSocialEvents(): Promise<CatalystEvent[]> {
  const events: CatalystEvent[] = [];

  for (const [acct, avatar] of MONITORED_ACCOUNTS) {
    let accountId = accountIdCache.get(acct);
    if (!accountId) {
      accountId = await lookupAccountId(acct) ?? undefined;
      if (!accountId) continue;
      accountIdCache.set(acct, accountId);
    }

    const sinceId = lastSeenId.get(acct);
    const statuses = await fetchStatuses(accountId, sinceId);

    if (statuses.length > 0) {
      lastSeenId.set(acct, statuses[0].id);
    }

    for (const status of statuses) {
      const text = stripHtml(status.content);
      if (!text) continue;

      events.push(buildCatalystEvent({
        source: 'political',
        author: status.account.display_name || acct,
        handle: `@${status.account.acct}`,
        avatar: avatar as string,
        platform: 'Truth Social',
        headline: makeHeadline(status.account.display_name || acct, text),
        content: text,
        timestamp: Math.floor(new Date(status.created_at).getTime() / 1000),
        url: status.url,
      }));
    }
  }

  return events;
}
