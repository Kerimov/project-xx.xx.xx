import { Request, Response, NextFunction } from 'express';
import * as packagesRepo from '../repositories/packages.js';
import * as documentsRepo from '../repositories/documents.js';

export async function getPackages(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = {
      organizationId: req.query.organizationId as string | undefined,
      status: req.query.status as string | undefined,
      period: req.query.period as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    const rows = await packagesRepo.getPackages(filters);
    
    const packages = rows.map(row => ({
      id: row.id,
      name: row.name,
      company: row.organization_name || '',
      period: row.period,
      type: row.type || '',
      documentCount: row.document_count,
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
      company: row.organization_name || '',
      period: row.period,
      type: row.type || '',
      documentCount: row.document_count,
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
