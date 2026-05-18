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
