// Сервис для интеграции с 1С УХ через HTTP API

import https from 'https';
import http from 'http';
import {
  UHOperationRequest,
  UHOperationResponse,
  NSIDeltaRequest,
  NSIDeltaResponse
} from '../types/uh-integration.js';
import { logger } from '../utils/logger.js';

export class UHIntegrationService {
  private baseUrl: string;
  private username: string;
  private password: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;
  private insecureTls: boolean;
  private debug: boolean;
  private lastResponse: { url: string; method: string; statusCode: number; headers: Record<string, unknown>; bodyPreview: string; bodyLength: number; at: string } | null = null;

  constructor(config?: {
    baseUrl?: string;
    username?: string;
    password?: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    insecureTls?: boolean;
  }) {
    // UH_API_URL должен быть базовым URL без /api (например: https://127.0.0.1:8035/kk_test/hs/ecof)
    let envUrl = process.env.UH_API_URL || 'https://127.0.0.1:8035/kk_test/hs/ecof';
    envUrl = envUrl.replace(/\/api$/, ''); // Убираем /api если есть
    // localhost в Node часто резолвится в IPv6 (::1); если 1С слушает только 127.0.0.1 — будет ECONNREFUSED. Подставляем 127.0.0.1.
    if (envUrl.includes('localhost')) {
      envUrl = envUrl.replace(/localhost/g, '127.0.0.1');
    }
    this.baseUrl = config?.baseUrl || envUrl;
    this.username = config?.username ?? process.env.UH_API_USER ?? '';
    this.password = config?.password ?? process.env.UH_API_PASSWORD ?? '';
    if (!this.username || !this.password) {
      console.warn(
        '⚠️ UH API: UH_API_USER или UH_API_PASSWORD не заданы в .env. Запросы к 1С будут без Basic Auth — возможна ошибка 401. Задайте переменные в backend/.env и перезапустите backend.'
      );
    }
    this.timeout = config?.timeout || parseInt(process.env.UH_API_TIMEOUT || '30000');
    this.retryAttempts = config?.retryAttempts || parseInt(process.env.UH_RETRY_ATTEMPTS || '3');
    this.retryDelay = config?.retryDelay || parseInt(process.env.UH_RETRY_DELAY || '5000');
    this.insecureTls =
      config?.insecureTls ?? (process.env.UH_API_INSECURE || '').toLowerCase() === 'true';
    this.debug = (process.env.UH_API_DEBUG || '').toLowerCase() === 'true';
  }

  /** Обновить учётные данные в рантайме (без перезапуска backend) */
  setCredentials(username: string, password: string) {
    this.username = username || '';
    this.password = password || '';
  }

  /** Получить текущие параметры авторизации (без пароля) */
  getAuthInfo() {
    return {
      baseUrl: this.baseUrl,
      username: this.username ? `${this.username.slice(0, 3)}…` : '',
      passwordSet: Boolean(this.password),
      insecureTls: this.insecureTls
    };
  }

  /** Последний ответ 1С (для диагностики) */
  getLastResponse() {
    return this.lastResponse;
  }

