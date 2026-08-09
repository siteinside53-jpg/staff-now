import type { Context } from 'hono';

export function success<T>(c: Context, data: T, status: 200 | 201 = 200) {
  return c.json({ success: true, data }, status);
}

export function paginated<T>(
  c: Context,
  data: T[],
  meta: { page: number; perPage: number; total: number } | number,
  page?: number,
  perPage?: number,
) {
  // Backward-compat: many call sites use the legacy positional form
  // paginated(c, data, total, page, perPage) instead of passing a meta object.
  // Detect it: when `meta` is a number it is actually the total count.
  let m: { page: number; perPage: number; total: number };
  if (typeof meta === 'number') {
    m = { total: meta, page: page ?? 1, perPage: perPage ?? 20 };
  } else {
    m = meta;
  }
  return c.json({
    success: true,
    data,
    meta: {
      page: m.page,
      perPage: m.perPage,
      total: m.total,
      totalPages: m.perPage > 0 ? Math.ceil(m.total / m.perPage) : 0,
    },
  });
}

// 402 (χρειάζεται συνδρομή) και 502 (ο πάροχος email/SMS δεν απάντησε)
// χρησιμοποιούνται ήδη σε πολλά σημεία — μπαίνουν κι αυτά στον τύπο.
// 503: «προσπάθησε ξανά σε λίγο» — το χρησιμοποιεί η διπλή επαλήθευση όταν το
// KV δεν απαντάει. Εκεί είναι κρίσιμο να ΜΗΝ προχωρήσει η σύνδεση σιωπηλά.
type ErrorStatus = 400 | 401 | 402 | 403 | 404 | 409 | 410 | 429 | 500 | 502 | 503;

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  402: 'PAYMENT_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  410: 'GONE',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  502: 'UPSTREAM_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

export function error(
  c: Context,
  code: string,
  message: string | number,
  status: ErrorStatus = 400,
) {
  // Backward-compat: a large number of call sites use the legacy 3-arg form
  // error(c, message, status) instead of error(c, code, message, status).
  // Detect it: when `message` is a number it is actually the HTTP status, and
  // `code` holds the human-readable message. Derive a machine code from status.
  if (typeof message === 'number') {
    status = message as ErrorStatus;
    message = code;
    code = STATUS_CODES[status] ?? 'ERROR';
  }
  return c.json({ success: false, error: { code, message } }, status as any);
}
