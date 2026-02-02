// Сервис очереди для асинхронной обработки операций с УХ

import { pool } from '../db/connection.js';
import { uhIntegrationService } from './uh-integration.js';
import { buildUHPayload } from './uh-payload.js';
import { getUHDocumentConfig } from '../config/uh-document-types.js';
import * as documentsRepo from '../repositories/documents.js';
import { logger } from '../utils/logger.js';
import { normalizeUhDocumentRef } from '../utils/uh-ref.js';

export interface QueueItem {
  id: string;
  documentId: string;
  operationType: 'UpsertDocument' | 'PostDocument' | 'CancelDocument';
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  attempts: number;
  lastError?: string;
  createdAt: Date;
  processedAt?: Date;
}

export class UHQueueService {
  private processing = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Добавление задачи в очередь
   */
  async enqueue(
    documentId: string,
    operationType: 'UpsertDocument' | 'PostDocument' | 'CancelDocument'
  ): Promise<string> {
    // Получаем данные документа для payload
    const docResult = await pool.query(
      `SELECT d.*, o.name as organization_name
       FROM documents d
       LEFT JOIN organizations o ON d.organization_id = o.id
       WHERE d.id = $1`,
      [documentId]
    );

    if (docResult.rows.length === 0) {
      throw new Error(`Document ${documentId} not found`);
    }

    const document = docResult.rows[0];

    // Получаем версию документа
    const versionResult = await pool.query(
      `SELECT data FROM document_versions 
       WHERE document_id = $1 AND version = $2`,
      [documentId, document.current_version]
    );

    const versionData = versionResult.rows.length > 0
      ? (versionResult.rows[0].data as Record<string, unknown>)
      : {};

    // Проверяем поддержку типа документа в интеграции
    const docConfig = getUHDocumentConfig(document.type);
    if (!docConfig) {
      logger.warn('Document type not in UH config, sending generic payload', { documentType: document.type });
    }

    // Формируем payload для 1С по конфигу видов документов и НСИ (склад, счёт, нормализация items)
    const payload = await buildUHPayload(document, versionData);

    const result = await pool.query(
      `INSERT INTO uh_integration_queue (
        document_id, operation_type, status, retry_count, payload, idempotency_key
      ) VALUES ($1, $2, 'Pending', 0, $3, $4)
      RETURNING id`,
      [documentId, operationType, JSON.stringify(payload), payload.idempotencyKey]
    );

    console.log(`📥 Added to UH queue: ${operationType} for document ${documentId}`);
    
    // Запускаем обработку, если она не запущена
    this.startProcessing();
    
    return result.rows[0].id;
  }

  /**
   * Запуск обработки очереди
   */
  startProcessing(intervalMs: number = 5000) {
    if (this.processing) {
      return;
    }

    this.processing = true;
    logger.info('UH queue processor started', { intervalMs });

    // Обрабатываем сразу при старте
    this.processQueue();

    // Затем обрабатываем периодически
    this.intervalId = setInterval(() => {
      this.processQueue();
    }, intervalMs);
  }

