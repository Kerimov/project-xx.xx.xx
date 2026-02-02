import { Request, Response, NextFunction } from 'express';
import * as packagesRepo from '../repositories/packages.js';
import * as documentsRepo from '../repositories/documents.js';

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
