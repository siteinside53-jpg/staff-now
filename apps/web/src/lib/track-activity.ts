/**
 * Lightweight activity tracker.
 * - Logged-in users → POST /activity/track (with Bearer token)
 * - Anonymous visitors → POST /activity/visitor-track (no auth) using a
 *   persistent visitor_id stored in localStorage.
 *
 * Sends a heartbeat every 15s while the tab is visible so the admin
 * "live visitors" panel can mark someone as online or offline within
 * one minute of them closing the tab.
 *
 * Best-effort: silently ignores all errors so it never affects UX.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://staffnow-api-production.siteinside53.workers.dev';

const VISITOR_KEY = 'staffnow_visitor_id';
const HEARTBEAT_INTERVAL_MS = 15_000;

let lastPath = '';
let lastSent = 0;
const MIN_INTERVAL_MS = 1500;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function getOrCreateVisitorId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      // Random 24-char id
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      id = 'v_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function postUser(token: string, body: Record<string, unknown>) {
  fetch(`${API_BASE}/activity/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

function postVisitor(body: Record<string, unknown>) {
  fetch(`${API_BASE}/activity/visitor-track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

export function trackPageView(path: string) {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (path === lastPath && now - lastSent < MIN_INTERVAL_MS) return;
  lastPath = path;
  lastSent = now;

  const token = localStorage.getItem('staffnow_token');
  if (token) {
    postUser(token, { type: 'page_view', path });
  } else {
    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return;
    postVisitor({
      visitorId,
      type: 'page_view',
      path,
      referrer: document.referrer || null,
    });
  }
}

export function trackAction(type: string, meta?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem('staffnow_token');
  if (token) {
    postUser(token, { type, meta });
  } else {
    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return;
    postVisitor({ visitorId, type, path: lastPath || null });
  }
}

// =====================================================================
// Καταγραφή σφαλμάτων
//
// ΓΙΑΤΙ: μέχρι σήμερα, όταν ο χρήστης έβλεπε κόκκινο μήνυμα ή «Endpoint not
// found», ΔΕΝ γραφόταν πουθενά τίποτα. Άρα η ερώτηση «τους έβγαλε σφάλμα και
// βγήκαν;» ήταν αδύνατο να απαντηθεί. Τώρα γράφεται.
//
// Δεν χρειάστηκε καμία αλλαγή στον server: το /activity/track δέχεται
// οποιονδήποτε τύπο (apps/api/src/index.ts — body.type κομμένο στους 40
// χαρακτήρες, χωρίς λίστα επιτρεπτών).
//
// ΦΡΕΝΟ: αν κάτι μπει σε βρόχο (π.χ. σφάλμα μέσα σε render που ξαναπροσπαθεί),
// χωρίς όριο θα γέμιζε η βάση με χιλιάδες γραμμές σε δευτερόλεπτα.
// =====================================================================

/** Το πολύ τόσα σφάλματα ανά φόρτωση σελίδας. */
const MAX_ERRORS_PER_LOAD = 10;

/** Το ίδιο ακριβώς μήνυμα δεν ξαναγράφεται μέσα σε τόση ώρα. */
const ERROR_DEDUPE_MS = 30_000;

/** Το μήνυμα κόβεται εδώ — ο πίνακας δεν είναι για stack traces. */
const ERROR_MESSAGE_MAX = 300;

let errorsSent = 0;
const recentErrors = new Map<string, number>();

/**
 * Καταγράφει ένα σφάλμα που ΕΙΔΕ ο χρήστης.
 *
 * @param kind  σύντομη κατηγορία: 'api' | 'js' | 'promise' | 'auth'
 * @param message  το μήνυμα όπως το είδε ή όπως ήρθε από τον server
 * @param meta  ό,τι βοηθάει: status, endpoint, code
 */
export function trackError(kind: string, message: string, meta?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  const text = String(message || '').slice(0, ERROR_MESSAGE_MAX);
  const now = Date.now();

  // Φρένο 1: ταβάνι ανά φόρτωση σελίδας.
  if (errorsSent >= MAX_ERRORS_PER_LOAD) return;

  // Φρένο 2: όχι δύο φορές το ίδιο μήνυμα μέσα σε 30 δευτερόλεπτα.
  const key = `${kind}|${text}`;
  const last = recentErrors.get(key);
  if (last && now - last < ERROR_DEDUPE_MS) return;
  recentErrors.set(key, now);

  errorsSent++;

  const path = lastPath || window.location.pathname;
  const token = localStorage.getItem('staffnow_token');

  if (token) {
    postUser(token, {
      type: `error_${kind}`.slice(0, 40),
      path,
      meta: { ...(meta || {}), message: text },
    });
  } else {
    // Ο anonymous_activity_log ΔΕΝ έχει στήλη metadata (το τσέκαρα) και δεν
    // κάνω μετανάστευση γι' αυτό τώρα — βάζω το μήνυμα στο πεδίο διαδρομής,
    // ώστε τουλάχιστον να μη χαθεί.
    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return;
    postVisitor({
      visitorId,
      type: `error_${kind}`.slice(0, 40),
      path: `${path} — ${text}`.slice(0, 200),
    });
  }
}

/**
 * Πιάνει τα σφάλματα που «σπάνε» τη σελίδα και όσα υποσχέσεις αφήνουν πίσω.
 * Καλείται μία φορά, από το <TrackPageView /> που φορτώνεται παντού.
 */
export function installErrorTracking() {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __snErrTracked?: boolean };
  if (w.__snErrTracked) return;
  w.__snErrTracked = true;

  window.addEventListener('error', (e: ErrorEvent) => {
    // Τα σφάλματα φόρτωσης πόρων (εικόνα/script που δεν κατέβηκε) έρχονται από
    // εδώ χωρίς μήνυμα — δεν είναι αυτό που ψάχνουμε, τα προσπερνάω.
    if (!e.message) return;
    trackError('js', e.message, {
      source: e.filename || null,
      line: e.lineno || null,
    });
  });

  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const r: any = e.reason;
    const msg = r?.message || (typeof r === 'string' ? r : 'Unhandled rejection');
    trackError('promise', msg, r?.status ? { status: r.status } : undefined);
  });
}

/**
 * Periodic heartbeat. Keeps the visitor flagged "online" in the admin
 * panel for as long as the tab is open & visible.
 */
export function startHeartbeat() {
  if (typeof window === 'undefined') return;
  if (heartbeatTimer) return;
  const tick = () => {
    if (document.hidden) return; // skip when tab hidden
    const path = lastPath || window.location.pathname;
    const token = localStorage.getItem('staffnow_token');
    if (token) {
      postUser(token, { type: 'heartbeat', path });
    } else {
      const visitorId = getOrCreateVisitorId();
      if (visitorId) postVisitor({ visitorId, type: 'heartbeat', path });
    }
  };
  // First beat shortly after mount, then on interval
  setTimeout(tick, 2000);
  heartbeatTimer = setInterval(tick, HEARTBEAT_INTERVAL_MS);
}

export function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
