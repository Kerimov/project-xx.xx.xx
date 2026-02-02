import { Request, Response, NextFunction } from 'express';
import * as documentsRepo from '../repositories/documents.js';
import { pool } from '../db/connection.js';
import { uhQueueService } from '../services/uh-queue.js';
import { uhIntegrationService } from '../services/uh-integration.js';
import { logger } from '../utils/logger.js';
import {
  transitionStatus,
  isEditable,
  getAvailableTransitions,
  STATUS_LABELS_RU,
  type PortalStatus
} from '../services/document-status.js';
import { validateDocument } from '../services/document-validation.js';

export async function getDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = {
      packageId: req.query.packageId as string | undefined,
      organizationId: req.query.organizationId as string | undefined,
      portalStatus: req.query.portalStatus as string | undefined,
      uhStatus: req.query.uhStatus as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    const rows = await documentsRepo.getDocuments(filters);
    
    // Преобразуем в формат для фронтенда
    const documents = rows.map(row => ({
      id: row.id,
      number: row.number,
      date: row.date instanceof Date 
        ? `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}-${String(row.date.getDate()).padStart(2, '0')}`
        : row.date.toISOString().split('T')[0],
      type: row.type,
      company: row.organization_name || '',
      counterparty: row.counterparty_name || '',
      amount: row.amount,
      currency: row.currency,
      portalStatus: row.portal_status,
      uhStatus: row.uh_status || 'None',
      version: `v${row.current_version}`,
      packageId: row.package_id
    }));

    res.json({ data: documents });
  } catch (error) {
    next(error);
  }
}

export async function getDocumentById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    
    const row = await documentsRepo.getDocumentById(id);
    if (!row) {
      return res.status(404).json({ error: { message: 'Документ не найден' } });
    }

    // Получаем полные данные из версии документа
    const versionData = await documentsRepo.getDocumentVersion(id, row.current_version);
    
    const warehouseId = versionData?.data?.warehouseId || null;

    // Получаем связанные данные (в т.ч. название склада для отображения)
    const [files, checks, history, warehouseName] = await Promise.all([
      documentsRepo.getDocumentFiles(id),
      documentsRepo.getDocumentChecks(id),
      documentsRepo.getDocumentHistory(id),
      documentsRepo.getWarehouseNameById(warehouseId)
    ]);

    // Объединяем данные из таблицы documents и из версии документа
    const document = {
      id: row.id,
      number: row.number,
      date: row.date instanceof Date 
        ? `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}-${String(row.date.getDate()).padStart(2, '0')}`
        : row.date.toISOString().split('T')[0],
      type: row.type,
      organizationId: row.organization_id,
      organizationName: row.organization_name || '',
      counterpartyId: versionData?.data?.counterpartyId || null,
      counterpartyName: row.counterparty_name || versionData?.data?.counterpartyName || '',
      counterpartyInn: row.counterparty_inn || versionData?.data?.counterpartyInn || null,
      contractId: versionData?.data?.contractId || null,
      paymentAccountId: versionData?.data?.paymentAccountId || null,
      warehouseId,
      warehouseName: warehouseName || '',
      hasDiscrepancies: versionData?.data?.hasDiscrepancies || false,
      originalReceived: versionData?.data?.originalReceived || false,
      invoiceReceived: versionData?.data?.invoiceReceived || false,
      isUPD: versionData?.data?.isUPD || false,
      invoiceRequired: versionData?.data?.invoiceRequired || false,
      dueDate: versionData?.data?.dueDate || null,
      receiptBasis: versionData?.data?.receiptBasis || null,
      returnBasis: versionData?.data?.returnBasis || null,
      documentNumber: versionData?.data?.documentNumber || null,
      paymentTerms: versionData?.data?.paymentTerms || null,
      receiptOperationType: versionData?.data?.receiptOperationType || null,
      items: versionData?.data?.items || [],
      totalAmount: row.amount || versionData?.data?.totalAmount || versionData?.data?.amount || 0,
      totalVAT: versionData?.data?.totalVAT || 0,
      amount: row.amount || versionData?.data?.amount || versionData?.data?.totalAmount || 0,
      currency: row.currency || versionData?.data?.currency || 'RUB',
      portalStatus: row.portal_status,
      uhStatus: row.uh_status || 'None',
      uhDocumentRef: row.uh_document_ref || null,
      version: `v${row.current_version}`,
      packageId: row.package_id,
      // Для обратной совместимости
      company: row.organization_name || '',
      counterparty: row.counterparty_name || versionData?.data?.counterpartyName || '',
      files: files.map(f => ({
        id: f.id,
        name: f.file_name,
        uploadedAt: f.uploaded_at.toISOString(),
        uploadedBy: f.uploaded_by || '',
        hash: f.hash_sha256 || ''
      })),
      checks: checks.map(c => ({
        id: c.id,
        source: c.source,
        level: c.level,
        message: c.message,
        field: c.field || undefined
      })),
      history: history.map(h => ({
        id: h.id,
        at: h.created_at.toISOString(),
        user: h.user_name || h.user_id || '',
        action: h.action,
        details: h.details ? (typeof h.details === 'string' ? JSON.parse(h.details) : h.details) : null
      }))
    };

    res.json({ data: document });
  } catch (error) {
    next(error);
  }
}

