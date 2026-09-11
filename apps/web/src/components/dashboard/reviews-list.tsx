'use client';

/**
 * «Τι λένε γι' αυτόν/ήν» — οι αξιολογήσεις που έλαβε ένας χρήστης, όπως τις
 * βλέπουν οι άλλοι μέσα στο προφίλ του.
 *
 * Γιατί υπάρχει: ο μέσος όρος φαινόταν, τα σχόλια όχι. Μια επιχείρηση που
 * σκεφτόταν να προσλάβει δεν είχε πού να διαβάσει τι έγραψαν οι προηγούμενοι.
 * Δείχνει μόνο ό,τι υπάρχει· χωρίς αξιολογήσεις δεν εμφανίζεται καθόλου.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Review {
  id: string;
  overall: number;
  comment: string | null;
  created_at: string;
  rater_role: 'worker' | 'business';
  rater_name: string;
  rater_photo: string | null;
  job_title: string | null;
}

function stars(n: number) {
  const full = Math.max(0, Math.min(5, Math.round(n)));
  return (
    <span className="text-sm" aria-label={`${full} από 5`}>
      <span className="text-yellow-400">{'★'.repeat(full)}</span>
      <span className="text-gray-300">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('el-GR', { month: 'short', year: 'numeric' });
}

export function ReviewsList({ userId, className = '' }: { userId: string; className?: string }) {
  const [items, setItems] = useState<Review[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = (await api.hires.ratingsOf(userId)) as any;
        if (alive) setItems(res?.data?.items || []);
      } catch {
        if (alive) setItems([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  if (!items || items.length === 0) return null;

  return (
    <div className={className}>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">
        Αξιολογήσεις ({items.length})
      </h2>
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center gap-2.5">
              {r.rater_photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.rater_photo} alt="" className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  {r.rater_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{r.rater_name}</p>
                <p className="truncate text-[11px] text-gray-500">
                  {r.rater_role === 'business' ? 'Επιχείρηση' : 'Εργαζόμενος/η'}
                  {r.job_title ? ` · ${r.job_title}` : ''}
                  {r.created_at ? ` · ${when(r.created_at)}` : ''}
                </p>
              </div>
              {stars(r.overall)}
            </div>
            {r.comment && <p className="mt-2 text-sm leading-relaxed text-gray-700">{r.comment}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
