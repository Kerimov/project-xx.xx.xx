// Публичные эндпоинты для проверки подключения к БД 1С:УХ (без авторизации)

import { Router, Request, Response } from 'express';
import https from 'https';
import http from 'http';
import { testUHConnectionWithMessage, getUHDbSafeConfig, runUHSampleQuery } from '../db/uh-connection.js';
import { check1CServices } from '../utils/check-1c-url.js';
import { uhIntegrationService } from '../services/uh-integration.js';
import { logger } from '../utils/logger.js';

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

/**
 * Диагностика авторизации 1С (Basic Auth).
 * Проверяет доступ к endpoint с учётными данными (по умолчанию /health).
 * POST body: { baseUrl?, endpoint?, method?, username?, password?, payload? }
 */
uhDbRouter.post('/auth-debug', async (req: Request, res: Response) => {
  try {
    const baseUrl = (req.body?.baseUrl || process.env.UH_API_URL || '').trim();
    if (!baseUrl) {
      return res.status(400).json({ error: { message: 'Укажите baseUrl (например https://127.0.0.1:8035/kk_test/hs/ecof)' } });
    }
    const endpoint = (req.body?.endpoint || '/health').toString().trim();
    const method = (req.body?.method || 'GET').toString().toUpperCase();
    const username = (req.body?.username ?? process.env.UH_API_USER ?? '').toString();
    const password = (req.body?.password ?? process.env.UH_API_PASSWORD ?? '').toString();
    const payload = req.body?.payload;

    let u: URL;
    try {
      u = new URL(baseUrl.replace(/\/$/, '') + endpoint);
    } catch (e: any) {
      return res.status(400).json({ error: { message: `Некорректный baseUrl/endpoint: ${e?.message || e}` } });
    }
    const isHttps = u.protocol === 'https:';
    const authHeader = username && password
      ? `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`
      : '';

    const body = payload ? JSON.stringify(payload) : undefined;
    const headers: Record<string, string> = {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(authHeader ? { Authorization: authHeader } : {})
    };
    if (body) headers['Content-Length'] = String(Buffer.byteLength(body, 'utf8'));

    const requestOptions: https.RequestOptions = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + u.search,
      method,
      headers,
      timeout: 15000,
      ...(isHttps && (process.env.UH_API_INSECURE || '').toLowerCase() === 'true'
        ? { rejectUnauthorized: false }
        : {})
    };

    const result = await new Promise<{ statusCode: number; body: string; headers: Record<string, unknown> }>((resolve, reject) => {
      const req = (isHttps ? https : http).request(requestOptions, (resp) => {
        const chunks: Buffer[] = [];
        resp.on('data', (chunk: Buffer) => chunks.push(chunk));
        resp.on('end', () => resolve({
          statusCode: resp.statusCode || 0,
          body: Buffer.concat(chunks).toString('utf8'),
          headers: resp.headers as Record<string, unknown>
        }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.setTimeout(15000);
      if (body) req.write(body, 'utf8');
      req.end();
    });

    const maskedUser = username ? `${username.slice(0, 3)}…` : '';
    res.json({
      data: {
        url: u.toString(),
        method,
        statusCode: result.statusCode,
        wwwAuthenticate: result.headers['www-authenticate'] || null,
        responseBody: result.body?.length > 1500 ? result.body.slice(0, 1500) + '…' : result.body,
        authUsed: { username: maskedUser, passwordSet: Boolean(password) },
        insecureTls: (process.env.UH_API_INSECURE || '').toLowerCase() === 'true'
      }
    });
  } catch (error: any) {
    const message = error?.message || 'Auth debug failed';
    logger.error('Auth debug failed', error, { message, stack: error?.stack } as any);
    const status = message.toLowerCase().includes('timeout') ? 504 : 500;
    res.status(status).json({
      error: {
        message
      }
    });
  }
});

/** Текущие параметры авторизации 1С (без пароля) */
uhDbRouter.get('/auth-info', (_req: Request, res: Response) => {
  try {
    res.json({ data: uhIntegrationService.getAuthInfo() });
  } catch (error: any) {
    res.status(500).json({ error: { message: error?.message || 'Auth info failed' } });
  }
});

/** Последний ответ от 1С (для диагностики) */
uhDbRouter.get('/uh-last-response', (_req: Request, res: Response) => {
  try {
    res.json({ data: uhIntegrationService.getLastResponse() });
  } catch (error: any) {
    res.status(500).json({ error: { message: error?.message || 'Last response failed' } });
  }
});

/** Переопределить логин/пароль 1С в рантайме (без перезапуска backend) */
uhDbRouter.post('/auth-override', (req: Request, res: Response) => {
  try {
    const username = (req.body?.username ?? '').toString().trim();
    const password = (req.body?.password ?? '').toString();
    if (!username || !password) {
      return res.status(400).json({ error: { message: 'Укажите username и password' } });
    }
    uhIntegrationService.setCredentials(username, password);
    res.json({ data: { ok: true, auth: uhIntegrationService.getAuthInfo() } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error?.message || 'Auth override failed' } });
  }
});
