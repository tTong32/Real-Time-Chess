import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config/environment';
import { errorHandler } from './utils/errors';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import boardRoutes from './routes/boards';
import friendsRoutes from './routes/friends';
import { setupSocket } from './socket';

const app = express();
const httpServer = createServer(app);

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

// Error handler (must be last)
app.use(errorHandler);

// Setup Socket.IO
const io = setupSocket(httpServer);

// Start server
const PORT = config.port;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`CORS Origin: ${config.corsOrigin}`);
  console.log('Socket.IO server initialized');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export { app, httpServer };