export async function createDocument(req: Request, res: Response, next: NextFunction) {
  try {
    // Данные уже валидированы через middleware validate()
    const documentData = req.body;
    logger.info('Creating document', { documentId: 'new', type: documentData.type, number: documentData.number });
    
    const document = await documentsRepo.createDocument({
      packageId: documentData.packageId,
      number: documentData.number,
      date: documentData.date,
      type: documentData.type,
      organizationId: documentData.organizationId,
      counterpartyName: documentData.counterpartyName,
      counterpartyInn: documentData.counterpartyInn,
      amount: documentData.amount,
      currency: documentData.currency || 'RUB',
      contractId: documentData.contractId,
      paymentAccountId: documentData.paymentAccountId,
      departmentId: documentData.departmentId,
      warehouseId: documentData.warehouseId,
      receiptOperationType: documentData.receiptOperationType,
      hasDiscrepancies: documentData.hasDiscrepancies,
      originalReceived: documentData.originalReceived,
      invoiceReceived: documentData.invoiceReceived,
      isUPD: documentData.isUPD,
      invoiceRequired: documentData.invoiceRequired,
      items: documentData.items,
      totalAmount: documentData.totalAmount,
      totalVAT: documentData.totalVAT,
      dueDate: documentData.dueDate,
      receiptBasis: documentData.receiptBasis,
      returnBasis: documentData.returnBasis,
      documentNumber: documentData.documentNumber,
      paymentTerms: documentData.paymentTerms,
      waybillDate: documentData.waybillDate,
      createdBy: req.user?.username || 'system'
    });
    
    // Добавляем запись в историю
    const user = req.user;
    if (!user) {
      logger.warn('No user in request when creating document', { documentId: document.id });
    }
    
    await documentsRepo.addDocumentHistory(
      document.id,
      'Документ создан',
      user?.id || user?.username || 'system',
      user?.username || 'Система',
      1,
      { number: document.number, type: document.type }
    );

    // Выполняем валидацию документа и создаем проверки
    try {
      await validateDocument(document.id, documentData, 1);
    } catch (validationError: any) {
      logger.warn('Document validation failed', { documentId: document.id, error: validationError.message });
      // Не прерываем создание документа, только логируем ошибку валидации
    }
    
    logger.info('Document created successfully', { documentId: document.id, username: user?.username });
    res.status(201).json({ data: document });
  } catch (error: any) {
    logger.error('Error creating document', error, { documentType: documentData.type });
    // Более детальная информация об ошибке
    if (error.code === '23503') {
      return res.status(400).json({ 
        error: { message: 'Foreign key constraint violation. Check organizationId and other references.' } 
      });
    }
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: { message: 'Документ с таким номером уже существует' } 
      });
    }
    next(error);
  }
}

