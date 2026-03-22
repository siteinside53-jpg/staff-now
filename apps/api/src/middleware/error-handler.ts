import type { Context } from 'hono';
import type { Env } from '../types';

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

export function errorHandler(err: Error, c: Context<{ Bindings: Env }>) {
  console.error(`[Error] ${err.name}: ${err.message}`, err.stack);

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
        message: isProduction ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' : err.message,
      },
    },
    500,
  );
}
