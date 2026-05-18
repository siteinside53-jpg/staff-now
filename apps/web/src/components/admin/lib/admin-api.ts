/**
 * Centralized fetch helpers for the admin panel.
 * Wraps the existing StaffNow API.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://staffnow-api-production.siteinside53.workers.dev';

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function handle<T>(res: Response): Promise<T> {
  const data = (await res.json()) as { success: boolean; data?: T; error?: { message: string } };
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || `Request failed (${res.status})`);
  }
  return data.data as T;
}

async function handlePaginated<T>(res: Response): Promise<{ items: T[]; pagination?: any }> {
  const data = (await res.json()) as any;
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Request failed');
  }
  // The API uses `meta` (page/perPage/total/totalPages); legacy code looked for
  // `pagination`. Surface both keys so existing callers keep working and new
  // code can rely on `pagination`.
  const pagination = data.meta || data.pagination || null;
  return { items: data.data || [], pagination };
}

function buildQS(params: Record<string, any>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') qs.set(k, String(v));
  });
  return qs.toString();
}

export const adminApi = {
  // ---------- Stats / Overview ----------
  async getStats() {
    const res = await fetch(`${API_BASE}/admin/stats`, { headers: authHeaders() });
    return handle<any>(res);
  },

  // ---------- Sidebar nav badges ----------
  async getNavCounts() {
    const res = await fetch(`${API_BASE}/admin/nav-counts`, { headers: authHeaders() });
    return handle<{
      jobs: number;
      users: number;
      employers: number;
      workers: number;
      matches: number;
      messages: number;
      reports: number;
      security: number;
      notifications: number;
    }>(res);
  },

  async markNavSeen(section: string) {
    const res = await fetch(
      `${API_BASE}/admin/nav-seen/${encodeURIComponent(section)}`,
      { method: 'POST', headers: authHeaders() },
    );
    return handle<{ ok: boolean }>(res);
  },

  // ---------- Users ----------
  async getUsers(
    params: {
      page?: number;
      limit?: number;
      role?: string;
      status?: string;
      search?: string;
    } = {}
  ) {
    const res = await fetch(`${API_BASE}/admin/users?${buildQS(params)}`, { headers: authHeaders() });
    return handlePaginated<any>(res);
  },

  async suspendUser(id: string, reason?: string) {
    const res = await fetch(`${API_BASE}/admin/users/${id}/suspend`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handle<any>(res);
  },

  async unsuspendUser(id: string) {
    const res = await fetch(`${API_BASE}/admin/users/${id}/unsuspend`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return handle<any>(res);
  },

  // ---------- Reports ----------
  async getReports(
    status: 'pending' | 'resolved' | 'dismissed' | 'action_taken' = 'pending',
    page = 1
  ) {
    const res = await fetch(`${API_BASE}/admin/reports?status=${status}&page=${page}&limit=50`, {
      headers: authHeaders(),
    });
    return handlePaginated<any>(res);
  },

  async reviewReport(
    id: string,
    decision: 'resolved' | 'dismissed' | 'action_taken',
    action?: 'warn' | 'suspend' | 'none',
    reason?: string
  ) {
    const res = await fetch(`${API_BASE}/admin/reports/${id}/review`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ decision, action, reason }),
    });
    return handle<any>(res);
  },

  // ---------- Verifications ----------
  async getVerifications(status: 'pending' | 'approved' | 'rejected' = 'pending') {
    const res = await fetch(`${API_BASE}/admin/verifications?status=${status}`, {
      headers: authHeaders(),
    });
    return handlePaginated<any>(res);
  },

  async reviewVerification(id: string, decision: 'approved' | 'rejected', reason?: string) {
    const res = await fetch(`${API_BASE}/admin/verifications/${id}/review`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ decision, reason }),
    });
    return handle<any>(res);
  },

  // ---------- Jobs ----------
  async getJobs(params: { page?: number; limit?: number; status?: string; search?: string } = {}) {
    const res = await fetch(`${API_BASE}/admin/jobs?${buildQS(params)}`, { headers: authHeaders() });
    return handlePaginated<any>(res);
  },

  async pauseJob(id: string) {
    const res = await fetch(`${API_BASE}/admin/jobs/${id}/pause`, { method: 'POST', headers: authHeaders() });
    return handle<any>(res);
  },

  async unpauseJob(id: string) {
    const res = await fetch(`${API_BASE}/admin/jobs/${id}/unpause`, { method: 'POST', headers: authHeaders() });
    return handle<any>(res);
  },

  async deleteJob(id: string) {
    const res = await fetch(`${API_BASE}/admin/jobs/${id}`, { method: 'DELETE', headers: authHeaders() });
    return handle<any>(res);
  },

  // ---------- Matches ----------
  async getMatches(
    params: { page?: number; limit?: number; status?: string; range?: 'today' | '7d' | '30d' | 'all' } = {},
  ) {
    const res = await fetch(`${API_BASE}/admin/matches?${buildQS(params)}`, { headers: authHeaders() });
    return handlePaginated<any>(res);
  },

  // ---------- Conversations ----------
  async getConversations(
    params: { page?: number; limit?: number; status?: string; range?: 'today' | '7d' | '30d' | 'all'; search?: string } = {},
  ) {
    const res = await fetch(`${API_BASE}/admin/conversations?${buildQS(params)}`, { headers: authHeaders() });
    return handlePaginated<any>(res);
  },

  async getConversationMessages(id: string) {
    const res = await fetch(`${API_BASE}/admin/conversations/${id}/messages`, { headers: authHeaders() });
    return handle<{ conversation: any; messages: any[] }>(res);
  },

  // ---------- Subscriptions ----------
  async getSubscriptions() {
    const res = await fetch(`${API_BASE}/admin/subscriptions`, { headers: authHeaders() });
    return handle<any>(res);
  },

  // ---------- Payments ----------
  async getPayments(limit = 50) {
    const res = await fetch(`${API_BASE}/admin/payments?limit=${limit}`, { headers: authHeaders() });
    return handle<any[]>(res);
  },

  // ---------- Audit Log ----------
  async getAuditLog(params: { page?: number; limit?: number; action?: string; admin_id?: string } = {}) {
    const res = await fetch(`${API_BASE}/admin/audit-log?${buildQS(params)}`, { headers: authHeaders() });
    return handlePaginated<any>(res);
  },

  // ---------- Events ----------
  async getEvents(limit = 20) {
    const res = await fetch(`${API_BASE}/admin/events?limit=${limit}`, { headers: authHeaders() });
    return handle<any[]>(res);
  },

  async ackEvent(id: string) {
    const res = await fetch(`${API_BASE}/admin/events/${encodeURIComponent(id)}/read`, {
      method: 'POST', headers: authHeaders(),
    });
    return handle<{ acked: boolean }>(res);
  },

  async ackAllEvents(ids: string[]) {
    const res = await fetch(`${API_BASE}/admin/events/read-all`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    return handle<{ acked: number }>(res);
  },

  // ---------- Admin team (RBAC) ----------
  async getAdmins() {
    const res = await fetch(`${API_BASE}/admin/admins`, { headers: authHeaders() });
    return handle<{ items: any[] }>(res);
  },

  async addAdmin(email: string, admin_role: string) {
    const res = await fetch(`${API_BASE}/admin/admins`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, admin_role }),
    });
    return handle<any>(res);
  },

  async updateAdminRole(id: string, admin_role: string) {
    const res = await fetch(`${API_BASE}/admin/admins/${id}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_role }),
    });
    return handle<any>(res);
  },

  async removeAdmin(id: string) {
    const res = await fetch(`${API_BASE}/admin/admins/${id}`, {
      method: 'DELETE', headers: authHeaders(),
    });
    return handle<any>(res);
  },

  // ---------- Analytics ----------
  async getAnalyticsSeries(days = 14) {
    const res = await fetch(`${API_BASE}/admin/analytics/series?days=${days}`, { headers: authHeaders() });
    return handle<{ signups: number[]; matches: number[]; jobs: number[]; messages: number[]; dau: number[] }>(res);
  },

  // ---------- Admin users ----------
  async getAdminUsers() {
    const res = await fetch(`${API_BASE}/admin/admin-users`, { headers: authHeaders() });
    return handle<any[]>(res);
  },

  // ---------- Live activity / presence ----------
  async getPresence() {
    const res = await fetch(`${API_BASE}/admin/presence`, { headers: authHeaders() });
    return handle<{
      onlineNow: number;
      activeToday: number;
      activeThisWeek: number;
      onlineWindowMinutes: number;
      users: Array<{ id: string; name?: string; email: string; role: string; photo?: string; last_seen_at: string }>;
    }>(res);
  },

  async getLiveActivity(params: { limit?: number; types?: string } = {}) {
    const res = await fetch(`${API_BASE}/admin/activity/live?${buildQS(params)}`, { headers: authHeaders() });
    return handle<any[]>(res);
  },

  async getRecentSignups(limit = 20) {
    const res = await fetch(`${API_BASE}/admin/signups/recent?limit=${limit}`, { headers: authHeaders() });
    return handle<any[]>(res);
  },

  async getUserTimeline(id: string, limit = 100) {
    const res = await fetch(`${API_BASE}/admin/users/${id}/timeline?limit=${limit}`, { headers: authHeaders() });
    return handle<{
      user: any;
      activity: any[];
      sessions: any[];
      topPages: Array<{ path: string; count: number }>;
    }>(res);
  },

  async getJobDetails(id: string) {
    const res = await fetch(`${API_BASE}/admin/jobs/${id}/full`, { headers: authHeaders() });
    return handle<{
      job: any;
      roles: string[];
      positions: any[];
      applicants: any[];
      counts: { likes: number; skips: number; matches: number };
    }>(res);
  },

  async getGeoStats(days = 30) {
    const res = await fetch(`${API_BASE}/admin/geo-stats?days=${days}`, { headers: authHeaders() });
    return handle<{
      days: number;
      totals: { totalActions: number; uniqueCountries: number; uniqueCities: number; uniqueUsers: number };
      countries: Array<{ country: string; users: number; actions: number }>;
      cities: Array<{ country: string; city: string; users: number; actions: number }>;
      today: Array<{ country: string; users: number }>;
    }>(res);
  },

  async getDataChanges(
    params: {
      page?: number;
      limit?: number;
      action?: string;
      entityType?: string;
      actorId?: string;
      ownerId?: string;
      search?: string;
    } = {},
  ) {
    const res = await fetch(`${API_BASE}/admin/data-changes?${buildQS(params)}`, { headers: authHeaders() });
    return handlePaginated<any>(res);
  },

  // ---------- Billing admin ----------
  async getBillingOverview() {
    const res = await fetch(`${API_BASE}/admin/billing/overview`, { headers: authHeaders() });
    return handle<{
      activeSubscriptions: number;
      pastDue: number;
      inGracePeriod: number;
      mrrCents: number;
      paid24h: { count: number; amountCents: number };
      failed24h: number;
      pendingTransfers: number;
      refunded30dCents: number;
    }>(res);
  },

  async getBillingPayments(
    params: { page?: number; limit?: number; status?: string; provider?: string } = {},
  ) {
    const res = await fetch(`${API_BASE}/admin/billing/payments?${buildQS(params)}`, {
      headers: authHeaders(),
    });
    return handlePaginated<any>(res);
  },

  async getManualTransfers(status: 'pending' | 'paid' | 'expired' | 'cancelled' = 'pending') {
    const res = await fetch(`${API_BASE}/admin/billing/manual-transfers?status=${status}`, {
      headers: authHeaders(),
    });
    return handle<{ items: any[] }>(res);
  },

  async confirmManualTransfer(id: string) {
    const res = await fetch(`${API_BASE}/admin/billing/manual-transfers/${id}/confirm`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return handle<{ ok: boolean; paymentId: string }>(res);
  },

  async cancelManualTransfer(id: string, reason?: string) {
    const res = await fetch(`${API_BASE}/admin/billing/manual-transfers/${id}/cancel`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handle<{ ok: boolean }>(res);
  },

  async refundPayment(id: string, amountCents?: number) {
    const res = await fetch(`${API_BASE}/admin/billing/payments/${id}/refund`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ amountCents }),
    });
    return handle<{ ok: boolean; refundId?: string }>(res);
  },

  // ---------- Cohort aggregate stats (workers / businesses pages) ----------
  async getCohortStats(role: 'worker' | 'business') {
    const res = await fetch(`${API_BASE}/admin/cohort-stats?role=${role}`, { headers: authHeaders() });
    return handle<{
      total: number;
      verified: number;
      // worker fields
      complete80plus?: number;
      avgCompleteness?: number;
      avgYearsExperience?: number;
      withRoles?: number;
      premium?: number;
      withPhoto?: number;
      // business fields
      paid?: number;
      distinctTypes?: number;
      withBranch?: number;
      withJobs?: number;
      publishedJobs?: number;
      freePlan?: number;
      // both
      suspended?: number;
    }>(res);
  },

  // ---------- Security: errors ----------
  async getErrors(
    params: {
      page?: number;
      limit?: number;
      level?: 'error' | 'warn' | 'fatal' | string;
      code?: string;
      user_id?: string;
      path?: string;
      resolved?: 0 | 1 | string;
      search?: string;
    } = {},
  ) {
    const res = await fetch(`${API_BASE}/admin/errors?${buildQS(params)}`, { headers: authHeaders() });
    return handlePaginated<any>(res);
  },

  async getErrorDetails(id: string) {
    const res = await fetch(`${API_BASE}/admin/errors/${id}`, { headers: authHeaders() });
    return handle<any>(res);
  },

  async resolveError(id: string, notes?: string) {
    const res = await fetch(`${API_BASE}/admin/errors/${id}/resolve`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ notes }),
    });
    return handle<{ id: string; resolved: boolean }>(res);
  },

  // ---------- Security: aggregated overview ----------
  async getSecurityOverview() {
    const res = await fetch(`${API_BASE}/admin/security/overview`, { headers: authHeaders() });
    return handle<{
      errors: {
        last5m: number;
        last1h: number;
        last24h: number;
        open: number;
        fatal24h: number;
        distinctIps24h: number;
        byCode: Array<{ code: string; c: number }>;
        byPath: Array<{ path: string; c: number }>;
        sparkline24h: Array<{ bucket: string; c: number }>;
      };
    }>(res);
  },

  async getSecuritySuspicious(limit = 50) {
    const res = await fetch(`${API_BASE}/admin/security/suspicious?limit=${limit}`, { headers: authHeaders() });
    return handle<{
      newCountryLogins: any[];
      repeatedFailures: any[];
      errorBursts: any[];
      rapidEdits: any[];
      privilegeChanges: any[];
    }>(res);
  },

  // ---------- Security: SSE live feed ----------
  /**
   * EventSource() can't send custom headers, so the JWT goes in the URL.
   * Returns the EventSource so the caller can attach event listeners.
   */
  openSecurityStream(): EventSource | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('staffnow_token');
    if (!token) return null;
    const url = `${API_BASE}/admin/security/stream?token=${encodeURIComponent(token)}`;
    return new EventSource(url);
  },

  // ---------- Analytics: SSE live snapshot feed ----------
  openAnalyticsStream(): EventSource | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('staffnow_token');
    if (!token) return null;
    const url = `${API_BASE}/admin/analytics/stream?token=${encodeURIComponent(token)}`;
    return new EventSource(url);
  },

  // ---------- User: full forensic timeline ----------
  async getUserFullTimeline(id: string, limit = 200) {
    const res = await fetch(`${API_BASE}/admin/users/${id}/full?limit=${limit}`, { headers: authHeaders() });
    return handle<{
      user: any;
      activity: any[];
      sessions: any[];
      dataChanges: any[];
      errors: any[];
      audit: any[];
    }>(res);
  },

  async getLiveVisitors(windowSec = 60) {
    const res = await fetch(`${API_BASE}/admin/live-visitors?windowSec=${windowSec}`, { headers: authHeaders() });
    return handle<{
      windowSec: number;
      cutoff: string;
      serverTime: string;
      totals: { loggedIn: number; anonymous: number; total: number };
      visitors: Array<{
        kind: 'user' | 'anon';
        id: string;
        name: string | null;
        email: string | null;
        role: string | null;
        photo: string | null;
        country: string | null;
        city: string | null;
        region: string | null;
        ipMasked: string | null;
        currentPath: string | null;
        lastSeenAt: string;
        sessionStartedAt: string | null;
        pageViews: number;
        trail: Array<{ path: string; ts: string }>;
      }>;
    }>(res);
  },
};

export { API_BASE };
