// Сервис для валидации документов и создания проверок

import * as documentsRepo from '../repositories/documents.js';
import { logger } from '../utils/logger.js';

export interface ValidationRule {
  field: string;
  validator: (value: any, document: any) => string | null; // Возвращает сообщение об ошибке или null
  level: 'error' | 'warning';
}

/**
 * Валидация документа и создание проверок
 */
export async function validateDocument(documentId: string, document: any, version?: number): Promise<void> {
  const checks: Array<{ source: string; level: 'error' | 'warning'; field?: string; message: string }> = [];

  // Если organizationId отсутствует в переданном объекте, пытаемся получить его из основной таблицы
  let organizationId = document.organizationId;
  if (!organizationId) {
    try {
      const docRow = await documentsRepo.getDocumentById(documentId);
      if (docRow && docRow.organization_id) {
        organizationId = docRow.organization_id;
      }
    } catch (error: any) {
      logger.warn('Failed to fetch organizationId from documents table', { documentId, error: error.message });
    }
  }

  // Базовые проверки
  if (!document.number || document.number.trim() === '') {
    checks.push({
      source: 'Портал',
      level: 'error',
      field: 'number',
      message: 'Не указан номер документа'
    });
  }

  if (!document.date) {
    checks.push({
      source: 'Портал',
      level: 'error',
      field: 'date',
      message: 'Не указана дата документа'
    });
  }

  if (!organizationId) {
    checks.push({
      source: 'Портал',
      level: 'error',
      field: 'organizationId',
      message: 'Не указана организация'
    });
  }

  // Проверка даты (не должна быть в будущем)
  if (document.date) {
    const docDate = new Date(document.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Конец сегодняшнего дня
    
    if (docDate > today) {
      checks.push({
        source: 'Портал',
        level: 'warning',
        field: 'date',
        message: 'Дата документа в будущем'
      });
    }
  }

  // Проверка позиций документа (для документов с позициями)
  if (document.items && Array.isArray(document.items)) {
    if (document.items.length === 0) {
      checks.push({
        source: 'Портал',
        level: 'warning',
        field: 'items',
        message: 'Документ не содержит позиций'
      });
    } else {
      // Проверка каждой позиции
      document.items.forEach((item: any, index: number) => {
        if (!item.nomenclatureName || item.nomenclatureName.trim() === '') {
          checks.push({
            source: 'Портал',
            level: 'error',
            field: `items[${index}].nomenclatureName`,
            message: `Позиция ${index + 1}: не указана номенклатура`
          });
        }
        
        if (item.quantity === undefined || item.quantity === null || item.quantity <= 0) {
          checks.push({
            source: 'Портал',
            level: 'error',
            field: `items[${index}].quantity`,
            message: `Позиция ${index + 1}: некорректное количество`
          });
        }
        
        if (item.price === undefined || item.price === null || item.price < 0) {
          checks.push({
            source: 'Портал',
            level: 'warning',
            field: `items[${index}].price`,
            message: `Позиция ${index + 1}: не указана цена или цена отрицательная`
          });
        }
      });
    }
  }

  // Проверка суммы документа
  if (document.totalAmount !== undefined && document.totalAmount !== null) {
    if (document.totalAmount < 0) {
      checks.push({
        source: 'Портал',
        level: 'warning',
        field: 'totalAmount',
        message: 'Сумма документа отрицательная'
      });
    }

    // Проверка соответствия суммы позиций и общей суммы
    if (document.items && Array.isArray(document.items) && document.items.length > 0) {
      const calculatedAmount = document.items.reduce((sum: number, item: any) => {
        return sum + (item.amount || (item.quantity || 0) * (item.price || 0));
      }, 0);
      
      const difference = Math.abs(document.totalAmount - calculatedAmount);
      if (difference > 0.01) { // Допускаем небольшую погрешность из-за округления
        checks.push({
          source: 'Портал',
          level: 'warning',
          field: 'totalAmount',
          message: `Сумма документа (${document.totalAmount.toFixed(2)}) не совпадает с суммой позиций (${calculatedAmount.toFixed(2)})`
        });
      }
    }
  }

  // Проверка контрагента для документов, где он обязателен
  const documentsRequiringCounterparty = [
    'InvoiceFromSupplier',
    'SaleGoods',
    'SaleServices',
    'ReturnToSupplier',
    'ReturnFromBuyer',
    'InvoiceToBuyer',
    'ReceivedInvoice',
    'IssuedInvoice'
  ];

  if (documentsRequiringCounterparty.includes(document.type)) {
    if (!document.counterpartyId && !document.counterpartyName) {
      checks.push({
        source: 'Портал',
        level: 'error',
        field: 'counterpartyId',
        message: 'Не указан контрагент'
      });
    }
  }

  // Проверка склада для складских документов
  const warehouseDocuments = [
    'GoodsReceipt',
    'GoodsWriteOff',
    'GoodsTransfer',
    'Inventory',
    'ReturnToSupplier',
    'ReturnFromBuyer'
  ];

  if (warehouseDocuments.includes(document.type)) {
    if (!document.warehouseId) {
      checks.push({
        source: 'Портал',
        level: 'error',
        field: 'warehouseId',
        message: 'Не указан склад'
      });
    }
  }

  // Сохраняем все проверки в БД
  for (const check of checks) {
    try {
      await documentsRepo.addDocumentCheck(
        documentId,
        check.source,
        check.level,
        check.message,
        check.field,
        version
      );
    } catch (error: any) {
      logger.error('Failed to add document check', { documentId, check, error: error.message });
    }
  }

  if (checks.length > 0) {
    logger.info('Document validation completed', { 
      documentId, 
      totalChecks: checks.length,
      errors: checks.filter(c => c.level === 'error').length,
      warnings: checks.filter(c => c.level === 'warning').length
    });
  }
}
