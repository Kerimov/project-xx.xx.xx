import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { documentsRouter } from './routes/documents.js';
import { packagesRouter } from './routes/packages.js';
import { authRouter } from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { testConnection } from './db/connection.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Тест подключения к БД при старте
testConnection();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/packages', packagesRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Backend API running on http://localhost:${PORT}`);
});
