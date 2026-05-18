import type { Context } from 'hono';
import type { Env } from '../types';
import { recordError } from '../lib/error-log';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Decide whether a thrown error should be persisted to `error_logs`.
 * We skip 4xx client errors (validation, auth, not-found, ...) because they
 * are *expected* in normal operation and would otherwise drown out real
 * server-side bugs.
 */
function shouldPersist(err: Error, status: number): boolean {
  if (status >= 500) return true;
  if (err.name === 'ZodError') return false;
  if (err instanceof AppError) {
    // Persist anything that is *not* a normal client-side rejection.
    if (status >= 400 && status < 500) return false;
    return true;
  }
  return true;
}

export function errorHandler(err: Error, c: Context<{ Bindings: Env }>) {
  console.error(`[Error] ${err.name}: ${err.message}`, err.stack);

  let status = 500;
  let code = 'INTERNAL_ERROR';

  if (err instanceof AppError) {
    status = err.status;
    code = err.code;
  } else if (err.name === 'ZodError') {
    status = 400;
    code = 'VALIDATION_ERROR';
  }

  // Best-effort: persist server-side errors. Never await before we respond
  // to the client — fire-and-forget through `c.executionCtx.waitUntil`
  // when available so the worker keeps the connection open until the
  // insert completes.
  if (shouldPersist(err, status)) {
    try {
      const p = recordError(c.env, c, err, {
        level: status >= 500 ? 'error' : 'warn',
        code,
        status,
      });
      const exec: any = (c as any).executionCtx;
      if (exec?.waitUntil) {
        exec.waitUntil(p);
      } else {
        p.catch(() => {});
      }
    } catch {
      // never propagate
    }
  }

  if (err instanceof AppError) {
    return c.json(
      { success: false, error: { code: err.code, message: err.message } },
      err.status as any,
    );
  }

  if (err.name === 'ZodError') {
    const zodErr = err as any;
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: zodErr.issues?.[0]?.message || 'Τα δεδομένα δεν είναι έγκυρα.',
          details: zodErr.issues,
        },
      },
      400,
    );
  }

  const isProduction = c.env.ENVIRONMENT === 'production';
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: isProduction ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' : (err.message || 'Internal error'),
      },
    },
    500,
  );
}
