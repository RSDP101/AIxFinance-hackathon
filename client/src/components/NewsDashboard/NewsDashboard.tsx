import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTradingStore } from '../../store/tradingStore';
import type { EventSource } from '../../types/events';
import { EVENT_COLORS, EVENT_LABELS } from '../../types/events';
import SocialPost from './SocialPost';
import NewsArticle from './NewsArticle';

const TABS: { key: EventSource; label: string }[] = [
  { key: 'twitter', label: 'Twitter/X' },
  { key: 'truthsocial', label: 'Truth Social' },
  { key: 'news', label: 'News & Markets' },
];

export default function NewsDashboard() {
  const events = useTradingStore((s) => s.events);
  const activeTab = useTradingStore((s) => s.activeNewsTab);
  const setActiveTab = useTradingStore((s) => s.setActiveNewsTab);

  const filteredEvents = useMemo(() => {
    return events
      .filter((e) => e.source === activeTab)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [events, activeTab]);

  // Track which events are "new" (arrived in the last 5 seconds)
  const now = Date.now() / 1000;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const color = EVENT_COLORS[tab.key];
          const count = events.filter((e) => e.source === tab.key).length;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className="flex-1 py-2.5 text-xs font-medium transition-all cursor-pointer relative"
              style={{
                color: isActive ? color : '#9891a8',
                backgroundColor: isActive ? color + '10' : 'transparent',
              }}
            >
              {tab.label}
              <span className="ml-1.5 text-[10px] opacity-60">({count})</span>
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ backgroundColor: color }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence initial={false}>
          {filteredEvents.map((event) => {
            const isNew = now - event.timestamp < 5;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: -20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                layout
              >
                {event.source === 'twitter' || event.source === 'truthsocial' ? (
                  <SocialPost event={event} isNew={isNew} />
                ) : (
                  <NewsArticle event={event} isNew={isNew} />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredEvents.length === 0 && (
          <div className="flex items-center justify-center h-32 text-text-muted text-sm">
            No events in this category yet
          </div>
        )}
      </div>
    </div>
  );
}
