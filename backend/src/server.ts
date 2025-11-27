import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import * as Sentry from '@sentry/node';
import { config } from './config/environment';
import { errorHandler } from './utils/errors';
import { comprehensiveErrorHandler } from './utils/errorHandler';
import { initSentry } from './utils/sentry';
import logger from './utils/logger';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import boardRoutes from './routes/boards';
import friendsRoutes from './routes/friends';
import { setupSocket } from './socket';

// Initialize Sentry before anything else
initSentry();

// Log startup
logger.info('Starting Real-Time Chess backend server', {
  environment: config.nodeEnv,
  port: config.port,
});

const app = express();
const httpServer = createServer(app);

// Sentry request handler must be the first middleware
app.use(Sentry.Handlers.requestHandler());
// Tracing handler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/friends', friendsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Sentry error handler must be before other error handlers
app.use(Sentry.Handlers.errorHandler());

// Error handler (must be last)
// Use comprehensive error handler for better error handling, logging, and user-friendly messages
app.use(comprehensiveErrorHandler);

// Setup Socket.IO
const io = setupSocket(httpServer);

// Start server
const PORT = config.port;

httpServer.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: config.nodeEnv,
    corsOrigin: config.corsOrigin,
  });
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`CORS Origin: ${config.corsOrigin}`);
  console.log('Socket.IO server initialized');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  console.log('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export { app, httpServer };

