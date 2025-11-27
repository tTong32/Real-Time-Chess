import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from '../../config/environment';
import { comprehensiveErrorHandler } from '../../utils/errorHandler';
import authRoutes from '../../routes/auth';
import userRoutes from '../../routes/users';
import boardRoutes from '../../routes/boards';
import friendsRoutes from '../../routes/friends';
import { setupSocket } from '../../socket';

/**
 * Creates a test Express app with all routes and middleware
 * This can be used in integration tests
 */
export function createTestApp() {
  const app = express();
  
  // Middleware
  app.use(cors({
    origin: config.corsOrigin || '*',
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
  
  // Error handler (must be last)
  app.use(comprehensiveErrorHandler);
  
  return app;
}

/**
 * Creates a test HTTP server with Socket.IO
 */
export function createTestServer() {
  const app = createTestApp();
  const httpServer = createServer(app);
  const io = setupSocket(httpServer);
  
  return { app, server: httpServer, io };
}

