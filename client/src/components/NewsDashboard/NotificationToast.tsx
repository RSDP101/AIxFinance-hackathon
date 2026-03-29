import { useTradingStore } from '../../store/tradingStore';
import { EVENT_COLORS, EVENT_LABELS } from '../../types/events';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function NotificationToast() {
  const notifications = useTradingStore((s) => s.notifications);
  const removeNotification = useTradingStore((s) => s.removeNotification);
  const setActiveNewsTab = useTradingStore((s) => s.setActiveNewsTab);

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((notif) => {
          const color = EVENT_COLORS[notif.event.source];
          const tab = notif.event.source === 'truthsocial' || notif.event.source === 'twitter'
            ? notif.event.source
            : 'news';

          return (
            <motion.div
              key={notif.id}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={() => {
                setActiveNewsTab(tab as any);
                removeNotification(notif.id);
              }}
              className="bg-bg-surface border border-border rounded-lg p-3 cursor-pointer hover:bg-bg-surface-light transition-all shadow-lg"
              style={{ borderLeftWidth: 3, borderLeftColor: color }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-medium mb-0.5" style={{ color }}>
                    {EVENT_LABELS[notif.event.source]}
                  </div>
                  <div className="text-xs text-text-primary truncate">
                    <span className="font-bold">{notif.event.author}:</span>{' '}
                    {notif.event.headline}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notif.id);
                  }}
                  className="text-text-muted hover:text-text-primary p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
