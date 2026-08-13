'use client';

/**
 * «Πού κόλλησε, πού έφυγε» — το ιστορικό ενός χρήστη, χωρισμένο σε επισκέψεις.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ: η παλιά επίπεδη λίστα έφερνε τις 200 τελευταίες ωμές γραμμές.
 * Επειδή το 98,4% του πίνακα είναι «heartbeat» και «page_view», ό,τι κι αν
 * έκανες scroll έβλεπες την ίδια λέξη. Εδώ κάθε επίσκεψη είναι μία κάρτα, τα
 * heartbeat έγιναν «έμεινε τόση ώρα», και τέσσερις σημάνσεις απαντούν στο
 * ερώτημα: 🔴 σφάλμα · 🚪 έφυγε από εδώ · ⏳ κόλλησε · 🔁 ξαναγύρισε.
 */

import { useCallback, useEffect, useState } from 'react';
import { adminApi, type VisitEvent, type VisitSummary, type VisitsOverview } from './lib/admin-api';
import { pageName } from '@/lib/page-names';

export function UserVisits({ userId }: { userId: string }) {
  const [visits, setVisits] = useState<VisitSummary[]>([]);
  const [overview, setOverview] = useState<VisitsOverview | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setVisits([]);
    setOverview(null);
    adminApi
      .getUserVisits(userId, { limit: 10 })
      .then((d) => {
        if (cancelled) return;
        setVisits(d.visits || []);
        setOverview(d.overview || null);
        setHasMore(!!d.hasMore);
        setNextBefore(d.nextBefore || null);
      })
      .catch((e) => !cancelled && setErr(e?.message || 'Σφάλμα φόρτωσης'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const loadMore = useCallback(() => {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    adminApi
      .getUserVisits(userId, { before: nextBefore, limit: 10 })
      .then((d) => {
        setVisits((prev) => [...prev, ...(d.visits || [])]);
        setHasMore(!!d.hasMore);
        setNextBefore(d.nextBefore || null);
      })
      .catch((e) => setErr(e?.message || 'Σφάλμα φόρτωσης'))
      .finally(() => setLoadingMore(false));
  }, [userId, nextBefore, loadingMore]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">🧭 Τι έκανε — ανά επίσκεψη</h2>
        {!loading && <span className="text-xs text-gray-400">{visits.length} επισκέψεις φορτωμένες</span>}
      </div>

      {overview && <OverviewStrip o={overview} />}

      {loading && <p className="text-sm text-gray-400">Φόρτωση επισκέψεων…</p>}
      {err && <p className="text-sm text-rose-600">Σφάλμα: {err}</p>}
      {!loading && !err && visits.length === 0 && (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          Καμία καταγραμμένη επίσκεψη.
        </p>
      )}

      <div className="space-y-3">
        {visits.map((v) => (
          <VisitCard key={v.started_at} userId={userId} visit={v} />
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {loadingMore ? 'Φόρτωση…' : 'Φόρτωσε παλαιότερες επισκέψεις'}
        </button>
      )}
    </section>
  );
}

/** Η απάντηση χωρίς κλικ: πού μας αφήνει, πόσα σφάλματα, πόση ώρα. */
function OverviewStrip({ o }: { o: VisitsOverview }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span>
          <span className="text-gray-400">Επισκέψεις:</span>{' '}
          <span className="font-bold text-gray-900 tabular-nums">{o.visits}</span>
        </span>
        <span>
          <span className="text-gray-400">Συνολικός χρόνος:</span>{' '}
          <span className="font-bold text-gray-900">{formatDuration(o.total_sec)}</span>
        </span>
        <span>
          <span className="text-gray-400">Σφάλματα που είδε:</span>{' '}
          <span className={`font-bold tabular-nums ${o.errors > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
            {o.errors}
          </span>
        </span>
      </div>

      {o.exits.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">🚪 Έφυγε από</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {o.exits.map((e) => (
              <span
                key={e.path}
                title={e.path}
                className="rounded-full bg-white ring-1 ring-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-700"
              >
                {pageName(e.path)}
                <span className="ml-1 text-gray-400">×{e.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VisitCard({ userId, visit: v }: { userId: string; visit: VisitSummary }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<VisitEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Τα γεγονότα κατεβαίνουν ΜΟΝΟ όταν ανοίξει η κάρτα — αλλιώς σε χρήστη με
  // 221 επισκέψεις θα κατέβαιναν δεκάδες χιλιάδες γραμμές χωρίς λόγο.
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && events === null && !loading) {
      setLoading(true);
      adminApi
        .getVisitEvents(userId, v.started_at, v.ended_at)
        .then((d) => setEvents(d.events || []))
        .catch((e) => setErr(e?.message || 'Σφάλμα φόρτωσης'))
        .finally(() => setLoading(false));
    }
  };

  const verdict = verdictOf(v);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">
              📅 {formatVisitRange(v.started_at, v.ended_at)}
              <span className="ml-2 font-normal text-gray-500">· {formatDuration(v.duration_sec)}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500 truncate">
              📍 {v.city || 'άγνωστη πόλη'} · {deviceLabel(v.user_agent)}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${verdict.className}`}>
                {verdict.label}
              </span>
              {v.exit_path && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600" title={v.exit_path}>
                  🚪 {pageName(v.exit_path)}
                </span>
              )}
              {v.errors > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                  🔴 {v.errors} σφάλμα{v.errors === 1 ? '' : 'τα'}
                </span>
              )}
            </div>
          </div>
          <span className="flex-shrink-0 text-gray-300 text-sm">{open ? '▾' : '▸'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
          {loading && <p className="text-xs text-gray-400">Φόρτωση…</p>}
          {err && <p className="text-xs text-rose-600">{err}</p>}
          {events && events.length === 0 && (
            <p className="text-xs text-gray-400">Καμία λεπτομέρεια για αυτή την επίσκεψη.</p>
          )}
          {events && events.length > 0 && (
            <ol className="space-y-1.5">
              {events.map((e, i) => (
                <EventRow key={`${e.at}-${i}`} e={e} />
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function EventRow({ e }: { e: VisitEvent }) {
  const isError = e.kind === 'error';
  return (
    <li
      className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 ${
        isError ? 'bg-rose-50 ring-1 ring-rose-200' : e.stuck ? 'bg-amber-50 ring-1 ring-amber-200' : ''
      }`}
    >
      <span className="w-[42px] flex-shrink-0 text-[11px] tabular-nums text-gray-400 pt-0.5">
        {formatTime(e.at)}
      </span>
      <span className="flex-shrink-0 text-sm leading-5">{iconFor(e)}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] leading-5 ${isError ? 'font-bold text-rose-700' : 'text-gray-900'}`}>
          {describeEvent(e)}
        </p>
        {isError && errorMessage(e) && (
          <p className="text-[11px] text-rose-600 break-words">«{errorMessage(e)}»</p>
        )}
        {e.kind === 'page' && e.target && (
          <p className="text-[10px] text-gray-400 truncate" title={e.target}>
            {e.target}
          </p>
        )}
        {/*
          Οι σημάνσεις μπαίνουν ΚΑΤΩ από το όνομα, όχι δεξιά του.
          Στο κινητό τις είχα δεξιά και σκέπαζαν το κείμενο: το «Επαλήθευση
          λογαριασμού» εμφανιζόταν σαν «Επαλ ⏳κόλλησε; 🚪έφυγε λογαριασμού».
          Το είδα σε στιγμιότυπο 375px. Έτσι δεν μπορεί να ξανασυμβεί σε καμία
          οθόνη, όσο στενή κι αν είναι.
        */}
        {(e.stuck || e.revisit || e.exit) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {e.stuck && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                ⏳ κόλλησε;
              </span>
            )}
            {e.revisit && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                🔁 ξαναγύρισε
              </span>
            )}
            {e.exit && (
              <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">
                🚪 έφυγε
              </span>
            )}
          </div>
        )}
      </div>
      {e.kind === 'page' && (e.duration_sec || 0) > 0 && (
        <span className="flex-shrink-0 pt-0.5 text-[11px] text-gray-500 whitespace-nowrap">
          {formatDuration(e.duration_sec || 0)}
        </span>
      )}
    </li>
  );
}

// =====================================================================
// Το συμπέρασμα με μία γραμμή
// =====================================================================

function verdictOf(v: VisitSummary): { label: string; className: string } {
  if (v.left_after_error) {
    return { label: '🔴 Έφυγε αμέσως μετά από σφάλμα', className: 'bg-rose-100 text-rose-700' };
  }
  if (v.errors > 0) {
    return { label: '🟠 Είδε σφάλμα αλλά συνέχισε', className: 'bg-orange-100 text-orange-700' };
  }
  // Μπήκε και έφυγε σε λιγότερο από ένα λεπτό — δεν πρόλαβε να κάνει τίποτα.
  if (v.duration_sec < 60) {
    return { label: '⚡ Μπήκε και έφυγε αμέσως', className: 'bg-gray-100 text-gray-600' };
  }
  return { label: '✅ Κανονική επίσκεψη', className: 'bg-emerald-100 text-emerald-700' };
}

const ICONS: Record<string, string> = {
  login: '🔓',
  logout: '🚪',
  register: '🆕',
  swipe_like: '❤️',
  swipe_skip: '➡️',
  match: '🎯',
  message_send: '💬',
  profile_update: '📝',
  job_post: '📢',
  job_pause: '⏸️',
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  upload: '📎',
};

function iconFor(e: VisitEvent): string {
  if (e.kind === 'error') return '🔴';
  if (e.kind === 'page') return '👁️';
  return ICONS[e.type] || '⚡';
}

const ACTIONS: Record<string, string> = {
  login: 'Συνδέθηκε',
  logout: 'Αποσυνδέθηκε',
  register: 'Έκανε εγγραφή',
  swipe_like: 'Έκανε like',
  swipe_skip: 'Πέρασε χωρίς like',
  match: 'Νέο ταίριασμα',
  message_send: 'Έστειλε μήνυμα',
  profile_update: 'Ενημέρωσε το προφίλ',
  job_post: 'Δημοσίευσε αγγελία',
  job_pause: 'Σταμάτησε αγγελία',
  create: 'Δημιούργησε',
  update: 'Άλλαξε στοιχεία',
  delete: 'Διέγραψε',
  upload: 'Ανέβασε αρχείο',
};

function describeEvent(e: VisitEvent): string {
  if (e.kind === 'page') return pageName(e.target);
  if (e.kind === 'error') {
    if (e.type === 'error_auth') return 'Έληξε η σύνδεσή του';
    if (e.type === 'error_js') return 'Χάλασε κάτι στη σελίδα';
    if (e.type === 'error_api') return 'Απέτυχε αίτημα στον server';
    return 'Σφάλμα';
  }
  const label = ACTIONS[e.type];
  if (label) return label;
  // Ό,τι δεν ξέρω, το δείχνω όπως είναι — δεν κρύβω πληροφορία.
  return e.type;
}

function errorMessage(e: VisitEvent): string | null {
  if (!e.metadata) return null;
  try {
    const m = JSON.parse(e.metadata);
    const msg = m?.message || m?.error || null;
    if (!msg) return null;
    return m?.status ? `${msg} (${m.status})` : String(msg);
  } catch {
    return null;
  }
}

// =====================================================================
// Μορφοποίηση
// =====================================================================

function formatDuration(sec: number): string {
  if (!sec || sec < 0) return '0 δευτ.';
  if (sec < 60) return `${Math.round(sec)} δευτ.`;
  const mins = Math.round(sec / 60);
  if (mins < 60) return `${mins} λεπτ${mins === 1 ? 'ό' : 'ά'}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}ω ${m}λ` : `${h}ω`;
}

function formatTime(s: string): string {
  return new Date(s).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
}

function formatVisitRange(from: string, to: string): string {
  const a = new Date(from);
  const day = a.toLocaleDateString('el-GR', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day}, ${formatTime(from)} → ${formatTime(to)}`;
}

/** Από το user agent, μόνο όσο χρειάζεται ένας άνθρωπος. */
function deviceLabel(ua: string | null): string {
  if (!ua) return 'άγνωστη συσκευή';
  const device = /iPhone/i.test(ua)
    ? '📱 iPhone'
    : /iPad/i.test(ua)
      ? '📱 iPad'
      : /Android/i.test(ua)
        ? '📱 Android'
        : /Macintosh/i.test(ua)
          ? '💻 Mac'
          : /Windows/i.test(ua)
            ? '💻 Windows'
            : '💻 Υπολογιστής';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /Chrome\//i.test(ua)
      ? 'Chrome'
      : /Firefox\//i.test(ua)
        ? 'Firefox'
        : /Safari\//i.test(ua)
          ? 'Safari'
          : '';
  return browser ? `${device} / ${browser}` : device;
}
