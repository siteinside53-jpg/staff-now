/**
 * StaffNow v6 — centralised API client.
 * - Single source for the base URL.
 * - Always includes JWT from storage (set on login/signup).
 * - Wraps fetch with typed helpers + error normalisation.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://staffnow-api-production.siteinside53.workers.dev';

const TOKEN_KEY = 'staffnow_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  /** when true, do not attach Authorization header */
  anonymous?: boolean;
  /** when true, send as multipart (body should be FormData) */
  multipart?: boolean;
}

async function request<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(API_BASE + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const headers: Record<string, string> = {};
  if (!opts.multipart && opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (!opts.anonymous) {
    const t = getToken();
    if (t) headers['Authorization'] = `Bearer ${t}`;
  }
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: opts.method || 'GET',
      headers,
      body:
        opts.body === undefined
          ? undefined
          : opts.multipart
            ? (opts.body as FormData)
            : JSON.stringify(opts.body),
      signal: opts.signal,
      credentials: 'include',
    });
  } catch (e) {
    throw new ApiError('Δεν υπάρχει σύνδεση με τον server', 0, 'NETWORK');
  }
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    // ignore
  }
  if (!res.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Σφάλμα ${res.status}`;
    throw new ApiError(message, res.status, payload?.error?.code);
  }
  return (payload?.data ?? payload) as T;
}

/**
 * Helper for list endpoints with mixed response shapes:
 *   { data: [..], meta: { total } }     ← jobs, conversations
 *   { data: { items: [..], total } }    ← discover, search
 *   { data: { ... } }                   ← rare
 * Always returns `{ items, total }`.
 */
async function requestList<TItem = any>(
  path: string,
  opts: RequestOptions = {},
): Promise<{ items: TItem[]; total: number }> {
  const url = new URL(API_BASE + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const headers: Record<string, string> = {};
  if (!opts.anonymous) {
    const t = getToken();
    if (t) headers['Authorization'] = `Bearer ${t}`;
  }
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: opts.method || 'GET',
      headers,
      signal: opts.signal,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Δεν υπάρχει σύνδεση με τον server', 0, 'NETWORK');
  }
  const payload: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(payload?.error?.message || `Σφάλμα ${res.status}`, res.status, payload?.error?.code);
  }
  const data = payload?.data;
  if (Array.isArray(data))
    return { items: data as TItem[], total: payload?.meta?.total ?? data.length };
  if (Array.isArray(data?.items))
    return {
      items: data.items as TItem[],
      total: data.total ?? payload?.meta?.total ?? data.items.length,
    };
  return { items: [], total: 0 };
}

// =============================================================
// Typed endpoints
// =============================================================

export type Role = 'worker' | 'business' | 'admin';

export interface User {
  id: string;
  email: string;
  role: Role;
  display_name?: string | null;
  avatar_url?: string | null;
  status?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const auth = {
  register(body: {
    email: string;
    password: string;
    confirmPassword: string;
    role: Exclude<Role, 'admin'>;
    acceptTerms: boolean;
  }) {
    return request<AuthResponse>('/auth/register', { method: 'POST', body, anonymous: true });
  },
  login(email: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      anonymous: true,
    });
  },
  me() {
    return request<{ user: User; profile?: any }>('/auth/me');
  },
  logout() {
    return request<{ success: true }>('/auth/logout', { method: 'POST' }).catch(() => ({
      success: true,
    }));
  },
  forgotPassword(email: string) {
    return request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
      anonymous: true,
    });
  },
};

export const workers = {
  me() {
    return request<{ profile: any; roles: string[]; languages: string[] }>('/workers/me');
  },
  updateMe(body: any) {
    return request<{ profile: any }>('/workers/me', { method: 'PATCH', body });
  },
  view(id: string) {
    return request<any>(`/workers/${id}`);
  },
  discover(limit = 30) {
    return requestList<any>('/workers/discover', { query: { limit } });
  },
  like(id: string) {
    return request<{ matched: boolean; matchId?: string; conversationId?: string }>(
      `/workers/${id}/like`,
      { method: 'POST' },
    );
  },
  skip(id: string) {
    return request<{ success: boolean }>(`/workers/${id}/skip`, { method: 'POST' });
  },
};

export const businesses = {
  me() {
    return request<{ profile: any }>('/businesses/me');
  },
  updateMe(body: any) {
    return request<{ profile: any }>('/businesses/me', { method: 'PATCH', body });
  },
  view(id: string) {
    return request<any>(`/businesses/${id}`);
  },
  discover(limit = 30) {
    return request<{ items: any[] }>('/businesses/discover', { query: { limit } });
  },
};

export const jobs = {
  list(params?: {
    page?: number;
    limit?: number;
    region?: string;
    role?: string;
    employmentType?: string;
    search?: string;
  }) {
    return requestList<any>('/jobs', { query: params || {} });
  },
  create(body: any) {
    return request<any>('/jobs', { method: 'POST', body });
  },
  update(id: string, body: any) {
    return request<any>(`/jobs/${id}`, { method: 'PATCH', body });
  },
  remove(id: string) {
    return request<{ success: boolean }>(`/jobs/${id}`, { method: 'DELETE' });
  },
  publish(id: string) {
    return request<{ success: boolean }>(`/jobs/${id}/publish`, { method: 'POST' });
  },
  archive(id: string) {
    return request<{ success: boolean }>(`/jobs/${id}/archive`, { method: 'POST' });
  },
  like(id: string) {
    return request<{ matched: boolean; matchId?: string; conversationId?: string }>(
      `/jobs/${id}/like`,
      { method: 'POST' },
    );
  },
  skip(id: string) {
    return request<{ success: boolean }>(`/jobs/${id}/skip`, { method: 'POST' });
  },
};

export const matches = {
  list(params?: { page?: number; limit?: number; status?: string }) {
    return requestList<any>('/matches', { query: params || {} });
  },
  archive(id: string) {
    return request<{ success: boolean }>(`/matches/${id}/archive`, { method: 'POST' });
  },
};

export const conversations = {
  list() {
    return requestList<any>('/conversations');
  },
  messages(id: string) {
    return requestList<any>(`/conversations/${id}/messages`);
  },
  send(id: string, content: string) {
    return request<any>(`/conversations/${id}/messages`, { method: 'POST', body: { content } });
  },
  markRead(id: string) {
    return request<{ success: boolean }>(`/conversations/${id}/read`, { method: 'POST' }).catch(
      () => ({ success: true }),
    );
  },
  archive(id: string) {
    return request<{ success: boolean }>(`/conversations/${id}/archive`, { method: 'POST' });
  },
  block(id: string) {
    return request<{ success: boolean }>(`/conversations/${id}/block`, { method: 'POST' });
  },
};

export const interests = {
  received() {
    return requestList<any>('/interests/received');
  },
  sent() {
    return requestList<any>('/interests/sent');
  },
  likeBack(swiperId: string) {
    return request<{ matched: boolean }>(`/interests/like-back/${swiperId}`, { method: 'POST' });
  },
};

export const notifications = {
  list(limit = 50) {
    return requestList<any>('/notifications', { query: { limit } });
  },
  markRead(id: string) {
    return request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' });
  },
  markAllRead() {
    return request<{ success: boolean }>('/notifications/read-all', { method: 'POST' });
  },
};

export const stats = {
  dashboard() {
    return request<{
      total_matches: number;
      unread_messages: number;
      profile_views: number;
      pending_interests: number;
      active_jobs?: number;
    }>('/stats/dashboard');
  },
};

export const uploads = {
  upload(file: File, category: string) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', category);
    return request<{ url: string; id?: string }>('/uploads', {
      method: 'POST',
      body: fd,
      multipart: true,
    });
  },
};

export const video = {
  createRoom(conversationId: string) {
    return request<{ roomName: string }>('/video/create-room', {
      method: 'POST',
      body: { conversationId },
    });
  },
};
