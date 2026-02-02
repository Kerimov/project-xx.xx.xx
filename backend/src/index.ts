import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { documentsRouter } from './routes/documents.js';
import { packagesRouter } from './routes/packages.js';
import { authRouter } from './routes/auth.js';
import { filesRouter } from './routes/files.js';
import { nsiRouter } from './routes/nsi.js';
import { adminRouter } from './routes/admin.js';
import { uhDbRouter } from './routes/uh-db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { testConnection } from './db/connection.js';
import { waitForDb } from './db/waitForDb.js';
import { runMigrations } from './db/migrate.js';
import { uhQueueService } from './services/uh-queue.js';
import { nsiSyncService } from './services/nsi-sync.js';
import { logger } from './utils/logger.js';

dotenv.config();

// Чтобы сервер не падал при необработанном rejection (например, ошибка подключения к УХ)
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

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
    if (!process.env.UH_API_USER || !process.env.UH_API_PASSWORD) {
      logger.warn('UH_API_USER или UH_API_PASSWORD не заданы — при передаче документов в 1С возможна ошибка 401. Задайте их в backend/.env и перезапустите backend.');
    } else {
      logger.info('UH API credentials loaded (user: ' + (process.env.UH_API_USER || '').slice(0, 3) + '…)');
    }
    
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
app.use('/api/uh/db', uhDbRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('Backend API started', { port: PORT, env: process.env.NODE_ENV || 'development' });
});
