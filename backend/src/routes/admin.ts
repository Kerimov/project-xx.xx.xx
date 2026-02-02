// Административные роуты для мониторинга и управления

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
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

// Повтор задачи в очереди (сброс в Pending, 0 попыток)
adminRouter.post('/queue/items/:id/retry', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await uhQueueService.retryQueueItem(id);
    res.json({ data: { success: true, message: 'Задача поставлена в очередь повторно' } });
  } catch (error: any) {
    res.status(error.message?.includes('not found') ? 404 : 500).json({ error: { message: error.message } });
  }
});

// Переотправить документ в 1С (новая задача в очереди)
adminRouter.post('/queue/resend', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.body || {};
    if (!documentId) {
      return res.status(400).json({ error: { message: 'Укажите documentId в теле запроса' } });
    }
    const queueId = await uhQueueService.resendDocument(documentId);
    res.json({ data: { success: true, queueId, message: 'Документ добавлен в очередь' } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Ручной запуск синхронизации НСИ (доступен всем авторизованным пользователям). Возвращает результат и ошибки.
adminRouter.post('/nsi/sync', async (req: Request, res: Response) => {
  try {
    const result = await nsiSyncService.manualSync();
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({
      error: {
        message: error.message,
        data: { success: false, synced: 0, total: 0, failed: 0, errors: [{ type: 'System', id: '', message: error.message }] }
      }
    });
  }
});

// Очистка синхронизированных данных НСИ (договоры, счета, склады, контрагенты, организации). Организации, на которые ссылаются документы/пакеты/пользователи, не удаляются. После очистки можно запустить синхронизацию заново.
adminRouter.post('/nsi/clear', async (req: Request, res: Response) => {
  try {
    const result = await nsiSyncService.clearNSIData();
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Добавить склады для организаций, у которых ещё нет складов (если 1С не вернула склады в НСИ).
adminRouter.post('/nsi/seed-warehouses', async (req: Request, res: Response) => {
  try {
    const result = await nsiSyncService.seedWarehouses();
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Удалить только искусственные склады (созданные через seedWarehouses), чтобы освободить место для синхронизации из 1С.
adminRouter.post('/nsi/clear-seeded-warehouses', async (req: Request, res: Response) => {
  try {
    const result = await nsiSyncService.clearSeededWarehouses();
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Получить последние строки логов backend
adminRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const tail = Math.min(Math.max(parseInt(String(req.query.tail || '200'), 10) || 200, 20), 2000);
    const dir = process.env.LOG_DIR || 'logs';
    const logDir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
    const logFilePath = path.join(logDir, 'app.log');

    if (!fs.existsSync(logFilePath)) {
      return res.json({ data: { tail, filePath: logFilePath, lines: [] } });
    }

    const content = fs.readFileSync(logFilePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    const sliced = lines.slice(-tail);

    res.json({ data: { tail, filePath: logFilePath, lines: sliced } });
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
