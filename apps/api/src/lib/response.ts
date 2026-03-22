import type { Context } from 'hono';

export function success<T>(c: Context, data: T, status: 200 | 201 = 200) {
  return c.json({ success: true, data }, status);
}

export function paginated<T>(
  c: Context,
  data: T[],
  meta: { page: number; perPage: number; total: number },
) {
  return c.json({
    success: true,
    data,
    meta: {
      page: meta.page,
      perPage: meta.perPage,
      total: meta.total,
      totalPages: Math.ceil(meta.total / meta.perPage),
    },
  });
}

export function error(
  c: Context,
  code: string,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 429 | 500 = 400,
) {
  return c.json({ success: false, error: { code, message } }, status as any);
}
