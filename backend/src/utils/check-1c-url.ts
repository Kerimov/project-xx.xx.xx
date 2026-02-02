/**
 * Проверка доступности URL (в т.ч. HTTPS с самоподписанным сертификатом).
 * Используется для проверки сервисов 1С по baseUrl.
 */

import https from 'https';
import http from 'http';

export interface UrlCheckResult {
  url: string;
  statusCode?: number;
  ok: boolean;
  error?: string;
  /** Подсказка при 401: задать UH_1C_USER / UH_1C_PASSWORD в backend/.env */
  hint?: string;
}

/** Собирает URL: baseUrl + path, сохраняя путь публикации (например /kk_test). */
function parseUrl(baseUrl: string, path: string): URL {
  const base = baseUrl.replace(/\/$/, '');
  const baseParsed = new URL(base + '/');
  const pathNorm = path.startsWith('/') ? path.slice(1) : path;
  const basePath = baseParsed.pathname.replace(/\/$/, '') || '';
  const combinedPath = basePath + '/' + pathNorm.replace(/^\//, '');
  return new URL(baseParsed.origin + combinedPath.replace(/\/+/g, '/'));
}

/** Basic Auth: логин/пароль 1С для проверки HTTP-сервисов (опционально). */
export function checkUrl(
  url: string,
  rejectUnauthorized = false,
  auth?: { username: string; password: string }
): Promise<UrlCheckResult> {
  return new Promise((resolve) => {
    const u = new URL(url);
    const isHttps = u.protocol === 'https:';
    const headers: Record<string, string> = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    if (auth?.username && auth?.password) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${auth.username}:${auth.password}`, 'utf8').toString('base64');
    }
    const options: any = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + u.search,
      method: 'GET',
      timeout: 8000,
      headers
    };
    if (isHttps && !rejectUnauthorized) {
      options.rejectUnauthorized = false;
    }
    const request = isHttps ? https.request : http.request;
    const req = request(options, (res: any) => {
      const hint = res.statusCode === 401
        ? (!auth
          ? 'Требуется аутентификация. Задайте UH_1C_USER и UH_1C_PASSWORD в backend/.env'
          : 'Проверьте логин и пароль (UH_1C_USER, UH_1C_PASSWORD)')
        : undefined;
      // 405 Method Not Allowed означает, что эндпоинт существует, но метод не подходит (например, POST вместо GET)
      // 400 Bad Request может означать, что эндпоинт есть, но параметры неверны (например, неверный ref)
      // Оба случая лучше чем 404 (эндпоинт не найден)
      const isOk = res.statusCode >= 200 && res.statusCode < 400 || res.statusCode === 405 || res.statusCode === 400;
      resolve({
        url,
        statusCode: res.statusCode,
        ok: isOk,
        hint
      });
    });
    req.on('error', (err: any) => {
      resolve({ url, ok: false, error: err?.message || String(err) });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, ok: false, error: 'Timeout' });
    });
    req.setTimeout(8000);
    req.end();
  });
}

/** authOverride — из формы (логин/пароль на странице); иначе UH_1C_USER, UH_1C_PASSWORD из .env */
export async function check1CServices(
  baseUrl: string,
  authOverride?: { username?: string; password?: string }
): Promise<UrlCheckResult[]> {
  const base = baseUrl.replace(/\/$/, '');
  const username = authOverride?.username?.trim() || process.env.UH_1C_USER?.trim();
  const password = authOverride?.password ?? process.env.UH_1C_PASSWORD ?? '';
  const auth = username ? { username, password } : undefined;
  const paths = [
    { path: '/', label: 'Корень публикации' },
    { path: '/odata/standard.odata/', label: 'OData' },
    { path: '/hs/', label: 'HTTP-сервисы (корень)' },
    { path: '/hs/ecof/health', label: 'ПорталЕЦОФ /health (GET)' },
    { path: '/hs/ecof/nsi/delta', label: 'ПорталЕЦОФ /nsi/delta (GET)' },
    { path: '/hs/ecof/nsi/warehouses', label: 'ПорталЕЦОФ /nsi/warehouses (GET)' },
    { path: '/hs/ecof/documents', label: 'ПорталЕЦОФ /documents (POST, проверим доступность)' },
    { path: '/hs/ecof/documents/test/status', label: 'ПорталЕЦОФ /documents/{ref}/status (GET, тестовый ref)' }
  ];
  const results: UrlCheckResult[] = [];
  for (const { path } of paths) {
    const fullUrl = parseUrl(base, path).href;
    const result = await checkUrl(fullUrl, false, auth);
    results.push(result);
  }
  return results;
}
