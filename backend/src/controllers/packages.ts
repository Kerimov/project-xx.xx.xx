import { Request, Response, NextFunction } from 'express';
import * as packagesRepo from '../repositories/packages.js';
import * as documentsRepo from '../repositories/documents.js';
import { uhQueueService } from '../services/uh-queue.js';
import { canTransition } from '../services/document-status.js';

export async function getPackages(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = {
      search: req.query.search as string | undefined,
      organizationId: req.query.organizationId as string | undefined,
      status: req.query.status as string | undefined,
      period: req.query.period as string | undefined,
      type: req.query.type as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    const rows = await packagesRepo.getPackages(filters);
    
    const packages = rows.map(row => ({
      id: row.id,
      name: row.name,
      organizationId: row.organization_id,
      company: row.organization_name || '',
      period: row.period,
      type: row.type || '',
      documentCount: row.document_count ?? 0,
      status: row.status,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    }));

    res.json({ data: packages });
  } catch (error) {
    next(error);
  }
}

export async function getPackageById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    
    const row = await packagesRepo.getPackageById(id);
    if (!row) {
      return res.status(404).json({ error: { message: 'Package not found' } });
    }

    // Получаем документы пакета
    const documents = await documentsRepo.getDocuments({ packageId: id });

    const packageData = {
      id: row.id,
      name: row.name,
      organizationId: row.organization_id,
      company: row.organization_name || '',
      period: row.period,
      type: row.type || '',
      documentCount: row.document_count ?? documents.length,
      status: row.status,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      documents: documents.map(doc => ({
        id: doc.id,
        number: doc.number,
        date: doc.date.toISOString().split('T')[0],
        type: doc.type,
        portalStatus: doc.portal_status,
        uhStatus: doc.uh_status || 'None'
      }))
    };

    res.json({ data: packageData });
  } catch (error) {
    next(error);
  }
}

/**
 * Отправка всех документов пакета в 1С УХ разом.
 * Документы в статусах Draft, Validated, RejectedByUH, UnpostedInUH замораживаются и добавляются в очередь.
 */
export async function sendPackageToUH(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: packageId } = req.params;

    const row = await packagesRepo.getPackageById(packageId);
    if (!row) {
      return res.status(404).json({ error: { message: 'Пакет не найден' } });
    }

    // Защита от повторного запуска: пакет уже в обработке
    if (row.status === 'InProcessing') {
      return res.status(400).json({
        error: { message: 'Пакет уже находится в обработке УХ. Дождитесь завершения или измените статус пакета.' }
      });
    }

    // Берём все документы пакета; фильтрация по статусам ниже
    const docs = await documentsRepo.getDocuments({ packageId });
    const sendable = docs.filter(
      (d: any) => canTransition(d.portal_status as any, 'Frozen')
    );

    if (sendable.length === 0) {
      return res.json({
        data: {
          packageId,
          enqueued: 0,
          skipped: docs.length,
          message: docs.length === 0
            ? 'В пакете нет документов'
            : 'Нет документов для отправки (все уже отправлены или в процессе)'
        }
      });
    }

    let enqueued = 0;
    const errors: string[] = [];

    const user = (req as any).user;
    for (const doc of sendable) {
      try {
        await documentsRepo.freezeDocumentVersion(doc.id, doc.current_version);
        await uhQueueService.enqueue(doc.id, 'UpsertDocument');
        await documentsRepo.addDocumentHistory(
          doc.id,
          'Документ заморожен (отправка пакета в УХ)',
          user?.id || user?.username || 'system',
          user?.username || 'Система',
          doc.current_version,
          { source: 'package', packageId }
        );
        enqueued++;
      } catch (err: any) {
        errors.push(`${doc.number}: ${err?.message || 'Ошибка'}`);
      }
    }

    await packagesRepo.updatePackage(packageId, { status: 'InProcessing' });

    res.json({
      data: {
        packageId,
        enqueued,
        skipped: docs.length - sendable.length,
        totalInPackage: docs.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function addDocumentsToPackage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: packageId } = req.params;
    const { documentIds } = req.body as { documentIds: string[] };

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: { message: 'Укажите документы для добавления (documentIds)' } });
    }

    const row = await packagesRepo.getPackageById(packageId);
    if (!row) {
      return res.status(404).json({ error: { message: 'Пакет не найден' } });
    }

    const updated = await documentsRepo.setDocumentsPackage(documentIds, packageId);
    res.json({ data: { added: updated, packageId } });
  } catch (error) {
    next(error);
  }
}

export async function createPackage(req: Request, res: Response, next: NextFunction) {
  try {
    const packageData = req.body;
    
    // TODO: валидация через Zod
    
    const pkg = await packagesRepo.createPackage({
      name: packageData.name,
      organizationId: packageData.organizationId,
      period: packageData.period,
      type: packageData.type,
      createdBy: (req as any).user?.username
    });
    
    res.status(201).json({ data: pkg });
  } catch (error) {
    next(error);
  }
}
