// Типы для интеграции с 1С УХ

export type PortalDocumentStatus =
  | 'Draft'
  | 'Validated'
  | 'Frozen'
  | 'QueuedToUH'
  | 'SentToUH';

export type UHDocumentStatus =
  | 'None'
  | 'Accepted'
  | 'Posted'
  | 'Error';

export interface DocumentPayload {
  portalDocId: string;
  portalVersion: number;
  idempotencyKey: string;
  sourceCompany: string;
  type: string;
  number: string;
  date: string;
  counterpartyName?: string;
  counterpartyInn?: string;
  amount?: number;
  currency?: string;
  data: Record<string, any>; // гибкая структура реквизитов
}

export interface UHOperationRequest {
  operationType: 'UpsertDocument' | 'PostDocument' | 'CancelDocument';
  documentId: string;
  payload: DocumentPayload;
}

export interface UHOperationResponse {
  success: boolean;
  uhDocumentRef?: string; // ссылка на документ в УХ
  status?: UHDocumentStatus;
  errorCode?: string;
  errorMessage?: string;
  details?: Record<string, any>;
}

export interface NSIItem {
  id: string;
  type: 'Counterparty' | 'Contract' | 'Organization' | 'Warehouse' | 'Account' | 'AccountingAccount' | 'Article' | 'Other';
  code?: string;
  name: string;
  data: Record<string, any>;
  updatedAt: string;
}

export interface NSIDeltaRequest {
  type?: string;
  since?: string; // ISO date
  version?: number;
}

export interface NSIDeltaResponse {
  items: NSIItem[];
  version: number;
  timestamp: string;
}
