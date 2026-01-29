import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { documentsRouter } from './routes/documents.js';
import { packagesRouter } from './routes/packages.js';
import { authRouter } from './routes/auth.js';
import { filesRouter } from './routes/files.js';
import { nsiRouter } from './routes/nsi.js';
import { errorHandler } from './middleware/errorHandler.js';
import { testConnection } from './db/connection.js';
import { waitForDb } from './db/waitForDb.js';
import { runMigrations } from './db/migrate.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Инициализация БД при старте (ожидаем, применяем миграции)
(async () => {
  try {
    await waitForDb({ retries: 60, delayMs: 1000 });
    await testConnection();
    await runMigrations();
    console.log('✅ Migrations applied');
  } catch (e) {
    console.error('❌ Failed to initialize database:', e);
  }
})();

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
app.use('/api', filesRouter);
app.use('/api/nsi', nsiRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Backend API running on http://localhost:${PORT}`);
});