export async function updateDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    logger.info('Update document request', { 
      documentId: id, 
      hasOrganizationId: !!updates.organizationId,
      organizationId: updates.organizationId,
      portalStatus: updates.portalStatus 
    });
    
    const document = await documentsRepo.getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: { message: 'Документ не найден' } });
    }

    // Проверяем, можно ли редактировать документ в текущем статусе
    const currentStatus = document.portal_status as PortalStatus;
    logger.info('Document status check', { 
      documentId: id, 
      currentStatus, 
      isEditable: isEditable(currentStatus) 
    });
    
    if (!isEditable(currentStatus)) {
      logger.warn('Document not editable', { documentId: id, currentStatus });
      return res.status(403).json({
        error: {
          message: `Документ нельзя редактировать в статусе "${currentStatus}". Доступно редактирование только в статусах: Draft, Validated, RejectedByUH`
        }
      });
    }
    
    // Обновляем базовую таблицу documents
    const updated = await documentsRepo.updateDocument(id, {
      number: updates.number,
      date: updates.date ? new Date(updates.date) : undefined,
      type: updates.type,
      counterparty_name: updates.counterpartyName,
      counterparty_inn: updates.counterpartyInn,
      amount: updates.totalAmount || updates.amount,
      currency: updates.currency
    } as any);
    
    if (!updated) {
      return res.status(404).json({ error: { message: 'Документ не найден' } });
    }

    // Получаем текущую версию документа для сравнения
    const currentVersionData = await documentsRepo.getDocumentVersion(id, document.current_version);
    const oldData = currentVersionData?.data || {};

    // Создаём новую версию документа с полными данными
    const versionData = {
      number: updates.number,
      date: updates.date,
      type: updates.type,
      organizationId: updates.organizationId || document.organization_id, // Важно: включаем organizationId для валидации
      counterpartyName: updates.counterpartyName,
      counterpartyInn: updates.counterpartyInn,
      contractId: updates.contractId,
      paymentAccountId: updates.paymentAccountId,
      departmentId: updates.departmentId,
      warehouseId: updates.warehouseId,
      receiptOperationType: updates.receiptOperationType,
      hasDiscrepancies: updates.hasDiscrepancies,
      originalReceived: updates.originalReceived,
      invoiceReceived: updates.invoiceReceived,
      isUPD: updates.isUPD,
      invoiceRequired: updates.invoiceRequired,
      items: updates.items || [],
      totalAmount: updates.totalAmount || updates.amount || 0,
      totalVAT: updates.totalVAT || 0,
      amount: updates.amount || updates.totalAmount || 0,
      currency: updates.currency || 'RUB',
      dueDate: updates.dueDate,
      receiptBasis: updates.receiptBasis,
      returnBasis: updates.returnBasis,
      documentNumber: updates.documentNumber,
      paymentTerms: updates.paymentTerms,
      servicePeriod: updates.servicePeriod,
      serviceStartDate: updates.serviceStartDate,
      serviceEndDate: updates.serviceEndDate
    };

    // Сравниваем старые и новые значения для определения измененных полей
    const fieldLabels: Record<string, string> = {
      number: 'Номер документа',
      date: 'Дата',
      counterpartyName: 'Контрагент',
      counterpartyInn: 'ИНН контрагента',
      contractId: 'Договор',
      paymentAccountId: 'Счет оплаты',
      departmentId: 'Подразделение',
      warehouseId: 'Склад',
      hasDiscrepancies: 'Есть расхождения',
      originalReceived: 'Оригинал получен',
      invoiceReceived: 'СФ получен',
      isUPD: 'УПД',
      invoiceRequired: 'Требуется счет',
      items: 'Позиции документа',
      totalAmount: 'Сумма',
      totalVAT: 'НДС',
      amount: 'Сумма',
      currency: 'Валюта',
      dueDate: 'Срок оплаты',
      receiptBasis: 'Основание оприходования',
      returnBasis: 'Основание возврата',
      documentNumber: 'Номер документа-основания',
      paymentTerms: 'Условия оплаты',
      servicePeriod: 'Период оказания услуг',
      serviceStartDate: 'Дата начала услуг',
      serviceEndDate: 'Дата окончания услуг'
    };

    const changedFields: Array<{ field: string; label: string; oldValue: any; newValue: any }> = [];
    
    // Функция для нормализации значений для сравнения
    const normalizeValue = (value: any): any => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') return value.trim();
      if (Array.isArray(value)) return JSON.stringify(value);
      return value;
    };

    // Проверяем каждое поле на изменения
    for (const [key, newValue] of Object.entries(versionData)) {
      const oldValue = oldData[key];
      const normalizedOld = normalizeValue(oldValue);
      const normalizedNew = normalizeValue(newValue);
      
      if (normalizedOld !== normalizedNew) {
        changedFields.push({
          field: key,
          label: fieldLabels[key] || key,
          oldValue: oldValue ?? null,
          newValue: newValue ?? null
        });
      }
    }

    // Создаём новую версию вместо обновления существующей
    const newVersion = await documentsRepo.createNewDocumentVersion(id, versionData, req.user?.username || 'system');

    // Получаем обновленный документ с новой версией
    const updatedDoc = await documentsRepo.getDocumentById(id);
    
    if (!updatedDoc) {
      return res.status(404).json({ error: { message: 'Документ не найден после обновления' } });
    }

    // Убеждаемся, что ID не изменился
    if (updatedDoc.id !== id) {
      logger.error('Document ID changed during update!', { originalId: id, newId: updatedDoc.id });
      return res.status(500).json({ error: { message: 'Внутренняя ошибка: изменился идентификатор документа' } });
    }

    // Добавляем запись в историю с деталями изменений
    const user = req.user;
    const actionText = changedFields.length > 0 
      ? `Документ отредактирован (изменено полей: ${changedFields.length})`
      : 'Документ отредактирован';
    
    await documentsRepo.addDocumentHistory(
      id,
      actionText,
      user?.id || user?.username || 'system',
      user?.username || 'Система',
      updatedDoc.current_version,
      { 
        previousVersion: document.current_version,
        newVersion: updatedDoc.current_version,
        changedFields: changedFields.map(f => ({
          field: f.field,
          label: f.label,
          oldValue: f.oldValue,
          newValue: f.newValue
        }))
      }
    );

    // Выполняем валидацию обновленного документа и создаем проверки
    try {
      await validateDocument(id, versionData, updatedDoc.current_version);
    } catch (validationError: any) {
      logger.warn('Document validation failed', { documentId: id, error: validationError.message });
      // Не прерываем обновление документа, только логируем ошибку валидации
    }

    logger.info('Document updated', { documentId: id, status: currentStatus, newVersion: updatedDoc.current_version });
    
    res.json({ data: updatedDoc });
  } catch (error: any) {
    logger.error('Error updating document', error, { documentId: req.params.id, errorMessage: error?.message });
    next(error);
  }
}

