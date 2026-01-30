// Публичные эндпоинты для проверки подключения к БД 1С:УХ (без авторизации)

import { Router, Request, Response } from 'express';
import { testUHConnectionWithMessage, getUHDbSafeConfig, runUHSampleQuery } from '../db/uh-connection.js';
import { check1CServices } from '../utils/check-1c-url.js';

export const uhDbRouter = Router();

/** Безопасные параметры подключения (без паролей) */
uhDbRouter.get('/config', (_req: Request, res: Response) => {
  try {
    const config = getUHDbSafeConfig();
    console.log('[UH DB Config] UH_DB_TYPE:', process.env.UH_DB_TYPE);
    console.log('[UH DB Config] UH_MSSQL_SERVER:', process.env.UH_MSSQL_SERVER);
    console.log('[UH DB Config] UH_MSSQL_DATABASE:', process.env.UH_MSSQL_DATABASE);
    console.log('[UH DB Config] Result:', config);
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

/** Проверка доступности HTTP-сервисов 1С. GET: baseUrl в query; POST: body { baseUrl, username?, password? } — логин/пароль как сессия 1С (Basic Auth). */
uhDbRouter.get('/services-check', async (req: Request, res: Response) => {
  try {
    const baseUrl = (req.query.baseUrl as string)?.trim();
    if (!baseUrl) {
      return res.status(400).json({ error: { message: 'Укажите baseUrl, например: ?baseUrl=https://localhost:8035/kk_test' } });
    }
    const results = await check1CServices(baseUrl);
    res.json({ data: results });
  } catch (error: any) {
    res.status(500).json({ error: { message: error?.message || 'Services check failed' } });
  }
});

uhDbRouter.post('/services-check', async (req: Request, res: Response) => {
  try {
    const { baseUrl, username, password } = req.body || {};
    const url = (typeof baseUrl === 'string' ? baseUrl : '').trim();
    if (!url) {
      return res.status(400).json({ error: { message: 'Укажите baseUrl в теле запроса' } });
    }
    const auth = (username != null && String(username).trim()) || (password != null && String(password) !== '')
      ? { username: String(username ?? '').trim(), password: String(password ?? '') }
      : undefined;
    const results = await check1CServices(url, auth);
    res.json({ data: results });
  } catch (error: any) {
    res.status(500).json({ error: { message: error?.message || 'Services check failed' } });
  }
});
