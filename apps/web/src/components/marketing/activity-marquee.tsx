'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

const FALLBACK_ACTIVITIES = [
  '🟢 Νέα εγγραφή εργαζόμενου στην Αθήνα',
  '🟢 Νέα αγγελία: Σερβιτόρος · Μύκονος',
  '🟢 3 matches την τελευταία ώρα',
  '🟢 Πωλητής εγγράφηκε στη Θεσσαλονίκη',
  '🟢 Νέα αγγελία: Αποθηκάριος · Αθήνα',
  '🟢 15 εργαζόμενοι εγγράφηκαν σήμερα',
  '🟢 Bartender βρήκε δουλειά σε 4 ώρες',
  '🟢 Νέα αγγελία: Καμαριέρα · Σαντορίνη',
  '🟢 Retail πωλητής match με Fashion Store',
  '🟢 Νέα αγγελία: Μάγειρας · Κρήτη',
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'μόλις τώρα';
  if (mins < 60) return `πριν ${mins} λεπτά`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `πριν ${hours} ώρες`;
  return `πριν ${Math.floor(hours / 24)} μέρες`;
}

export function ActivityMarquee() {
  const [items, setItems] = useState<string[]>(FALLBACK_ACTIVITIES);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/activity`);
        if (!res.ok) return;
        const json = await res.json();
        const activities = json?.data?.activity;
        if (!Array.isArray(activities) || activities.length === 0) return;

        const realItems = activities.map((a: any) => {
          const time = a.createdAt ? timeAgo(a.createdAt) : '';
          const location = a.location ? ` · ${a.location}` : '';
          if (a.type === 'signup') {
            return `🟢 ${a.text}${location} · ${time}`;
          }
          if (a.type === 'job') {
            return `💼 ${a.text}${location} · ${time}`;
          }
          return `🟢 ${a.text}${location}`;
        });

        if (!cancelled && realItems.length > 0) {
          setItems(realItems);
        }
      } catch {
        // Keep fallback
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="relative overflow-hidden border-y border-gray-800 bg-gray-950 py-2.5">
      {/* Edge fades */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-gray-950 to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-gray-950 to-transparent z-10" />

      {/* Scrolling track — two identical sets for seamless loop */}
      <div className="marquee-track flex whitespace-nowrap">
        <div className="marquee-content flex shrink-0">
          {items.map((item, i) => (
            <span key={i} className="mx-6 text-sm font-medium text-gray-400">
              {item}
            </span>
          ))}
        </div>
        <div className="marquee-content flex shrink-0" aria-hidden="true">
          {items.map((item, i) => (
            <span key={`d-${i}`} className="mx-6 text-sm font-medium text-gray-400">
              {item}
            </span>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scrollMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: scrollMarquee 90s linear infinite;
          width: max-content;
        }
      `}} />
    </div>
  );
}
