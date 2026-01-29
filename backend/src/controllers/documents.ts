import { Request, Response, NextFunction } from 'express';
import * as documentsRepo from '../repositories/documents.js';

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
      date: row.date.toISOString().split('T')[0],
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
      return res.status(404).json({ error: { message: 'Document not found' } });
    }

    // Получаем связанные данные
    const [files, checks, history] = await Promise.all([
      documentsRepo.getDocumentFiles(id),
      documentsRepo.getDocumentChecks(id),
      documentsRepo.getDocumentHistory(id)
    ]);

    const document = {
      id: row.id,
      number: row.number,
      date: row.date.toISOString().split('T')[0],
      type: row.type,
      company: row.organization_name || '',
      counterparty: row.counterparty_name || '',
      amount: row.amount,
      currency: row.currency,
      portalStatus: row.portal_status,
      uhStatus: row.uh_status || 'None',
      version: `v${row.current_version}`,
      packageId: row.package_id,
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
        user: h.user_id || '',
        action: h.action
      }))
    };

    res.json({ data: document });
  } catch (error) {
    next(error);
  }
}

export async function createDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const documentData = req.body;
    
    // TODO: валидация через Zod
    
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
      createdBy: (req as any).user?.username
    });
    
    res.status(201).json({ data: document });
  } catch (error) {
    next(error);
  }
}

export async function updateDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // TODO: валидация через Zod
    // TODO: создание новой версии документа вместо прямого обновления
    
    const document = await documentsRepo.updateDocument(id, {
      number: updates.number,
      date: updates.date ? new Date(updates.date) : undefined,
      type: updates.type,
      counterparty_name: updates.counterpartyName,
      counterparty_inn: updates.counterpartyInn,
      amount: updates.amount,
      currency: updates.currency
    } as any);
    
    if (!document) {
      return res.status(404).json({ error: { message: 'Document not found' } });
    }
    
    res.json({ data: document });
  } catch (error) {
    next(error);
  }
}

export async function freezeDocumentVersion(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    
    const document = await documentsRepo.getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: { message: 'Document not found' } });
    }

    const frozen = await documentsRepo.freezeDocumentVersion(id, document.current_version);
    
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