  /**
   * Остановка обработки очереди
   */
  stopProcessing() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.processing = false;
    logger.info('UH queue processor stopped');
  }

  /**
   * Обработка очереди
   */
  private async processQueue() {
    try {
      // Получаем задачи со статусом Pending или Failed (для retry)
      // Используем SKIP LOCKED для параллельной обработки
      const result = await pool.query(
        `SELECT id, document_id, operation_type, retry_count as attempts, 
                error_message as last_error, payload
         FROM uh_integration_queue
         WHERE status IN ('Pending', 'Failed')
           AND retry_count < 3
         ORDER BY created_at ASC
         LIMIT 10
         FOR UPDATE SKIP LOCKED`,
        []
      );

      if (result.rows.length === 0) {
        return;
      }

      console.log(`📦 Processing ${result.rows.length} items from UH queue`);

      // Обрабатываем задачи параллельно
      await Promise.all(
        result.rows.map(row => this.processItem(row))
      );
    } catch (error: any) {
      logger.error('Error processing UH queue', error);
    }
  }

  /**
   * Обработка одной задачи
   */
  private async processItem(item: any) {
    const { id, document_id, operation_type, attempts, payload } = item;

    try {
      // Обновляем статус на Processing
      await pool.query(
        'UPDATE uh_integration_queue SET status = $1 WHERE id = $2',
        ['Processing', id]
      );

      // Выполняем операцию в зависимости от типа
      let response;
      switch (operation_type) {
        case 'UpsertDocument':
          // payload уже JSONB из БД, используем как есть
          const payloadData = typeof payload === 'string' ? JSON.parse(payload) : payload;
          response = await uhIntegrationService.upsertDocument({
            operationType: 'UpsertDocument',
            documentId: document_id,
            payload: payloadData
          });
          break;
        case 'PostDocument':
          // Получаем документ для получения uh_document_ref
          const document = await documentsRepo.getDocumentById(document_id);
          if (!document) {
            throw new Error(`Document ${document_id} not found`);
          }
          if (!document.uh_document_ref) {
            throw new Error('Document not sent to UH yet');
          }
          response = await uhIntegrationService.postDocument(
            document_id,
            document.uh_document_ref
          );
          break;
        case 'CancelDocument':
          // TODO: реализовать отмену документа
          throw new Error('CancelDocument not implemented yet');
        default:
          throw new Error(`Unknown operation type: ${operation_type}`);
      }

      if (response.success) {
        // Обновляем статус документа
        await this.updateDocumentStatus(document_id, operation_type, response);

        // Помечаем задачу как выполненную
        await pool.query(
          `UPDATE uh_integration_queue 
           SET status = 'Completed', processed_at = NOW(), completed_at = NOW()
           WHERE id = $1`,
          [id]
        );

        console.log(`✅ Processed UH queue item ${id}: ${operation_type}`);
      } else {
        throw new Error(response.errorMessage || 'UH operation failed');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const newAttempts = attempts + 1;
      const newStatus = newAttempts >= 3 ? 'Failed' : 'Pending';

      await pool.query(
        `UPDATE uh_integration_queue 
         SET status = $1, retry_count = $2, error_message = $3
         WHERE id = $4`,
        [newStatus, newAttempts, errorMessage, id]
      );

      logger.error('Failed to process UH queue item', new Error(errorMessage), { 
        queueId: id, 
        operationType: operation_type, 
        documentId: document_id,
        attempt: newAttempts 
      });
    }
  }


  /**
   * Обновление статуса документа после операции с УХ
   */
  private async updateDocumentStatus(
    documentId: string,
    operationType: string,
    response: any
  ) {
    const updates: any = {};

    if (operationType === 'UpsertDocument') {
      updates.uh_document_ref = response.uhDocumentRef
        ? normalizeUhDocumentRef(response.uhDocumentRef)
        : undefined;
      updates.uh_status = response.status || 'Accepted';
      updates.portal_status = 'SentToUH';
      updates.sent_to_uh_at = new Date();
    } else if (operationType === 'PostDocument') {
      updates.uh_status = response.status || 'Posted';
    }

    if (response.errorMessage) {
      updates.uh_error_message = response.errorMessage;
      updates.uh_status = 'Error';
    }

    await pool.query(
      `UPDATE documents 
       SET uh_document_ref = COALESCE($1, uh_document_ref),
           uh_status = COALESCE($2, uh_status),
           portal_status = COALESCE($3, portal_status),
           sent_to_uh_at = COALESCE($4, sent_to_uh_at),
           uh_error_message = COALESCE($5, uh_error_message),
           updated_at = NOW()
       WHERE id = $6`,
      [
        updates.uh_document_ref,
        updates.uh_status,
        updates.portal_status,
        updates.sent_to_uh_at,
        updates.uh_error_message,
        documentId
      ]
    );
  }

  /**
   * Получение статистики очереди
   */
  async getStats() {
    const result = await pool.query(
      `SELECT 
        status,
        COUNT(*)::int as count
       FROM uh_integration_queue
       GROUP BY status`
    );

    return {
      pending: parseInt(result.rows.find(r => r.status === 'Pending')?.count || '0'),
      processing: parseInt(result.rows.find(r => r.status === 'Processing')?.count || '0'),
      completed: parseInt(result.rows.find(r => r.status === 'Completed')?.count || '0'),
      failed: parseInt(result.rows.find(r => r.status === 'Failed')?.count || '0')
    };
  }

  /**
   * Повтор задачи в очереди: сброс в Pending, retry_count = 0, очистка ошибки.
   * Для теста — не нужно создавать новый документ.
   */
  async retryQueueItem(queueItemId: string): Promise<void> {
    const result = await pool.query(
      `UPDATE uh_integration_queue
       SET status = 'Pending', retry_count = 0, error_message = NULL,
           processed_at = NULL, completed_at = NULL
       WHERE id = $1
       RETURNING id`,
      [queueItemId]
    );
    if (result.rows.length === 0) {
      throw new Error(`Queue item ${queueItemId} not found`);
    }
    logger.info('Queue item retry', { queueItemId });
  }

  /**
   * Переотправить документ: добавить в очередь новую задачу (Создание/обновление).
   * Для теста — один и тот же документ можно отправлять многократно.
   */
  async resendDocument(documentId: string): Promise<string> {
    return this.enqueue(documentId, 'UpsertDocument');
  }
}

export const uhQueueService = new UHQueueService();
