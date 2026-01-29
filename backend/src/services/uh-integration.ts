// Сервис для интеграции с 1С УХ
// Пока заглушка - будет реализован позже

import {
  UHOperationRequest,
  UHOperationResponse,
  NSIDeltaRequest,
  NSIDeltaResponse
} from '../types/uh-integration.js';

export class UHIntegrationService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.UH_API_URL || 'http://localhost:8080/api';
  }

  /**
   * Отправка документа в УХ (создание/обновление)
   */
  async upsertDocument(request: UHOperationRequest): Promise<UHOperationResponse> {
    // TODO: реальный HTTP запрос к УХ
    // const response = await fetch(`${this.baseUrl}/documents`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(request.payload)
    // });

    // Заглушка для разработки
    return {
      success: true,
      uhDocumentRef: `UH-DOC-${Date.now()}`,
      status: 'Accepted'
    };
  }

  /**
   * Проведение документа в УХ
   */
  async postDocument(documentId: string, uhDocumentRef: string): Promise<UHOperationResponse> {
    // TODO: реальный HTTP запрос к УХ
    // const response = await fetch(`${this.baseUrl}/documents/${uhDocumentRef}/post`, {
    //   method: 'POST'
    // });

    // Заглушка для разработки
    return {
      success: true,
      uhDocumentRef,
      status: 'Posted'
    };
  }

  /**
   * Получение дельты НСИ из УХ
   */
  async getNSIDelta(request: NSIDeltaRequest): Promise<NSIDeltaResponse> {
    // TODO: реальный HTTP запрос к УХ
    // const response = await fetch(`${this.baseUrl}/nsi/delta?${new URLSearchParams(request)}`);

    // Заглушка для разработки
    return {
      items: [],
      version: 1,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Получение статуса документа в УХ
   */
  async getDocumentStatus(uhDocumentRef: string): Promise<UHOperationResponse> {
    // TODO: реальный HTTP запрос к УХ
    // const response = await fetch(`${this.baseUrl}/documents/${uhDocumentRef}/status`);

    // Заглушка для разработки
    return {
      success: true,
      uhDocumentRef,
      status: 'Posted'
    };
  }
}

export const uhIntegrationService = new UHIntegrationService();
