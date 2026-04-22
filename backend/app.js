import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';

// Routes
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import girlRoutes from './routes/girls.js';
import adminRoutes from './routes/admin.js';

export const createApp = () => {
  const app = express();

  // Security middleware
  app.use(cors({ 
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true 
  }));
  
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/girls', girlRoutes);
  app.use('/api/admin', adminRoutes);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({ 
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
    });
  });

  return app;
};
