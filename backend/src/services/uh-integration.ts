// Сервис для интеграции с 1С УХ через HTTP API

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

  constructor(config?: {
    baseUrl?: string;
    username?: string;
    password?: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
  }) {
    // UH_API_URL должен быть базовым URL без /api (например: http://server:8080/ecof)
    const envUrl = process.env.UH_API_URL || 'http://localhost:8080/ecof';
    this.baseUrl = config?.baseUrl || envUrl.replace(/\/api$/, ''); // Убираем /api если есть
    this.username = config?.username || process.env.UH_API_USER || '';
    this.password = config?.password || process.env.UH_API_PASSWORD || '';
    this.timeout = config?.timeout || parseInt(process.env.UH_API_TIMEOUT || '30000');
    this.retryAttempts = config?.retryAttempts || parseInt(process.env.UH_RETRY_ATTEMPTS || '3');
    this.retryDelay = config?.retryDelay || parseInt(process.env.UH_RETRY_DELAY || '5000');
  }

  /**
   * Выполняет HTTP запрос с retry логикой
   */
  private async requestWithRetry<T>(
    url: string,
    options: RequestInit,
    attempt = 1
  ): Promise<T> {
    try {
      // Базовая аутентификация
      const authHeader = this.username && this.password
        ? `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`
        : undefined;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { Authorization: authHeader }),
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`UH API error ${response.status}: ${errorText}`);
      }

      return await response.json();
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
    return (
      error.name === 'AbortError' ||
      error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('ETIMEDOUT') ||
      error.message?.includes('500') ||
      error.message?.includes('502') ||
      error.message?.includes('503')
    );
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
        errorMessage: error.message || 'Unknown error',
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
        errorMessage: error.message || 'Unknown error',
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
        errorMessage: error.message || 'Unknown error',
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
