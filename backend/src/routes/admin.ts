// Административные роуты для мониторинга и управления

import { Router, Request, Response } from 'express';
import { uhQueueService } from '../services/uh-queue.js';
import { nsiSyncService } from '../services/nsi-sync.js';
// TODO: добавить middleware для проверки прав администратора

export const adminRouter = Router();

// Статистика очереди УХ
adminRouter.get('/queue/stats', async (req: Request, res: Response) => {
  try {
    const stats = await uhQueueService.getStats();
    res.json({ data: stats });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Ручной запуск синхронизации НСИ
adminRouter.post('/nsi/sync', async (req: Request, res: Response) => {
  try {
    await nsiSyncService.manualSync();
    res.json({ data: { success: true, message: 'NSI sync started' } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});
