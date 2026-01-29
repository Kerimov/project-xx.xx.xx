import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { documentsRouter } from './routes/documents.js';
import { packagesRouter } from './routes/packages.js';
import { authRouter } from './routes/auth.js';
import { filesRouter } from './routes/files.js';
import { nsiRouter } from './routes/nsi.js';
import { adminRouter } from './routes/admin.js';
import { errorHandler } from './middleware/errorHandler.js';
import { testConnection } from './db/connection.js';
import { waitForDb } from './db/waitForDb.js';
import { runMigrations } from './db/migrate.js';
import { uhQueueService } from './services/uh-queue.js';
import { nsiSyncService } from './services/nsi-sync.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Инициализация БД при старте (ожидаем, применяем миграции)
(async () => {
  try {
    await waitForDb({ retries: 60, delayMs: 1000 });
    await testConnection();
    await runMigrations();
    logger.info('Migrations applied');
    
    // Запускаем обработчик очереди УХ
    const queueInterval = parseInt(process.env.UH_QUEUE_INTERVAL || '5000');
    uhQueueService.startProcessing(queueInterval);
    logger.info('UH queue processor started');
    
    // Запускаем синхронизацию НСИ
    const nsiSyncInterval = parseInt(process.env.UH_SYNC_INTERVAL || '60000');
    nsiSyncService.startSync(nsiSyncInterval);
    logger.info('NSI sync service started');
  } catch (e: any) {
    logger.error('Failed to initialize database', e);
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
app.use('/api/admin', adminRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('Backend API started', { port: PORT, env: process.env.NODE_ENV || 'development' });
});
