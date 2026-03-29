import { CatalystEvent } from '../data/events';
import { buildCatalystEvent } from './eventClassifier';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'truth-social.json');

interface TruthSocialPost {
  id: string;
  author: string;
  handle: string;
  content: string;
  timestamp: number;
  url: string;
}

// Track which post IDs we've already processed
const processedIds = new Set<string>();

export async function fetchTruthSocialEvents(): Promise<CatalystEvent[]> {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const posts: TruthSocialPost[] = JSON.parse(raw);
    const events: CatalystEvent[] = [];

    for (const post of posts) {
      if (processedIds.has(post.id)) continue;
      processedIds.add(post.id);

      if (!post.content) continue;

      const headline =
        post.content.length > 80
          ? `${post.author}: ${post.content.slice(0, 77)}...`
          : `${post.author}: ${post.content}`;

      events.push(
        buildCatalystEvent({
          source: 'political',
          author: post.author,
          handle: post.handle,
          avatar: '🇺🇸',
          platform: 'Truth Social',
          headline,
          content: post.content,
          timestamp: post.timestamp,
          url: post.url,
        })
      );
    }

    if (events.length > 0) {
      console.log(`[TruthSocial] Read ${events.length} new posts from sidecar`);
    }

    return events;
  } catch (err) {
    console.error('[TruthSocial] Error reading sidecar data:', err);
    return [];
  }
}
