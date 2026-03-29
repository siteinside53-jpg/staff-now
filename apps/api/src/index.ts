import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { Env } from './types';
import authRoutes from './routes/auth';
import workerRoutes from './routes/workers';
import businessRoutes from './routes/businesses';
import jobRoutes from './routes/jobs';
import matchRoutes from './routes/matches';
import conversationRoutes from './routes/conversations';
import notificationRoutes from './routes/notifications';
import billingRoutes from './routes/billing';
import uploadRoutes from './routes/uploads';
import adminRoutes from './routes/admin';
import branchRoutes from './routes/branches';
import { errorHandler } from './middleware/error-handler';
import { rateLimiter } from './middleware/rate-limiter';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', async (c, next) => {
  const origin = c.env.CORS_ORIGIN;
  return cors({
    origin: origin.includes(',') ? origin.split(',') : origin,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })(c, next);
});
app.use('*', rateLimiter());
app.onError(errorHandler);

// Health check
app.get('/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString(), environment: c.env.ENVIRONMENT }),
);

// Routes
app.route('/auth', authRoutes);
app.route('/workers', workerRoutes);
app.route('/businesses', businessRoutes);
app.route('/jobs', jobRoutes);
app.route('/matches', matchRoutes);
app.route('/conversations', conversationRoutes);
app.route('/notifications', notificationRoutes);
app.route('/billing', billingRoutes);
app.route('/uploads', uploadRoutes);
app.route('/admin', adminRoutes);
app.route('/branches', branchRoutes);

// 404 handler
app.notFound((c) =>
  c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } }, 404),
);

export default app;
