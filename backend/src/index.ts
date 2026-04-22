import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import showingRoutes from './routes/showings.js';
import offerRoutes from './routes/offers.js';
import documentRoutes from './routes/documents.js';
import transactionRoutes from './routes/transactions.js';
import paymentRoutes from './routes/payments.js';
import agentRoutes from './routes/ai.js';
import scrapedListingsRoutes from './routes/scraped-listings.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ── Global Middleware ──────────────────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',')
      : ['http://localhost:5173', 'http://localhost:8081', 'exp://localhost:8081'],
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ───────────────────────────────────────────────────────────

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'CribAgents API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── Route Mounting ─────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/showings', showingRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/scraped-listings', scrapedListingsRoutes);

// ── 404 Handler ────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ───────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);

  const statusCode = (err as any).statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ── Start Server ───────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CribAgents API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;