  /**
   * Выполняет HTTP запрос через https/http с поддержкой rejectUnauthorized: false для самоподписанных сертификатов
   */
  private async requestWithRetry<T>(
    url: string,
    options: RequestInit,
    attempt = 1
  ): Promise<T> {
    try {
      const u = new URL(url);
      const isHttps = u.protocol === 'https:';
      const body = options.body as string | undefined;

      const authHeader = this.username && this.password
        ? `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`
        : '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
        ...(options.headers as Record<string, string>)
      };
      if (body) headers['Content-Length'] = String(Buffer.byteLength(body, 'utf8'));

      const requestOptions: https.RequestOptions = {
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        method: options.method || 'GET',
        headers: {
          ...headers,
          'Connection': 'close' // Отключаем keep-alive
        },
        timeout: this.timeout,
        agent: false, // Не использовать глобальный агент (отключает keep-alive)
        ...(isHttps && this.insecureTls && { rejectUnauthorized: false })
      };

      const result = await new Promise<{ statusCode: number; body: string; headers: Record<string, unknown> }>((resolve, reject) => {
        let resolved = false;
        const safeResolve = (val: { statusCode: number; body: string; headers: Record<string, unknown> }) => {
          if (!resolved) { resolved = true; resolve(val); }
        };
        const safeReject = (err: Error) => {
          if (!resolved) { resolved = true; reject(err); }
        };

        const req = (isHttps ? https : http).request(requestOptions, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => safeResolve({
            statusCode: res.statusCode!,
            body: Buffer.concat(chunks).toString('utf8'),
            headers: res.headers as Record<string, unknown>
          }));
          res.on('error', safeReject);
          // Таймаут на чтение ответа
          res.setTimeout(this.timeout, () => {
            res.destroy();
            safeReject(new Error('Response timeout'));
          });
        });
        
        req.on('error', safeReject);
        req.on('timeout', () => { 
          req.destroy(); 
          safeReject(new Error('Request timeout')); 
        });
        
        // Устанавливаем таймаут на запрос
        req.setTimeout(this.timeout);
        
        // Принудительный таймаут через setTimeout (на случай если другие не сработают)
        const forceTimeout = setTimeout(() => {
          req.destroy();
          safeReject(new Error('Force timeout'));
        }, this.timeout + 5000); // +5 секунд для надёжности
        
        // Очищаем таймаут при завершении
        req.on('close', () => clearTimeout(forceTimeout));
        
        if (body) req.write(body, 'utf8');
        req.end();
      });

      // Всегда сохраняем последний ответ для диагностики (не только при debug)
      const bodyPreview = (result.body || '').slice(0, 1000);
      const info = {
        url,
        method: options.method || 'GET',
        statusCode: result.statusCode,
        headers: result.headers,
        bodyLength: (result.body || '').length,
        bodyPreview,
        at: new Date().toISOString()
      };
      this.lastResponse = info;
      
      if (this.debug) {
        logger.info('UH API response', info);
      }

      if (result.statusCode < 200 || result.statusCode >= 400) {
        throw new Error(`UH API error ${result.statusCode}: ${result.body}`);
      }

      const trimmed = (result.body || '').trim();
      if (!trimmed) {
        // Пустой ответ при 200 — ошибка протокола обмена
        throw new Error('UH API empty response');
      }
      try {
        return JSON.parse(trimmed) as T;
      } catch (parseError: any) {
        throw new Error(`UH API invalid JSON: ${trimmed}`);
      }
    } catch (error: any) {
      // Сохраняем информацию об ошибке как последний ответ
      const errorMessage = error?.message || String(error);
      const errorDetails = this.formatError(error);
      const fullErrorMsg = errorMessage !== errorDetails ? `${errorMessage} | ${errorDetails}` : errorMessage;
      
      // Сохраняем ошибку как lastResponse для диагностики
      const errorInfo = {
        url,
        method: options.method || 'GET',
        statusCode: 0,
        headers: {},
        bodyLength: 0,
        bodyPreview: fullErrorMsg.slice(0, 1000),
        at: new Date().toISOString(),
        error: true
      };
      this.lastResponse = errorInfo;
      
      if (attempt < this.retryAttempts && this.shouldRetry(error)) {
        console.warn(`⚠️ UH API request failed (attempt ${attempt}/${this.retryAttempts}), retrying...`);
        console.warn(`   URL: ${url}`);
        console.warn(`   Error: ${fullErrorMsg}`);
        await this.sleep(this.retryDelay * attempt); // Exponential backoff
        return this.requestWithRetry<T>(url, options, attempt + 1);
      }
      
      // При финальной ошибке обновляем lastResponse (уже сохранён выше) и выводим полную информацию
      
      console.error(`❌ UH API request failed (final attempt ${attempt}/${this.retryAttempts})`);
      console.error(`   URL: ${url}`);
      console.error(`   Method: ${options.method || 'GET'}`);
      console.error(`   Full error: ${fullErrorMsg}`);
      throw error;
    }
  }

  private shouldRetry(error: any): boolean {
    // Retry при сетевых ошибках и временных ошибках сервера
    const code = error?.cause?.code || error?.code;
    return (
      error.name === 'AbortError' ||
      error.message?.includes('fetch failed') ||
      error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('ETIMEDOUT') ||
      error.message?.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND' ||
      code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
      error.message?.includes('500') ||
      error.message?.includes('502') ||
      error.message?.includes('503')
    );
  }

  private formatError(error: any): string {
    const parts: string[] = [];
    const message = error?.message || String(error);
    if (message) parts.push(message);
    const code = error?.cause?.code || error?.code;
    if (code) parts.push(`code=${code}`);
    const errno = error?.cause?.errno || error?.errno;
    if (errno) parts.push(`errno=${errno}`);
    const address = error?.cause?.address || error?.address;
    if (address) parts.push(`address=${address}`);
    const port = error?.cause?.port || error?.port;
    if (port) parts.push(`port=${port}`);
    return parts.join(' | ');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Отправка документа в УХ (создание/обновление)
   */
  async upsertDocument(request: UHOperationRequest): Promise<UHOperationResponse> {
    try {
      console.log(`📤 Sending document to UH: ${request.documentId}`, {
        operationType: request.operationType,
        type: request.payload.type,
        number: request.payload.number
      });

      // 1С ожидает структуру { payload: {...} }, без operationType и documentId
      const response = await this.requestWithRetry<UHOperationResponse>(
        `${this.baseUrl}/documents`,
        {
          method: 'POST',
          body: JSON.stringify({
            payload: request.payload
          })
        }
      );

      console.log(`✅ Document sent to UH successfully: ${response.uhDocumentRef}`);
      return response;
    } catch (error: any) {
      const errorDetails = this.formatError(error);
      console.error(`❌ Failed to send document to UH: ${request.documentId}`);
      console.error(`   Full error details: ${errorDetails}`);
      return {
        success: false,
        errorCode: 'UH_API_ERROR',
        errorMessage: errorDetails,
        status: 'Error'
      };
    }
  }

  /**
   * Проведение документа в УХ
   */
  async postDocument(documentId: string, uhDocumentRef: string): Promise<UHOperationResponse> {
    try {
      console.log(`📤 Posting document in UH: ${uhDocumentRef}`);

      const response = await this.requestWithRetry<UHOperationResponse>(
        `${this.baseUrl}/documents/${uhDocumentRef}/post`,
        {
          method: 'POST'
        }
      );

      console.log(`✅ Document posted in UH: ${uhDocumentRef}`);
      return response;
    } catch (error: any) {
      const errorDetails = this.formatError(error);
      console.error(`❌ Failed to post document in UH: ${uhDocumentRef}`);
      console.error(`   Full error details: ${errorDetails}`);
      return {
        success: false,
        uhDocumentRef,
        errorCode: 'UH_API_ERROR',
        errorMessage: errorDetails,
        status: 'Error'
      };
    }
  }

  /**
   * Получение дельты НСИ из УХ
   */
  async getNSIDelta(request: NSIDeltaRequest): Promise<NSIDeltaResponse> {
    try {
      const params = new URLSearchParams();
      if (request.type) params.append('type', request.type);
      if (request.since) params.append('since', request.since);
      if (request.version) params.append('version', request.version.toString());

      console.log(`📥 Fetching NSI delta from UH: ${params.toString()}`);

      const response = await this.requestWithRetry<NSIDeltaResponse>(
        `${this.baseUrl}/nsi/delta?${params.toString()}`,
        {
          method: 'GET'
        }
      );

      console.log(`✅ NSI delta received: ${response.items.length} items`);
      return response;
    } catch (error: any) {
      const errorDetails = this.formatError(error);
      console.error(`❌ Failed to fetch NSI delta from UH`);
      console.error(`   Full error details: ${errorDetails}`);
      // Возвращаем пустой ответ при ошибке, чтобы не ломать синхронизацию
      return {
        items: [],
        version: request.version || 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Получение складов НСИ из УХ (отдельный сервис)
   */
  async getNSIWarehouses(request: Pick<NSIDeltaRequest, 'version'> = {}): Promise<NSIDeltaResponse> {
    try {
      const params = new URLSearchParams();
      if (request.version) params.append('version', request.version.toString());

      console.log(`📥 Fetching NSI warehouses from UH: ${params.toString()}`);

      const response = await this.requestWithRetry<NSIDeltaResponse>(
        `${this.baseUrl}/nsi/warehouses${params.toString() ? `?${params.toString()}` : ''}`,
        {
          method: 'GET'
        }
      );

      console.log(`✅ NSI warehouses received: ${response.items.length} items`);
      return response;
    } catch (error: any) {
      const errorDetails = this.formatError(error);
      console.error(`❌ Failed to fetch NSI warehouses from UH`);
      console.error(`   Full error details: ${errorDetails}`);
      return {
        items: [],
        version: request.version || 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Получение номенклатуры НСИ из УХ (отдельный сервис /nsi/nomenclature)
   */
  async getNSINomenclature(request: Pick<NSIDeltaRequest, 'version'> = {}): Promise<NSIDeltaResponse> {
    try {
      const params = new URLSearchParams();
      if (request.version) params.append('version', request.version.toString());

      const response = await this.requestWithRetry<NSIDeltaResponse>(
        `${this.baseUrl}/nsi/nomenclature${params.toString() ? `?${params.toString()}` : ''}`,
        { method: 'GET' }
      );

      if (response?.items?.length) {
        console.log(`✅ NSI nomenclature received: ${response.items.length} items`);
      }
      return response;
    } catch (error: any) {
      console.error('❌ Failed to fetch NSI nomenclature from UH', error?.message);
      return {
        items: [],
        version: request.version || 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Получение статуса документа в УХ
   */
  async getDocumentStatus(uhDocumentRef: string): Promise<UHOperationResponse> {
    try {
      const response = await this.requestWithRetry<UHOperationResponse>(
        `${this.baseUrl}/documents/${uhDocumentRef}/status`,
        {
          method: 'GET'
        }
      );

      return response;
    } catch (error: any) {
      const errorDetails = this.formatError(error);
      console.error(`❌ Failed to get document status from UH: ${uhDocumentRef}`);
      console.error(`   Full error details: ${errorDetails}`);
      return {
        success: false,
        uhDocumentRef,
        errorCode: 'UH_API_ERROR',
        errorMessage: errorDetails,
        status: 'Error'
      };
    }
  }

  /**
   * Проверка доступности API УХ
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.requestWithRetry(
        `${this.baseUrl}/health`,
        { method: 'GET' },
        1 // Только одна попытка для health check
      );
      return true;
    } catch {
      return false;
    }
  }
}

export const uhIntegrationService = new UHIntegrationService();
