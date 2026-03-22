import { createMiddleware } from 'hono/factory';
import type { z } from 'zod';
import type { Env } from '../types';

export const validateBody = <T extends z.ZodSchema>(schema: T) =>
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    try {
      const body = await c.req.json();
      const parsed = schema.parse(body);
      c.set('validatedBody' as any, parsed);
      await next();
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return c.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: err.issues?.[0]?.message || 'Τα δεδομένα δεν είναι έγκυρα.',
              details: err.issues,
            },
          },
          400,
        );
      }
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Μη έγκυρο σώμα αιτήματος.' } },
        400,
      );
    }
  });

export const validateQuery = <T extends z.ZodSchema>(schema: T) =>
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    try {
      const query = c.req.query();
      const parsed = schema.parse(query);
      c.set('validatedQuery' as any, parsed);
      await next();
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return c.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: err.issues?.[0]?.message || 'Μη έγκυρες παράμετροι.' } },
          400,
        );
      }
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Μη έγκυρες παράμετροι.' } },
        400,
      );
    }
  });
