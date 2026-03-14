import express from 'express';
import cors from 'cors';
import pino from 'pino-http';
import './adapters/index.js';
import './adapters/inspiration/index.js';
import { env } from './config/env.js';
import { authRoutes } from './routes/auth.js';
import { accountRoutes } from './routes/accounts.js';
import { postRoutes } from './routes/posts.js';
import { settingsRoutes } from './routes/settings.js';
import { mediaRoutes } from './routes/media.js';
import { inspirationRoutes } from './routes/inspiration.js';

export const app = express();

// Middleware
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(pino({ level: env.LOG_LEVEL }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/inspiration', inspirationRoutes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