export async function freezeDocumentVersion(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    
    const document = await documentsRepo.getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: { message: 'Документ не найден' } });
    }

    const currentStatus = document.portal_status as PortalStatus;
    const transition = transitionStatus(currentStatus, 'Frozen');
    
    if (!transition.success) {
      return res.status(400).json({
        error: { message: transition.error || 'Невозможно заморозить документ' }
      });
    }

    // Замораживаем документ
    const frozen = await documentsRepo.freezeDocumentVersion(id, document.current_version);
    
    // Добавляем задачу в очередь для отправки в УХ
    await uhQueueService.enqueue(id, 'UpsertDocument');
    
    // Добавляем запись в историю
    const user = req.user;
    await documentsRepo.addDocumentHistory(
      id,
      'Документ заморожен',
      user?.id || user?.username || 'system',
      user?.username || 'Система',
      document.current_version,
      { frozenAt: frozen.frozen_at?.toISOString() }
    );
    
    logger.info('Document frozen', { documentId: id, version: document.current_version });
    
    res.json({
      data: {
        id: frozen.id,
        portalStatus: frozen.portal_status,
        frozenAt: frozen.frozen_at?.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Переводит статус документа
 */
export async function changeDocumentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: { message: 'Статус не указан' }
      });
    }

    const document = await documentsRepo.getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: { message: 'Документ не найден' } });
    }

    const currentStatus = document.portal_status as PortalStatus;
    const newStatus = status as PortalStatus;
    
    const transition = transitionStatus(currentStatus, newStatus);
    
    if (!transition.success) {
      return res.status(400).json({
        error: { message: transition.error || 'Невозможно перевести документ в указанный статус' }
      });
    }

    // Обновляем статус документа
    const metadata: { validatedAt?: Date; frozenAt?: Date; cancelledAt?: Date } = {};
    if (newStatus === 'Validated') {
      metadata.validatedAt = new Date();
    } else if (newStatus === 'Frozen') {
      metadata.frozenAt = new Date();
    } else if (newStatus === 'Cancelled') {
      metadata.cancelledAt = new Date();
    }

    const updated = await documentsRepo.updateDocumentStatus(id, newStatus, metadata);
    
    if (!updated) {
      return res.status(500).json({
        error: { message: 'Не удалось обновить статус документа' }
      });
    }

    // Если статус Frozen, добавляем в очередь УХ (ошибка очереди не отменяет смену статуса)
    let enqueuedToUH = false;
    if (newStatus === 'Frozen') {
      try {
        await uhQueueService.enqueue(id, 'UpsertDocument');
        enqueuedToUH = true;
      } catch (enqueueError: any) {
        logger.error('Failed to enqueue document to UH after freeze', {
          documentId: id,
          error: enqueueError?.message ?? enqueueError
        });
      }
    }

    // Добавляем запись в историю
    const user = req.user;
    const statusLabels: Record<string, string> = {
      'Draft': 'Черновик',
      'Validated': 'Проверен',
      'Frozen': 'Заморожен',
      'QueuedToUH': 'В очереди в УХ',
      'SentToUH': 'Отправлен в УХ',
      'AcceptedByUH': 'Принят УХ',
      'PostedInUH': 'Проведен в УХ',
      'RejectedByUH': 'Отклонен УХ',
      'Cancelled': 'Отменен'
    };
    
    await documentsRepo.addDocumentHistory(
      id,
      `Статус изменен: ${statusLabels[newStatus] || newStatus}`,
      user?.id || user?.username || 'system',
      user?.username || 'Система',
      document.current_version,
      { 
        fromStatus: currentStatus,
        toStatus: newStatus,
        fromStatusLabel: statusLabels[currentStatus] || currentStatus,
        toStatusLabel: statusLabels[newStatus] || newStatus
      }
    );

    logger.info('Document status changed', {
      documentId: id,
      from: currentStatus,
      to: newStatus
    });
    
    res.json({
      data: {
        id: updated.id,
        portalStatus: updated.portal_status,
        availableTransitions: getAvailableTransitions(newStatus),
        enqueuedToUH: newStatus === 'Frozen' ? enqueuedToUH : undefined
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Получает доступные переходы статуса для документа
 */
export async function getDocumentStatusTransitions(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    
    const document = await documentsRepo.getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: { message: 'Документ не найден' } });
    }

    const currentStatus = document.portal_status as PortalStatus;
    const transitions = getAvailableTransitions(currentStatus);
    const editable = isEditable(currentStatus);
    
    res.json({
      data: {
        currentStatus,
        editable,
        availableTransitions: transitions
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    
    const document = await documentsRepo.getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: { message: 'Документ не найден' } });
    }

    // Проверяем, можно ли удалить документ
    // Нельзя удалять документы, которые уже отправлены в УХ или проведены
    const forbiddenStatuses: PortalStatus[] = ['Frozen', 'QueuedToUH', 'SentToUH', 'AcceptedByUH', 'PostedInUH'];
    if (forbiddenStatuses.includes(document.portal_status as PortalStatus)) {
      return res.status(400).json({ 
        error: { 
          message: `Нельзя удалить документ в статусе «${STATUS_LABELS_RU[document.portal_status as PortalStatus] ?? document.portal_status}». Удаление возможно только в статусах: Черновик, Проверен, Отменен, Отклонен УХ`
        } 
      });
    }

    // Добавляем запись в историю перед удалением
    const user = (req as any).user;
    await documentsRepo.addDocumentHistory(
      id,
      'Документ удален',
      user?.id || user?.username || 'system',
      user?.username || 'Система',
      document.current_version,
      { number: document.number, status: document.portal_status }
    );

    // Удаляем документ (CASCADE удалит все связанные данные)
    const deleted = await documentsRepo.deleteDocument(id);
    
    if (!deleted) {
      return res.status(404).json({ 
        error: { message: 'Документ не найден' } 
      });
    }

    logger.info('Document deleted', { documentId: id, status: document.portal_status });
    
    res.json({ 
      data: { 
        id: deleted.id,
        message: 'Документ успешно удален'
      } 
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    
    const document = await documentsRepo.getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: { message: 'Документ не найден' } });
    }

    // Проверяем, можно ли отменить документ
    if (['Frozen', 'QueuedToUH', 'SentToUH', 'AcceptedByUH', 'PostedInUH'].includes(document.portal_status)) {
      return res.status(400).json({ 
        error: { 
          message: `Нельзя отменить документ в статусе «${STATUS_LABELS_RU[document.portal_status as PortalStatus] ?? document.portal_status}»` 
        } 
      });
    }

    // Отменяем документ
    const cancelled = await documentsRepo.cancelDocument(id);
    
    if (!cancelled) {
      return res.status(400).json({ 
        error: { message: 'Не удалось отменить документ. Возможно, он уже в финальном статусе.' } 
      });
    }
    
    // Добавляем запись в историю
    const user = req.user;
    await documentsRepo.addDocumentHistory(
      id,
      'Документ отменен',
      user?.id || user?.username || 'system',
      user?.username || 'Система',
      document.current_version,
      { cancelledAt: cancelled.cancelled_at?.toISOString() }
    );
    
    logger.info('Document cancelled', { documentId: id });
    
    res.json({
      data: {
        id: cancelled.id,
        portalStatus: cancelled.portal_status,
        updatedAt: cancelled.updated_at?.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Создает проверку для документа
 */
export async function addDocumentCheck(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { source, level, message, field, version } = req.body;

    // Проверяем существование документа
    const document = await documentsRepo.getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: { message: 'Документ не найден' } });
    }

    const check = await documentsRepo.addDocumentCheck(
      id,
      source,
      level as 'error' | 'warning' | 'info',
      message,
      field,
      version || document.current_version
    );

    // Добавляем запись в историю
    const user = req.user;
    await documentsRepo.addDocumentHistory(
      id,
      `Добавлена проверка: ${level === 'error' ? 'Ошибка' : level === 'warning' ? 'Предупреждение' : 'Информация'}`,
      user?.id || user?.username || 'system',
      user?.username || 'Система',
      version || document.current_version,
      { source, level, field, message }
    );

    logger.info('Document check added', { 
      documentId: id, 
      checkId: check.id, 
      level, 
      source,
      username: req.user?.username 
    });

    res.status(201).json({
      data: {
        id: check.id,
        source: check.source,
        level: check.level,
        field: check.field,
        message: check.message,
        createdAt: check.created_at
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Синхронизация статуса документа из 1С УХ (получение «Проведен в УХ» и др.).
 * Связь: документ портала имеет uh_document_ref = ссылка на документ в 1С.
 */
export async function syncDocumentUHStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const document = await documentsRepo.getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: { message: 'Документ не найден' } });
    }

    const uhRef = document.uh_document_ref;
    if (!uhRef || typeof uhRef !== 'string' || uhRef.trim() === '') {
      return res.status(400).json({
        error: { message: 'Документ ещё не отправлен в 1С УХ или ссылка на документ в УХ отсутствует' }
      });
    }

    const response = await uhIntegrationService.getDocumentStatus(uhRef.trim());

    if (!response.success) {
      await pool.query(
        `UPDATE documents SET uh_status = 'Error', uh_error_message = COALESCE($1, uh_error_message), updated_at = NOW() WHERE id = $2`,
        [response.errorMessage ?? null, id]
      );
      const updated = await documentsRepo.getDocumentById(id);
      return res.json({
        data: {
          id: updated!.id,
          uhStatus: updated!.uh_status,
          portalStatus: updated!.portal_status,
          uhDocumentRef: updated!.uh_document_ref,
          synced: false,
          errorMessage: response.errorMessage
        }
      });
    }

    const uhStatus = response.status || 'Accepted';
    const portalStatus: PortalStatus =
      uhStatus === 'Posted'
        ? 'PostedInUH'
        : uhStatus === 'Accepted'
          ? 'AcceptedByUH'
          : (document.portal_status as PortalStatus);

    await pool.query(
      `UPDATE documents 
       SET uh_status = $1, portal_status = $2, uh_error_message = NULL, updated_at = NOW() 
       WHERE id = $3`,
      [uhStatus, portalStatus, id]
    );

    const updated = await documentsRepo.getDocumentById(id);
    const user = req.user;
    await documentsRepo.addDocumentHistory(
      id,
      `Статус УХ обновлён: ${uhStatus === 'Posted' ? 'Проведен в УХ' : uhStatus === 'Accepted' ? 'Принят УХ' : uhStatus}`,
      user?.id || user?.username || 'system',
      user?.username || 'Система',
      document.current_version,
      { uhStatus, portalStatus }
    );

    logger.info('Document UH status synced', { documentId: id, uhStatus, portalStatus });

    res.json({
      data: {
        id: updated!.id,
        uhStatus: updated!.uh_status,
        portalStatus: updated!.portal_status,
        uhDocumentRef: updated!.uh_document_ref,
        synced: true
      }
    });
  } catch (error) {
    next(error);
  }
}
