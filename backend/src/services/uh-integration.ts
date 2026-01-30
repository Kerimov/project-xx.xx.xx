// Сервис для интеграции с 1С УХ через HTTP API

import https from 'https';
import http from 'http';
import {
  UHOperationRequest,
  UHOperationResponse,
  NSIDeltaRequest,
  NSIDeltaResponse
} from '../types/uh-integration.js';

export class UHIntegrationService {
  private baseUrl: string;
  private username: string;
  private password: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;
  private insecureTls: boolean;

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
    this.username = config?.username || process.env.UH_API_USER || '';
    this.password = config?.password || process.env.UH_API_PASSWORD || '';
    this.timeout = config?.timeout || parseInt(process.env.UH_API_TIMEOUT || '30000');
    this.retryAttempts = config?.retryAttempts || parseInt(process.env.UH_RETRY_ATTEMPTS || '3');
    this.retryDelay = config?.retryDelay || parseInt(process.env.UH_RETRY_DELAY || '5000');
    this.insecureTls =
      config?.insecureTls ?? (process.env.UH_API_INSECURE || '').toLowerCase() === 'true';
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
        headers,
        timeout: this.timeout,
        ...(isHttps && this.insecureTls && { rejectUnauthorized: false })
      };

      const result = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = (isHttps ? https : http).request(requestOptions, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => resolve({ statusCode: res.statusCode!, body: Buffer.concat(chunks).toString('utf8') }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.setTimeout(this.timeout);
        if (body) req.write(body, 'utf8');
        req.end();
      });

      if (result.statusCode < 200 || result.statusCode >= 400) {
        throw new Error(`UH API error ${result.statusCode}: ${result.body}`);
      }

      return JSON.parse(result.body) as T;
    } catch (error: any) {
      if (attempt < this.retryAttempts && this.shouldRetry(error)) {
        console.warn(`⚠️ UH API request failed (attempt ${attempt}/${this.retryAttempts}), retrying...`, error.message);
        await this.sleep(this.retryDelay * attempt); // Exponential backoff
        return this.requestWithRetry<T>(url, options, attempt + 1);
      }
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
      console.error(`❌ Failed to send document to UH: ${request.documentId}`, error);
      return {
        success: false,
        errorCode: 'UH_API_ERROR',
        errorMessage: this.formatError(error),
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
      console.error(`❌ Failed to post document in UH: ${uhDocumentRef}`, error);
      return {
        success: false,
        uhDocumentRef,
        errorCode: 'UH_API_ERROR',
        errorMessage: this.formatError(error),
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
      console.error(`❌ Failed to fetch NSI delta from UH`, error);
      // Возвращаем пустой ответ при ошибке, чтобы не ломать синхронизацию
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
      console.error(`❌ Failed to get document status from UH: ${uhDocumentRef}`, error);
      return {
        success: false,
        uhDocumentRef,
        errorCode: 'UH_API_ERROR',
        errorMessage: this.formatError(error),
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
