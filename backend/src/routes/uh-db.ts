// Публичные эндпоинты для проверки подключения к БД 1С:УХ (без авторизации)

import { Router, Request, Response } from 'express';
import { testUHConnectionWithMessage, getUHDbSafeConfig, runUHSampleQuery } from '../db/uh-connection.js';

export const uhDbRouter = Router();

/** Безопасные параметры подключения (без паролей) */
uhDbRouter.get('/config', (_req: Request, res: Response) => {
  try {
    const config = getUHDbSafeConfig();
    if (!config) {
      return res.json({ data: null, message: 'Подключение к БД УХ не настроено (UH_DB_TYPE / UH_MSSQL_* / UH_DB_*)' });
    }
    res.json({ data: config });
  } catch (error: any) {
    res.status(500).json({ error: { message: error?.message || 'Failed to get config' } });
  }
});

/** Проверка доступности БД УХ */
uhDbRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    const result = await testUHConnectionWithMessage();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message || 'Connection check failed' });
  }
});

/** Пример данных из одной таблицы (sys.tables / pg_tables) — для проверки доступа к данным */
uhDbRouter.get('/sample', async (_req: Request, res: Response) => {
  try {
    const { rows, columns, source } = await runUHSampleQuery();
    res.json({ data: { rows, columns, source } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error?.message || 'Sample query failed' } });
  }
});
