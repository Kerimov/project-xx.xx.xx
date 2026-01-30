// Административные роуты для мониторинга и управления

import { Router, Request, Response } from 'express';
import { uhQueueService } from '../services/uh-queue.js';
import { nsiSyncService } from '../services/nsi-sync.js';
import { testUHConnection } from '../db/uh-connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

export const adminRouter = Router();

// Все роуты требуют аутентификации
adminRouter.use(authenticateToken);

// Статистика очереди УХ (доступна всем авторизованным пользователям)
adminRouter.get('/queue/stats', async (req: Request, res: Response) => {
  try {
    const stats = await uhQueueService.getStats();
    res.json({ data: stats });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Список задач очереди УХ (доступен всем авторизованным пользователям)
adminRouter.get('/queue/items', async (req: Request, res: Response) => {
  try {
    const { pool } = await import('../db/connection.js');
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string | undefined;
    
    let query = `
      SELECT 
        q.id,
        q.document_id,
        q.operation_type,
        q.status,
        q.retry_count as attempts,
        q.error_message as last_error,
        q.created_at,
        q.processed_at,
        q.completed_at,
        d.number as document_number,
        d.type as document_type
      FROM uh_integration_queue q
      LEFT JOIN documents d ON q.document_id = d.id
    `;
    const params: any[] = [];
    
    if (status) {
      query += ` WHERE q.status = $1`;
      params.push(status);
    }
    
    query += ` ORDER BY q.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    
    res.json({
      data: result.rows.map(row => ({
        id: row.id,
        documentId: row.document_id,
        documentNumber: row.document_number,
        documentType: row.document_type,
        operationType: row.operation_type,
        status: row.status,
        attempts: row.attempts,
        lastError: row.last_error,
        createdAt: row.created_at,
        processedAt: row.processed_at,
        completedAt: row.completed_at
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Ручной запуск синхронизации НСИ (доступен всем авторизованным пользователям)
adminRouter.post('/nsi/sync', async (req: Request, res: Response) => {
  try {
    await nsiSyncService.manualSync();
    res.json({ data: { success: true, message: 'NSI sync started' } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Проверка прямого подключения к БД 1С:УХ (если настроено, требует прав администратора)
adminRouter.get('/uh/db/health', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const ok = await testUHConnection();
    res.status(ok ? 200 : 503).json({ data: { ok } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});
